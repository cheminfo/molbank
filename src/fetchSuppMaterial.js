'use strict';

const bluebird = require('bluebird');
const request = require('request-promise');
const OCL = require('openchemlib/minimal');
const Chemcalc = require('chemcalc');

module.exports = bluebird.coroutine(function* fetchSuppMaterial(article) {
    const info = {};
    for (const file of article.suppMaterial) {
        const fileData = yield fetchFile(file.url);
        // mol3d
        if (fileData.filename.endsWith('-mod.mol')) {
            const molData = getMolData(fileData.body, file.url);
            if (molData) {
                addMolData(info, molData);
                info.mol3d = {type: 'oclID', value: molData.oclId, coordinates: molData.oclCoordinates};
            }
        } else if (fileData.filename.endsWith('.mol')) {
            const molData = getMolData(fileData.body, file.url);
            if (molData) {
                addMolData(info, molData);
                info.mol2d = {type: 'oclID', value: molData.oclId, coordinates: molData.oclCoordinates};
            }
        }
    }
    if (info.mol2d) {
        return info;
    } else {
        console.error('Missing mol2d: ' + article.publisherId);
        return null;
    }
});

const fetchFile = bluebird.coroutine(function* fetchFile(url) {
    let requestResult;
    try {
        requestResult = yield request.get(url, {resolveWithFullResponse: true});
    } catch (e) {
        console.error('Could not get the resource: ' + url);
        return;
    }
    const body = requestResult.body;
    if (body.includes('Error 404 - File not found')) {
        console.error('File not found: ' + url);
        return;
    }
    const header = requestResult.headers['content-disposition'];
    if (!header) {
        console.error('Missing content-disposition header: ' + url);
        return;
    }
    const filenameIdx = header.indexOf('filename=');
    if (!filenameIdx) {
        console.error('Could not find filename: ' + url);
        return;
    }
    const filename = header.substring(filenameIdx + 10, header.length - 1);
    return {
        filename,
        body
    };
});

function getMolData(molfile, url) {
    try {
        const ocl = OCL.Molecule.fromMolfile(molfile);
        const mf = ocl.getMolecularFormula().formula;
        const chemcalc = Chemcalc.analyseMF(mf);
        return {
            smiles: ocl.toSmiles(),
            mf: chemcalc.mf,
            mw: chemcalc.mw,
            em: chemcalc.em,
            oclIndex: Array.from(ocl.getIndex()),
            oclId: ocl.getIDCode(),
            oclCoordinates: ocl.getIDCoordinates()
        };
    } catch (e) {
        console.error('Error in getMolData for ' + url);
        console.error(e);
    }
}

function addMolData(info, molData) {
    info.smiles = molData.smiles;
    info.mf = molData.mf;
    info.mw = molData.mw;
    info.em = molData.em;
    info.oclIndex = molData.oclIndex;
}
