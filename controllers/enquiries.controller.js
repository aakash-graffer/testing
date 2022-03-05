const { validationResult } = require('express-validator');
let AWS = require('aws-sdk');
const { ObjectId } = require('mongodb');

const { response } = require('../core/responseformat');
const { message, enumValue, errData } = require('../core/utility');
const { printLogger } = require('../core/printLogger');
const enquiriesModel = require('./../models/enquiries.model');

// Add enquiries
exports.save = async (req, res, next) => {
    try {
        const reqBody = req.body;
        const errors = validationResult(req);
        if (errors.errors.length > 0) {
            printLogger(0, errors.array());
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            // By deafault status pending
            reqBody.status = enumValue.pendingStatus;

            let result = await enquiriesModel.createEnquiries(reqBody);
            if (result === null || result === undefined) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.noInsertSuccessfully('Enquiry'),
                //     "param": "",
                //     "location": ""
                // }]
                // return response(res, 200, false, message.noInsertSuccessfully('Enquiry'), dataResult);
                throw errData(200, message.noInsertSuccessfully('Enquiry'), null);
            }
            else {

                printLogger(2, result);
                return response(res, 200, true, message.insertSuccessfully('Enquiry'), '');
            }
        }
    }
    catch (error) {

        printLogger(0, error, '');
        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Enquiry List
exports.list = async (req, res, next) => {
    try {

        let reqBody = req.body;
        let result = await enquiriesModel.enquiriesList(reqBody);

        if (result === null || result === undefined) {
            // let dataResult = [{
            //     "value": "",
            //     "msg": message.noDataFound(),
            //     "param": "",
            //     "location": ""
            // }]
            // return response(res, 200, false, message.noDataFound(), dataResult);
            throw errData(200, message.noDataFound(), null);
        }
        else {

            printLogger(2, result);
            return response(res, 200, true, message.dataFound(), result);
        }
    }
    catch (error) {

        printLogger(0, error, '');
        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        // return response(res, 500, false, message.error(error), dataResult)
        next(error)
    }
};


// Enquiry update status
exports.updateStatus = async (req, res, next) => {
    try {
        let reqBody = req.body;
        const errors = validationResult(req);

        if (errors.errors.length > 0) {
            printLogger(0, errors.array());
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let data = { "_id": req.userData._id };

            let result = await enquiriesModel.updateStatus(reqBody, data)
            if (result === null || result === undefined) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.noInsertSuccessfully('Enquiries status'),
                //     "param": "",
                //     "location": ""
                // }]
                // return response(res, 200, false, message.noInsertSuccessfully('Enquiries status'), dataResult);
                throw errData(200, message.noInsertSuccessfully('Enquiries status'), null);
            }
            else {

                printLogger(2, result);
                return response(res, 200, true, message.updateSuccessfully('Enquiries status'), '');
            }
        }
    }
    catch (error) {

        printLogger(0, error, '');
        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        // return response(res, 500, false, message.error(error), dataResult)
        next(error)
    }
};