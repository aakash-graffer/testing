// Init code

const { validationResult } = require('express-validator');

const histroyModel = require('../models/histroy.model');
const { response } = require('../core/responseformat');
const { message } = require('../core/utility');
const { printLogger } = require('../core/utility');


// Update company name collections after update related multiple collection 
exports.updateCompanyName = async (resultData) => {
    try {
        let reqBody = resultData;

        // Update Company name
        let result = await histroyModel.updateCompanyName(reqBody)

        if (result === null || result === undefined) {
            let dataResult = [{
                "value": "",
                "msg": message.unableToUpdate('Company name'),
                "param": "",
                "location": ""
            }]
            printLogger(0, dataResult, 'histroy');


        } else {
            printLogger(2, result, 'histroy');

        }

    }

    catch (error) {
        let dataResult = [{
            "value": '',
            "msg": error,
            "param": "",
            "location": ""
        }]
        printLogger(0, dataResult, 'histroy');

    }
};


// Update first and last name collections after update related multiple collection 
exports.updateFullName = async (resultData) => {
    try {
        let reqBody = resultData;

        // Update full name 
        let result = await histroyModel.updateName(reqBody)

        if (result === null || result === undefined) {

            let dataResult = [{
                "value": "",
                "msg": message.unableToUpdate('First name and last name'),
                "param": "",
                "location": ""
            }]
            printLogger(0, dataResult, 'histroy');
        }
        else {

            printLogger(2, result, 'histroy');
        }
    }
    catch (error) {
        let dataResult = [{
            "value": '',
            "msg": error,
            "param": "",
            "location": ""
        }]
        printLogger(0, dataResult, 'histroy');
    }
};



// Update work shift name collections after update related multiple collection 
exports.updateWorkShiftName = async (resultData) => {
    try {
        let reqBody = resultData;

        // Update full name 
        let result = await histroyModel.updateWorkShiftName(reqBody)

        if (result === null || result === undefined) {

            let dataResult = [{
                "value": "",
                "msg": message.unableToUpdate('Work shift name'),
                "param": "",
                "location": ""
            }]
            printLogger(0, dataResult, 'histroy');
        }
        else {
            printLogger(2, result, 'histroy');

        }
    }
    catch (error) {
        let dataResult = [{
            "value": '',
            "msg": error,
            "param": "",
            "location": ""
        }]
        printLogger(0, dataResult, 'histroy');
    }
};
