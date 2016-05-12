'use strict';

const fs = require('fs');
const path = require('path');

const Chemcalc = require('chemcalc');
const OCL = require('openchemlib');
const parseString = require('xml2js').parseString;

const articleReg = /molbank-(\d{4})-(M\d+)/i;

const dataDir = './demo/molbank';
const dataList = fs.readdirSync(dataDir);

const articles = dataList.length;
let withXML = 0;
let withMol3d = 0;
let withMol2d = 0;

const result = [];

for (const article of dataList) {
    const match = articleReg.exec(article);
    if (!match) {
        console.error(`Invalid folder name format: ${article}`);
        continue;
    }

    const element = {
        id: match[2],
        year: parseInt(match[1])
    };
    
    const fileListDir = path.join(dataDir, article, 'article_deploy');
    const fileList = fs.readdirSync(fileListDir);
    let hasXML = false;
    let hasMol3d = false;
    let hasMol2d = false;
    let mol;
    for (const file of fileList) {
        const filePath = path.join(fileListDir, file);
        if (/\.xml$/i.test(file)) {
            if (!hasXML) {
                if (parseXML(element, filePath)) {
                    hasXML = true;
                    withXML++;
                } else {
                    console.error(`Could not parse XML for ${article}`);
                }
            }
        } else if (/-mod\.mol$/i.test(file)) {
            if (!hasMol3d) {
                element.mol3d = fs.readFileSync(filePath, 'utf8');
                hasMol3d = true;
                withMol3d++;
                if (!mol) mol = element.mol3d;
            }
        } else if (/\.mol$/i.test(file)) {
            if (!hasMol2d) {
                element.mol2d = fs.readFileSync(filePath, 'utf8');
                hasMol2d = true;
                withMol2d++;
                mol = element.mol2d;
            }
        }
    }
    
    if (mol) {
        try {
            const ocl = OCL.Molecule.fromMolfile(mol);
            const mf = ocl.getMolecularFormula().formula;
            const chemcalc = Chemcalc.analyseMF(mf);
            
            element.smiles = ocl.toSmiles();
            element.mf = mf;
            element.mw = chemcalc.mw;
            element.em = chemcalc.em;
            element.ocl_idx = ocl.getIndex();

            if (element.mol2d) {
                const ocl2d = OCL.Molecule.fromMolfile(element.mol2d);
                element.mol2d = {type: 'oclID', value: ocl2d.getIDCode(), coordinates: ocl2d.getIDCoordinates()};
            }

            if (element.mol3d) {
                const ocl3d = OCL.Molecule.fromMolfile(element.mol3d);
                element.mol3d = {type: 'oclID', value: ocl3d.getIDCode(), coordinates: ocl3d.getIDCoordinates()};
            }
        } catch (e) {
            console.error(`Could not parse mol file for ${article}`);
            console.error(e);
        }
        result.push(element);
    } else {
        console.error(`No mol file for ${article}`);
    }
}

console.log(articles, 'articles');
console.log(withXML, 'with XML file');
console.log(withMol2d, 'with mol file');
console.log(withMol3d, 'with 3D mol file');

fs.writeFileSync('test.json', JSON.stringify(result));

function parseXML(element, file) {
    const data = fs.readFileSync(file, 'utf8');
    let ok = false;
    parseString(data, function (err, result) {
        if (err) return;
        ok = true;
        if (result.article) {
            if (result.article.front) {
                const articleMeta = result.article.front[0]['article-meta'][0];
                
                // look for DOI
                const articleID = articleMeta['article-id'];
                for (const id of articleID) {
                    if (id.$['pub-id-type'] === 'doi') {
                        element.doi = id._;
                        break;
                    }
                }
                
                // look for article name
                element.name = String(articleMeta['title-group'][0]['article-title'][0]);
                
                // look for authors
                const contribGroup = articleMeta['contrib-group'][0].contrib;
                element.authors = [];
                for (const contrib of contribGroup) {
                    if (contrib.$['contrib-type'] === 'author') {
                        if (contrib.name && contrib.name[0]) {
                            element.authors.push({
                                surname: contrib.name[0].surname[0],
                                names: contrib.name[0]['given-names'][0]
                            });
                        }
                    }
                }

                // look for publication date
                const pubDate = articleMeta['pub-date'];
                for (const date of pubDate) {
                    if (date.$['pub-type'] === 'epub') {
                        element.date = {
                            day: parseInt(date.day[0]),
                            month: parseInt(date.month[0]),
                            year: parseInt(date.year[0])
                        };
                        break;
                    }
                }

                if (articleMeta.volume) {
                    element.volume = parseInt(articleMeta.volume);
                }

                if (articleMeta.issue) {
                    element.issue = parseInt(articleMeta.issue);
                }
            }
        }
    });
    return ok;
}
