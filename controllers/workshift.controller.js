// Init code

const { validationResult } = require('express-validator');
const { printLogger, errData } = require('../core/utility');

const employeesModel = require('../models/employees.model');
const workshiftModel = require('../models/workshift.model');
const historyController = require('./histroy.controller');
const { response } = require('../core/responseformat');
const { message } = require('../core/utility');


// Create employees
exports.save = async (req, res, next) => {
    try {

        const errors = validationResult(req);

        // Check validations
        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), 'work_shift');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let reqBody = req.body;
            let countResult = await workshiftModel.workShiftCountByCompanyID(reqBody);

            // Check workshift maximum five
            if (countResult >= 5) {

                // let dataResult = [{
                //     "value": '',
                //     "msg": message.workShiftCount(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'work_shift');
                // return response(res, 200, true, message.workShiftCount(), dataResult);
                throw errData(200, message.workShiftCount(), null);
            }
            else {

                let shiftStartTime = reqBody.shift_start_time.split(":");
                let shiftEndTime = reqBody.shift_end_time.split(":");
                if (shiftStartTime.length > 0 && shiftEndTime.length > 0) {

                    let _shiftStartTime = shiftStartTime[0] + ":" + shiftStartTime[1];

                    let _shiftEndTime = shiftEndTime[0] + ":" + shiftEndTime[1];


                    reqBody.shift_start_time = _shiftStartTime;
                    reqBody.shift_end_time = _shiftEndTime;
                    reqBody.created_by = req.userData._id;

                    let result = await workshiftModel.createWorkShift(reqBody)

                    printLogger(2, result, 'work_shift');
                    return response(res, 200, true, message.insertSuccessfully('Work shift '), { "_id": result._id });
                }
                else {

                    // let dataResult = [{
                    //     "value": '',
                    //     "msg": "",
                    //     "param": "",
                    //     "location": ""
                    // }]
                    // printLogger(0, dataResult, 'work_shift');
                    // return response(res, 200, false, "Shift time is not valid.", dataResult);
                    throw errData(200, "Shift time is not valid", null);
                }
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
        printLogger(0, error, 'work_shift');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Workshiftlist
exports.list = async (req, res, next) => {
    try {
        let reqBody = req.body;

        let list = await workshiftModel.list(reqBody)
        let result = list.result;
        let total = list.total;

        printLogger(2, result, 'work_shift');
        return response(res, 200, true, message.dataFound(), { total, result });
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'work_shift');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Employee find workshift by company id 
exports.findWorkshiftByCompanyId = async (req, res, next) => {
    try {
        const errors = validationResult(req);

        // If validation errors
        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), 'work_shift');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let reqBody = req.body;

            let workshiftData = { "company_id": reqBody.company_id };
            let result = await workshiftModel.findWorkshift(workshiftData)

            if (result[0] === undefined || result[0] === null) {
                // let dataResult = [{
                //     "value": '',
                //     "msg": message.workShiftNotRegister(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'work_shift');
                // return response(res, 200, false, message.workShiftNotRegister(), dataResult);
                throw errData(200, message.workShiftNotRegister(), null);
            }
            else {
                printLogger(2, result, 'work_shift');
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
        printLogger(0, error, 'work_shift');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Employee find workshift 
exports.find = async (req, res, next) => {
    try {
        const errors = validationResult(req);

        // If validation errors
        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), 'work_shift');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let reqBody = req.body;
            let workshiftData = { "work_shift_id": reqBody.workshift_id };

            let result = await workshiftModel.findWorkshift(workshiftData)

            if (result === null || result === undefined) {

                // let dataResult = [{
                //     "value": '',
                //     "msg": message.workShiftNotRegister(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'work_shift');
                // return response(res, 200, false, message.workShiftNotRegister(), dataResult);
                throw errData(200, message.workShiftNotRegister(), null);
            }
            else {

                printLogger(2, result, 'work_shift');
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
        printLogger(0, error, 'work_shift');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Workshift update status
exports.updateStatus = async (req, res, next) => {
    try {

        const errors = validationResult(req);

        // If validation check 
        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), 'work_shift');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let data = { "work_shift_id": req.body.workshift_id };

            // Check this shift is open shift or not
            let isOpenShift = await workshiftModel.findWorkshift(data);

            // Send response Open shift can not be deleted
            if (isOpenShift && isOpenShift.is_open_shift === true) {

                // let dataResult = [{
                //     "value": '',
                //     "msg": message.openShiftNotDeleted(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, message.openShiftNotDeleted(), 'work_shift');
                // return response(res, 200, false, message.openShiftNotDeleted(), dataResult);
                throw errData(200, message.openShiftNotDeleted(), null);
            }

            // Check how many employees registered on this shift
            let shiftRegisterResult = await employeesModel.shiftRegisterEmployeeCheck(data);

            let shiftCount = shiftRegisterResult[0] == undefined || shiftRegisterResult[0] == null ? 0 : shiftRegisterResult[0].count;
            if (shiftCount > 0) {

                // let dataResult = [{
                //     "value": '',
                //     "msg": message.workShiftNotDelete(shiftCount),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'work_shift');
                // return response(res, 200, false, message.workShiftNotDelete(shiftCount), dataResult);
                throw errData(200, message.workShiftNotDelete(shiftCount), null);
            }
            else {

                // Update status (archive status)
                let result = await workshiftModel.updateStatus(data, req.userData);

                if (result === null || result === undefined) {

                    // let dataResult = [{
                    //     "value": '',
                    //     "msg": message.workShiftNotRegister(),
                    //     "param": "",
                    //     "location": ""
                    // }]
                    // printLogger(0, dataResult, 'work_shift');
                    // return response(res, 200, false, message.workShiftNotRegister(), dataResult);
                    throw errData(200, message.workShiftNotRegister(), null);
                }
                else {

                    printLogger(2, result, 'work_shift');
                    return response(res, 200, true, message.deletedSuccessfully('Work shift'), { "_id": result._id });
                }
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
        printLogger(0, error, 'work_shift');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Workshift update
exports.workshiftUpdate = async (req, res, next) => {
    try {

        const errors = validationResult(req);

        // Check validations
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'work_shift');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let reqBody = req.body;

            let data = { "work_shift_id": req.body.workshift_id };

            // Check this shift is open shift or not
            let isOpenShift = await workshiftModel.findWorkshift(data);

            // Send response Open shift can not be edited
            if (isOpenShift && isOpenShift.is_open_shift === true) {

                // let dataResult = [{
                //     "value": '',
                //     "msg": message.openShiftNotEdited(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, message.openShiftNotEdited(), 'work_shift');
                // return response(res, 200, false, message.openShiftNotEdited(), dataResult);
                throw errData(200, message.openShiftNotEdited(), null);
            }

            // Update work shift
            let result = await workshiftModel.workshiftUpdate(reqBody, req.userData);

            if (result === null || result === undefined) {

                // let dataResult = [{
                //     "value": '',
                //     "msg": message.unableToUpdate('work shift'),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'work_shift');
                // return response(res, 200, false, message.unableToUpdate('work shift'), dataResult);
                throw errData(200, message.unableToUpdate('work shift'), null);
            }
            else {

                let resultData = {
                    "work_shift_id": reqBody.workshift_id,
                    "work_shift_name": result.shift_name,
                    "updated_by": req.userData._id
                };

                // Work shift Data update related collection
                historyController.updateWorkShiftName(resultData);
                printLogger(2, result, 'work_shift');
                return response(res, 200, true, message.updateSuccessfully('work shift'), { "_id": result._id });
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
        printLogger(0, error, 'work_shift');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};