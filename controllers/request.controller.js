const { validationResult } = require('express-validator');

const { response } = require('../core/responseformat');
const { message, printLogger, randomString, enumValue, errData } = require('../core/utility');
const requestModel = require('../models/request.model');
const notificationsController = require('./notifications.controller');

// Requests save
exports.requestSave = async (req, res, next) => {
    try {
        const errors = validationResult(req);

        // Check validations
        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), 'rupyo_admin');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let forRequest = enumValue.rupyoAdminRoleId;

            if (req.userData.role_id === enumValue.employeeRoleId) {
                forRequest = enumValue.employerRoleId;
            }

            let reqBody = req.body;
            let _randomString = randomString(12);
            let requestId = `RP${_randomString}`;

            reqBody.company_id = req.userData.company_id
            reqBody.status = enumValue.pendingStatus;
            reqBody.request_id = requestId;
            reqBody.created_by = req.userData._id;
            reqBody.for_request = forRequest;

            let result = await requestModel.requestSave(reqBody)

            if (result === null) {

                // let dataResult = [{
                //     "value": '',
                //     "msg": message.noInsertSuccessfully('Request'),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'rupyo_admin');
                // return response(res, 200, false, message.noInsertSuccessfully('Request'), dataResult);
                throw errData(200, message.noInsertSuccessfully('Request'), null);
            }
            else {

                // Notification store rupyo admin
                let notificationsData = {
                    "user_id": req.userData._id,
                    "company_id": req.userData.company_id,
                    "message": reqBody.details,
                    "request_id": requestId,
                    "resource_type": enumValue.requestResourceType,
                    "status": enumValue.pendingStatus, // findResult.status,
                    "for_notifications": forRequest,
                    "created_by": req.userData._id
                };
                notificationsController.saveNotification(notificationsData);

                printLogger(2, result, 'rupyo_admin');
                return response(res, 200, true, message.insertSuccessfully('Request'), result);
            }
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Requests list
exports.requestsList = async (req, res, next) => {
    try {
        let roleId = req.userData.role_id;

        let reqBody = req.body;
        let companyId = roleId === enumValue.employerRoleId ? req.userData.company_id : reqBody.company_id;

        let result = await requestModel.requestsList(reqBody, companyId);
        printLogger(2, result, 'rupyo_admin');
        return response(res, 200, true, message.dataFound(), result);
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
}


// Requests find
exports.requestFind = async (req, res, next) => {
    try {
        const errors = validationResult(req);

        // Check validations
        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), 'rupyo_admin');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let reqBody = req.body;
            let result = await requestModel.requestFind(reqBody);

            if (result === null) {

                //     let dataResult = [{
                //     "value": '',
                //     "msg": message.noDataFound(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'rupyo_admin');
                // return response(res, 200, false, message.noDataFound(), dataResult);
                throw errData(200, message.noDataFound(), null);
            }
            else {
                printLogger(2, result, 'rupyo_admin');
                return response(res, 200, true, message.dataFound(), result);
            }
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Requests update
exports.requestUpdate = async (req, res, next) => {
    try {
        const errors = validationResult(req);

        // Check validations
        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), 'rupyo_admin');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let reqBody = req.body;

            let result = await requestModel.requestUpdate(reqBody, req.userData);
            if (result === null) {

                // let dataResult = [{
                //     "value": '',
                //     "msg": message.unableToUpdate('Request'),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'rupyo_admin');
                // return response(res, 200, false, message.unableToUpdate('Request'), dataResult);
                throw errData(200, message.unableToUpdate('Request'), null);
            }
            else {
                printLogger(2, result, 'rupyo_admin');
                return response(res, 200, true, message.updateSuccessfully('Request'), result);
            }
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Requests update status
exports.updateStatus = async (req, res, next) => {
    try {
        const errors = validationResult(req);

        // Check validations
        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), 'rupyo_admin');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let reqBody = req.body;
            let result = await requestModel.updateStatus(reqBody, req.userData);

            if (result === null) {

                // let dataResult = [{
                //     "value": '',
                //     "msg": message.unableToUpdate('Request'),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'rupyo_admin');
                // return response(res, 200, false, message.unableToUpdate('Request'), dataResult); 
                throw errData(200, message.unableToUpdate('Request'), null);
            }
            else {
                printLogger(2, result, 'rupyo_admin');
                return response(res, 200, true, message.updateSuccessfully('Request'), " ");
            }
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};