const { validationResult } = require('express-validator');
const moment = require('moment');

const { response } = require('../core/responseformat');
const { message, printLogger, enumValue, errData } = require('../core/utility');
const holidayModel = require('../models/holiday.model');


// Add holiday
exports.addHoliday = async (req, res, next) => {
    try {

        // Check validations
        const errors = validationResult(req);

        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), '');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let reqBody = req.body;

            let companyId = req.userData.company_id;

            if (req.userData.role_id === enumValue.rupyoAdminRoleId || req.userData.role_id === enumValue.superAdminRoleId) {
                companyId = reqBody.company_id
            }

            // Check holiday by company id and year
            let checkData = {
                "company_id": companyId,
                "year": reqBody.year
            }

            let findResult = await holidayModel.findByCompanyIdAndYear(checkData);

            if (findResult === null) {
                let holidayData = {
                    "company_id": companyId,
                    "year": reqBody.year,
                    "holidays": [
                        {
                            "date": moment(`${reqBody.date}` + "T00:00:00.000Z"),
                            "detail": reqBody.detail,
                            "is_paid": reqBody.is_paid
                        }
                    ]
                }

                let saveResult = await holidayModel.addHoliday(holidayData);

                if (saveResult === null || saveResult === undefined) {

                    // let dataResult = [{
                    //     "value": "",
                    //     "msg": message.dataCouldNotBeInserted('Holiday data'),
                    //     "param": "",
                    //     "location": ""
                    // }]
                    // printLogger(2, dataResult, '');
                    // return response(res, 200, false, message.dataCouldNotBeInserted('Holiday data'), dataResult);
                    throw errData(200, message.dataCouldNotBeInserted('Holiday data'), null);
                }
                else {

                    // Holiday data saved successfully
                    printLogger(2, saveResult, '');
                    return response(res, 200, true, message.insertSuccessfully('Holiday data'), saveResult);
                }
            }
            else {

                let holidaysArray = [];
                let holidayData;

                if (findResult.holidays) {
                    holidaysArray = findResult.holidays
                }

                let updateCount = 0;
                let newAddCount = 0;

                let _updateDate = moment(reqBody.date).format('YYYY-MM-DD');
                let updateDate = new Date(_updateDate + "T00:00:00.000Z");

                for (let i = 0; i < findResult.holidays.length; i++) {


                    if ((findResult.holidays[i].date).toString() == (updateDate).toString()) {

                        updateCount = 1;
                        findResult.holidays[i] = {
                            "date": moment(`${reqBody.date}` + "T00:00:00.000Z"),
                            "detail": reqBody.detail,
                            "is_paid": reqBody.is_paid
                        }
                        break;
                    }
                    else {

                        newAddCount = newAddCount + 1;
                    }
                }

                if (updateCount === 0) {

                    // New Date
                    holidayData = {
                        "date": moment(`${reqBody.date}` + "T00:00:00.000Z"),
                        "detail": reqBody.detail,
                        "is_paid": reqBody.is_paid
                    }
                    holidaysArray.push(holidayData);
                }

                let updateData = { "holidays": holidaysArray }

                let updateResult = holidayModel.addMoreHoliday(findResult._id, updateData)
                return response(res, 200, true, message.updateSuccessfully('Holiday data'), updateResult);
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
        printLogger(0, error, '');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Holiday list
exports.holidayList = async (req, res, next) => {
    try {

        // Check validations
        const errors = validationResult(req);

        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), '');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let reqBody = req.body;

            let companyId = reqBody.company_id;
            if (req.userData.role_id === enumValue.employerRoleId) {
                companyId = req.userData.company_id;
            }

            reqBody.company_id = companyId;

            let listResult = await holidayModel.holidayList(reqBody);


            if (listResult === null || listResult === undefined) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.noDataFound(),
                //     "param": "",
                //     "location": ""
                // }]
                // // Holiday data not found
                // printLogger(0, dataResult, '');
                // return response(res, 200, false, message.noDataFound(), dataResult);
                throw errData(200, message.noDataFound(), null);
            }
            else {

                let listArray = [];

                for (let i = 0; i < listResult.result.length; i++) {
                    for (let j = 0; j < listResult.result[i].holidays.length; j++) {

                        let data = {
                            "holiday_id": listResult.result[i]._id,
                            "company_id": listResult.result[i].company_id,
                            "company_name": listResult.result[i].company_name,
                            "year": listResult.result[i].year,
                            "date": listResult.result[i].holidays[j].date,
                            "detail": listResult.result[i].holidays[j].detail,
                            "is_paid": listResult.result[i].holidays[j].is_paid,
                        }
                        listArray.push(data)
                    }
                }

                let _response = {
                    "total": listResult.total,
                    "result": listArray
                }

                printLogger(2, _response, '');
                return response(res, 200, true, message.dataFound(), _response);
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
        printLogger(0, error, '');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// Delete holiday
exports.deleteHoliday = async (req, res, next) => {
    try {

        // Check validations
        const errors = validationResult(req);

        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), '');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let reqBody = req.body;
            let updatedResponse = "";

            let companyId = req.userData.company_id;

            if (req.userData.role_id === enumValue.rupyoAdminRoleId || req.userData.role_id === enumValue.superAdminRoleId) {
                companyId = reqBody.company_id
            }

            // Check holiday by company id and year
            let checkData = {
                "company_id": companyId,
                "year": reqBody.year
            }

            let findResult = await holidayModel.findByCompanyIdAndYear(checkData);

            if (findResult === null) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.noDataFound(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(2, dataResult, '');
                // return response(res, 200, false, message.noDataFound(), dataResult);
                throw errData(200, message.noDataFound(), null);
            }
            else {

                for (let i = 0; i < findResult.holidays.length; i++) {

                    let matchDate = moment(findResult.holidays[i].date).format("YYYY-MM-DD");
                    if (matchDate === reqBody.date) {

                        findResult.holidays.splice(i, 1);

                        let updateData = {
                            "holidays": findResult.holidays
                        }

                        let updateResult = await holidayModel.addMoreHoliday(findResult._id, updateData)
                        updatedResponse = updateResult
                    }
                }

                // Holiday data saved successfully
                printLogger(2, updatedResponse, '');
                return response(res, 200, true, message.deleteSuccessfully('Holiday date'), updatedResponse);
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
        printLogger(0, error, '');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};