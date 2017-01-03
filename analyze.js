'use strict';

const fs = require('fs');
const path = require('path');

const Chemcalc = require('chemcalc');
const OCL = require('openchemlib');
const DOMParser = require('xmldom').DOMParser;

const articleReg = /molbank-(\d{4})-(M\d+)/i;

const dataDir = './demo/molbank';
const dataList = fs.readdirSync(dataDir);

const output = process.argv[2] || 'test.json';

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
                try {
                    parseXML(element, filePath);
                    hasXML = true;
                    withXML++;
                } catch (e) {
                    console.error(`Could not parse XML for ${article}: ${e}`);
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

fs.writeFileSync(output, JSON.stringify(result));

function parseXML(element, file) {
    const data = fs.readFileSync(file, 'utf8');
    const doc = new DOMParser().parseFromString(data);
    const articleDom = doc.getElementsByTagName('article')[0] || fail('no article');
    const article = {};
    element.article = article;

    const articleType = articleDom.getAttribute('article-type');
    if (articleType === 'editorial') {
        fail('editorial');
    }

    const articleMeta = articleDom.getElementsByTagName('article-meta')[0] || fail('no meta');
    const articleIds = articleMeta.getElementsByTagName('article-id');
    for (let i = 0; i < articleIds.length; i++) {
        const articleId = articleIds[i];
        const pubIdType = articleId.getAttribute('pub-id-type');
        if (pubIdType === 'doi') {
            article.doi = articleId.textContent;
        } else if (pubIdType === 'publisher-id') {
            article.publisherId = articleId.textContent;
        }
    }

    const articleTitle = articleMeta.getElementsByTagName('article-title')[0] || fail('no title');
    article.title = articleTitle.textContent;

    article.keywords = [];
    const keywords = articleMeta.getElementsByTagName('kwd');
    for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i];
        article.keywords.push(keyword.textContent);
    }

    const contribGroup = articleMeta.getElementsByTagName('contrib-group')[0] || fail('no contrib group');
    const contribs = contribGroup.getElementsByTagName('contrib');
    article.authors = [];
    for (let i = 0; i < contribs.length; i++) {
        const contrib = contribs[i];
        if (contrib.getAttribute('contrib-type') === 'author') {
            article.authors.push({
                surname: contrib.getElementsByTagName('surname')[0].textContent,
                names: contrib.getElementsByTagName('given-names')[0].textContent
            });
        }
    }

    const pubDates = articleMeta.getElementsByTagName('pub-date');
    for (let i = 0; i < pubDates.length; i++) {
        const pubDate = pubDates[i];
        if (pubDate.getAttribute('pub-type') === 'epub') {
            article.date = {
                day: parseInt(pubDate.getElementsByTagName('day')[0].textContent),
                month: parseInt(pubDate.getElementsByTagName('month')[0].textContent),
                year: parseInt(pubDate.getElementsByTagName('year')[0].textContent),
            };
            break;
        }
    }

    article.volume = parseInt((articleMeta.getElementsByTagName('volume')[0] || fail('no volume')).textContent);
    article.issue = parseInt((articleMeta.getElementsByTagName('issue')[0] || fail('no issue')).textContent);
    article.elocationId = (articleMeta.getElementsByTagName('elocation-id')[0] || fail('no elocation id')).textContent;

    function fail(message) {
        throw new Error(message);
    }
}
