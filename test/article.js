'use strict';

process.on('unhandledRejection', function (e) {
    throw e;
});

const bluebird = require('bluebird');
const fs = require('fs');
const path = require('path');

const parseXml = require('../src/parseXml');
const fetchSuppMaterial = require('../src/fetchSuppMaterial');

const file = 'molbank-2010-M662.xml';
const data = fs.readFileSync(path.join(__dirname, '../demo/molbank_xml_files', file), 'utf8');

bluebird.coroutine(function* run() {
    const article = parseXml(data);
    const info = yield fetchSuppMaterial(article);
    console.log(article);
    console.log(info);
})();
