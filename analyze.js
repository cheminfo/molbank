'use strict';

process.on('unhandledRejection', (e) => {
    throw e;
});

const fs = require('fs');
const path = require('path');

const parseXml = require('./src/parseXml');
const fetchSuppMaterial = require('./src/fetchSuppMaterial');

const dataDir = './demo/molbank_xml_files';
const dataList = fs.readdirSync(dataDir);

const output = process.argv[2] || 'test.json';

(async function run() {
    const result = [];

    for (const file of dataList) {
        const data = fs.readFileSync(path.join(__dirname, dataDir, file), 'utf8');
        const article = parseXml(data);
        if (article) {
            const info = await fetchSuppMaterial(article);
            result.push({article, info});
        }
    }

    fs.writeFileSync(output, JSON.stringify(result));
})();
