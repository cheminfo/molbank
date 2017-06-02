'use strict';

const request = require('request-promise');
const OCL = require('openchemlib/minimal');
const Chemcalc = require('chemcalc');

module.exports = async function fetchSuppMaterial(article) {
    const info = {};
    for (const file of article.suppMaterial) {
        // mol3d
        if (file.name.endsWith('-mod.mol')) {
            const molData = await fetchMolfile(file.url);
            if (molData) {
                addMolData(info, molData);
                info.mol3d = {type: 'oclID', value: molData.oclId, coordinates: molData.oclCoordinates};
            }
        } else if (file.name.endsWith('.mol')) {
            const molData = await fetchMolfile(file.url);
            if (molData) {
                addMolData(info, molData);
                info.mol2d = {type: 'oclID', value: molData.oclId, coordinates: molData.oclCoordinates};
            }
        } else {
            console.log('other file: ' + file.name);
        }
    }
    return info;
};

async function fetchMolfile(url) {
    let molfile;
    try {
        molfile = await request.get(url);
    } catch (e) {
        console.error('Could not get the resource: ' + url);
        return;
    }
    if (molfile.includes('Error 404 - File not found')) {
        console.error('File not found: ' + url);
        return;
    }
    return getMolData(molfile, url);
}

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
