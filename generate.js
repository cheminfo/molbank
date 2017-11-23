'use strict';

process.on('unhandledRejection', (e) => {
    throw e;
});

const fs = require('fs');
const path = require('path');
const bluebird = require('bluebird');
const mkdirp = require('mkdirp');
const sdfCreator = require('sdf-creator');

const parseXml = require('./src/parseXml');
const fetchSuppMaterial = require('./src/fetchSuppMaterial');

const args = require('yargs')
    .option('d', {alias: 'directory', demandOption: true, describe: 'path to the directory containing the XML files', type: 'string', coerce: path.resolve})
    .option('o', {alias: 'out', describe: 'path to the directory to write the data files', type: 'string', coerce: path.resolve, default: 'out'})
    .version(false)
    .argv;

const dataDir = args.directory;
if (!fs.existsSync(dataDir)) {
    die(`data directory not found: ${dataDir}`);
}

const dataList = fs.readdirSync(dataDir).filter(f => f.toLowerCase().endsWith('.xml'));
if (dataList.length === 0) {
    die(`no XML file found in ${dataDir}`);
} else {
    console.log(`treating ${dataList.length} XML files`);
}

const outDir = args.out;
mkdirp.sync(outDir);

bluebird.coroutine(function* run() {
    const result = [];

    for (const xmlFileName of dataList) {
        const data = fs.readFileSync(path.join(dataDir, xmlFileName), 'utf8');
        const article = parseXml(data);
        if (article) {
            const info = yield fetchSuppMaterial(article);
            if (info !== null) {
                const data = {article, info};
                result.push(data);
            }
        }
    }

    const toWrite = [];
    for (const article of result) {
        toWrite.push(JSON.stringify(article));
    }
    
    fs.writeFileSync(path.join(outDir, 'molbank-data.json'), `[\n${toWrite.join(',\n')}\n]`);

    const dataSdf = result.map((el) => {
        return {
            doi: el.article.doi,
            title: el.article.title,
            molfile: el.info.molfile
        }
    });
    const sdf = sdfCreator(dataSdf);
    fs.writeFileSync(path.join(outDir, 'molbank-data.sdf'), sdf.sdf);

    console.log(`generated molbank-data.json and molbank-data.sdf in ${outDir}`);
})();

function die(message) {
    console.error(`Error: ${message}`);
    process.exit(1);
}
