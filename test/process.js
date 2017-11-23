'use strict';

process.on('unhandledRejection', (e) => {
    throw e;
});

const fs = require('fs');
const path = require('path');
const bluebird = require('bluebird');
const mkdirp = require('mkdirp');

const parseXml = require('./src/parseXml');
const fetchSuppMaterial = require('./src/fetchSuppMaterial');

const folder = process.argv.includes('--demo') ? 'demo' : 'data';

const dataDir = path.join(__dirname, folder, 'xml');
const resultDir = path.join(__dirname, folder, 'json');
mkdirp.sync(resultDir);
mkdirp.sync(path.join(__dirname, 'out'));

const dataList = fs.readdirSync(dataDir);
const resultList = fs.readdirSync(resultDir);

bluebird.coroutine(function* run() {
    const result = [];

    for (const xmlFileName of dataList) {
        const jsonFileName = xmlFileName.replace('.xml', '.json');
        const jsonPath = path.join(resultDir, jsonFileName);
        if (resultList.includes(jsonFileName)) {
            result.push(JSON.parse(fs.readFileSync(jsonPath, 'utf8')));
        } else {
            const data = fs.readFileSync(path.join(dataDir, xmlFileName), 'utf8');
            const article = parseXml(data);
            if (article) {
                const info = yield fetchSuppMaterial(article);
                if (info) {
                    const data = {article, info};
                    result.push(data);
                    fs.writeFileSync(jsonPath, JSON.stringify(data));
                }
            }
        }
    }

    fs.writeFileSync(path.join(__dirname, 'out', 'data.json'), JSON.stringify(result));
})();
