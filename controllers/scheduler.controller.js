const moment = require('moment');
const { validationResult } = require('express-validator');
const util = require('util');
const request = require('request');
const monthlyTransactionController = require('./monthlyTransaction.controller');
const employerModel = require('../models/employer.model');
const employeesModel = require('../models/employees.model');
const schedulerModel = require('../models/scheduler.model');
const attendanceModel = require('../models/attendance.model');
const transactionModel = require('../models/transaction.model');
const notificationsModel = require('../models/notifications.model');
const monthlyAttendanceController = require('../controllers/monthlyAttendance.controller');
const { message, printLogger, enumValue, errData, notification } = require('../core/utility');
const { sendPushNotification, updateEarnedAmount_attendanceCountes, checkPunchIn, employeeCreditLimitType, transactionChargeSetting, sendEmail, updatePayoutCredited, sendSMS } = require('../core/commonFunctions');
const { response } = require('../core/responseformat');
const holidayModel = require('../models/holiday.model');


// Punchin reminder employee list
exports.missedPunchinReminder = async (req, res, next) => {
    try {
        printLogger(2, `*********** ${req.originalUrl} ************`, 'scheduler');

        //  DONT DELETE
        printLogger(2, `payload body missedPunchinReminder - ${JSON.stringify(req.body)}`, 'scheduler');

        const errors = validationResult(req);

        // If errors is not empty
        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), 'scheduler');
            printLogger(0, `missedPunchinReminder error.array() - ${errors.array()}`, 'scheduler');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let reqBody = req.body;
            let result = await schedulerModel.missedPunchinReminder();

            // console.log("result:- ", result)
            // console.log("LENGTH:- ", result.length)
            printLogger(2, `missedPunchinReminder result- ${JSON.stringify(result)}`, 'scheduler');

            if (result.length === 0) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.noDataFound(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(2, `missedPunchinReminder dataResult- ${dataResult}`, 'scheduler');
                // return response(res, 200, false, message.noDataFound(), dataResult);
                throw errData(200, message.noDataFound(), null);
            }
            else {

                for (let i = 0; i < result.length; i++) {

                    let notificationData = {
                        "registrationIds": `["${result[i].firebase_device_token}"]`,
                        "body": `"Hi, It has been 1 hour since the start of your shift today and you have still not punched in! Please do not forget to punch in to avoid any inconvenience related to your attendance."`,
                        "title": `"Punch in Reminder"`,
                        "notificationType": `"PUNCH_IN_REMINDER"`
                    }

                    pushNotificationResult = await sendPushNotification(notificationData);
                    printLogger(2, `missedPunchinReminder pushNotificationResult- ${pushNotificationResult}`, 'scheduler');

                    // let token = ` ${result[i].firebase_device_token}`;
                    // fireBaseTokenArray.push(token)
                }

                //     let fireBaseTokenArray = [];
                //     result.forEach(element => {

                //         let token = `"${element.firebase_device_token}"` ;
                //         fireBaseTokenArray.push(token)
                //     })

                // console.log("fireBaseTokenArray:- ",fireBaseTokenArray)

                //     let notificationData = {
                //         "registrationIds": fireBaseTokenArray,
                //         "body": `"Punch in scheduler testing."`,
                //         "title": `"Punch in scheduler"`,
                //         "notificationType": `"BANK_DETAILS_UPDATED"`
                //     }
                //     pushNotificationResult = sendPushNotification(notificationData);

                //    // console.log("pushNotificationResult:- ",pushNotificationResult)

                return response(res, 200, true, message.dataFound(), result);
            }
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, `missedPunchinReminder error- ${error}`, 'scheduler');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// Punchout reminder employee list
exports.missedPunchoutReminder = async (req, res, next) => {
    try {
        printLogger(2, `*********** ${req.originalUrl} *************`, 'scheduler');
        printLogger(2, `payload body missedPunchoutReminder - ${JSON.stringify(req.body)}`, 'scheduler');

        const errors = validationResult(req);

        // Check errors
        if (errors.errors.length > 0) {

            printLogger(0, `missedPunchoutReminder errors.array():- ${errors.array()}`, 'scheduler');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let reqBody = req.body;
            let result = await schedulerModel.missedPunchoutReminder();
            printLogger(2, `missedPunchoutReminder result- ${result}`, 'scheduler');

            // console.log("result:- ", result)
            // console.log("LENGTH:- ", result.length)

            if (result.length === 0) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.noDataFound(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, `missedPunchoutReminder dataResult:- ${dataResult}`, 'scheduler');
                // return response(res, 200, false, message.noDataFound(), dataResult);
                throw errData(200, message.noDataFound(), null);
            }
            else {

                for (let i = 0; i < result.length; i++) {

                    let notificationData = {
                        "registrationIds": `["${result[i].firebase_device_token}"]`,
                        "body": `"Hi, your shift today is due to end in 1 hour!  Please do not forget to punch out to avoid any inconvenience related to your attendance."`,
                        "title": `"Punch out Reminder"`,
                        "notificationType": `"PUNCH_OUT_REMINDER"`
                    }

                    pushNotificationResult = await sendPushNotification(notificationData);
                    printLogger(2, `missedPunchoutReminder pushNotificationResult- ${pushNotificationResult}`, 'scheduler');
                }

                return response(res, 200, true, message.dataFound(), result);
            }
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, `missedPunchoutReminder error- ${error}`, 'scheduler');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// Pause employee list
exports.pauseEmployeeList = async (req, res, next) => {
    try {

        printLogger(2, `************ ${req.originalUrl} ************`, 'scheduler');
        printLogger(2, `payload body pauseEmployeeList - ${JSON.stringify(req.body)}`, 'scheduler');

        let result = await schedulerModel.pauseEmployeeList();
        printLogger(2, `pauseEmployeeList result- ${JSON.stringify(result)}`, 'scheduler');

        if (result === null || result === undefined) {

            // let dataResult = [{
            //     "value": "",
            //     "msg": message.noDataFound(),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(0, `pauseEmployeeList dataResult:-  ${dataResult}`, 'scheduler');
            // return response(res, 200, false, message.noDataFound(), dataResult);
            throw errData(200, message.noDataFound(), null);
        }
        else {

            let userData = { _id: "" };

            let employeeIds = [];
            for (let i = 0; i < result.length; i++) {
                employeeIds.push(result[i]._id)
            }

            let employeesData = {
                status: enumValue.activeStatus,
                employee_id: employeeIds
            };

            // console.log("employeesData:- ", employeesData)
            // console.log("userData_id:- ", userData)

            // Change employees status pause to active
            let updatedStatus = await employeesModel.changeStatus(employeesData, userData)

            printLogger(2, `pauseEmployeeList updatedStatus:-  ${updatedStatus}`, 'scheduler');
            return response(res, 200, true, message.dataFound(), updatedStatus);
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, `pauseEmployeeList error- ${error}`, 'scheduler');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// Total credit limit consume employee list 
exports.creditLimitEmployeesList = async (req, res, next) => {
    try {

        printLogger(2, `*********** ${req.originalUrl} ***********`, 'scheduler');

        //  DONT DELETE
        printLogger(2, `payload body creditLimitEmployeesList - ${JSON.stringify(req.body)}`, 'scheduler');

        let result = await schedulerModel.creditLimitEmployeesList();

        printLogger(2, `creditLimitEmployeesList result- ${result}`, 'scheduler');

        if (result === null || result === undefined) {
            // let dataResult = [{
            //     "value": "",
            //     "msg": message.noDataFound(),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(0, `creditLimitEmployeesList dataResult:-  ${dataResult}`, 'scheduler');
            // return response(res, 200, false, message.noDataFound(), dataResult);
            throw errData(200, message.noDataFound(), null);
        }
        else {

            return response(res, 200, true, message.dataFound(), result);
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, `creditLimitEmployeesList error- ${error}`, 'scheduler');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// Absent mark on not mark today attendance
exports.punchinMarkAbsents = async (req, res, next) => {
    try {

        printLogger(2, `*********** ${req.originalUrl} ************`, 'scheduler');

        // console.log(JSON.stringify(req.headers));
        printLogger(2, `payload body punchinMarkAbsents - ${JSON.stringify(req.body)}`, 'scheduler');

        let today = moment().utc().format("YYYY-MM-DD");

        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, `punchinMarkAbsents errors.array():-  ${errors.array()}`, 'scheduler');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let reqBody = req.body;
            let result = await schedulerModel.punchinMarkAbsents();

            // console.log("result:- ", result)
            // console.log("length:- ", result.length)
            printLogger(2, `punchinMarkAbsents result- ${JSON.stringify(result)}`, 'scheduler');

            if (result.length === 0) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.noDataFound(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, `punchinMarkAbsents dataResult:-  ${dataResult}`, 'scheduler');
                // return response(res, 200, false, message.noDataFound(), dataResult);
                throw errData(200, message.noDataFound(), null);
            }
            else {

                for (let i = 0; i < result.length; i++) {

                    let checkData = { "employee_id": result[i]._id };

                    // Check today attendance
                    let checkPunchResult = await checkPunchIn(checkData);
                    printLogger(2, `punchinMarkAbsents checkPunchResult- ${checkPunchResult}`, 'scheduler');

                    if (checkPunchResult === 0) {

                        let shiftStartTime = moment.utc(today + " " + result[i].shift_start_time);
                        let shiftEndTime = moment.utc(today + " " + result[i].shift_end_time);

                        // Calculate shift hours using moment
                        let shiftHours = Math.abs(moment.duration(shiftEndTime.diff(shiftStartTime)).hours());
                        let shiftMinutes = Math.abs(moment.duration(shiftEndTime.diff(shiftStartTime)).minutes());

                        // Attendance data
                        let attendanceData = {
                            "first_name": result[i].first_name,
                            "middle_name": result[i].middle_name,
                            "last_name": result[i].last_name,
                            "company_id": result[i].company_id,
                            "company_name": result[i].company_name,
                            "employee_id": result[i]._id,
                            "employee_auto_id": result[i].employee_id,
                            "punch_in": null,
                            "punch_out": null,
                            "work_shift_id": result[i].work_shift_id,
                            "actual_working_hours": {
                                "hours": 0,
                                "minutes": 0
                            },
                            "status": enumValue.absentStatus,
                            "today_late_in": 0,
                            "today_early_out": 0,
                            "today_deficit_hours": {
                                "hours": shiftHours,
                                "minutes": shiftMinutes
                            }
                        };
                        printLogger(2, `punchinMarkAbsents attendanceData- ${attendanceData}`, 'scheduler');

                        // Save attendance data
                        let punchResult = await attendanceModel.punchIn(attendanceData);
                        printLogger(2, `punchinMarkAbsents punchResult- ${JSON.stringify(punchResult)}`, 'scheduler');


                        // Attendance data send to monthlyAttendanceController on daily basis
                        let monthlyAttendanceResult = await monthlyAttendanceController.saveMonthlyAttendance(punchResult);
                        printLogger(2, `punchinMarkAbsents monthlyAttendanceResult- ${JSON.stringify(monthlyAttendanceResult)}`, 'scheduler');

                        // Update calculated_last_swipe
                        let lastSwipeData = {
                            "employee_id": result[i]._id,
                            "isPunch": true,
                            "calculatedLastSwipe": moment.utc()
                        }

                        let calculatedLastSwipe = await employeesModel.updateEmployeeLastSwipe(lastSwipeData);

                        // Save earned amount and attendance details
                        await updateEarnedAmount_attendanceCountes(result[i])
                    }
                }

                return response(res, 200, true, message.dataFound(), result);
            }
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, `punchinMarkAbsents  error- ${error}`, 'scheduler');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// Absent mark on not missed punch out
exports.punchinButNotPunchoutMarkAbsent = async (req, res, next) => {
    try {

        printLogger(2, `******* ${req.originalUrl} *********`, 'scheduler');

        //  DONT DELETE
        printLogger(2, `payload body punchinButNotPunchoutMarkAbsent - ${JSON.stringify(req.body)}`, 'scheduler');

        let today = moment().utc().format("YYYY-MM-DD");
        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, `punchinButNotPunchoutMarkAbsent errors.array():-  ${errors.array()}`, 'scheduler');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let reqBody = req.body;
            let result = await schedulerModel.punchinButNotPunchoutMarkAbsent();
            printLogger(2, `punchinButNotPunchoutMarkAbsent result- ${JSON.stringify(result)}`, 'scheduler');

            let punchResult = {}

            if (result.length === 0) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.noDataFound(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, `punchinButNotPunchoutMarkAbsent dataResult:- ${dataResult}`, 'scheduler');
                // return response(res, 200, false, message.noDataFound(), dataResult);
                throw errData(200, message.noDataFound(), null);
            }
            else {

                for (let i = 0; i < result.length; i++) {

                    let shiftStartTime = moment.utc(today + " " + result[i].shift_start_time);
                    let shiftEndTime = moment.utc(today + " " + result[i].shift_end_time);

                    // Calculate shift hours using moment
                    let shiftHours = Math.abs(moment.duration(shiftEndTime.diff(shiftStartTime)).hours());
                    let shiftMinutes = Math.abs(moment.duration(shiftEndTime.diff(shiftStartTime)).minutes());

                    // Attendance data
                    let updateData = {

                        "punchin_id": result[i].attendance_id,
                        "punchOut": null,
                        "actualWorkingHours": {
                            "hours": 0,
                            "minutes": 0
                        },
                        "status": enumValue.missedPunch,
                        "todayLateIn": 0,
                        "todayEarlyOut": 0,
                        "todayDeficitHours": {
                            "hours": shiftHours,
                            "minutes": shiftMinutes
                        }
                    };
                    printLogger(2, `punchinButNotPunchoutMarkAbsent updateData- ${util.inspect(updateData, { showHidden: false, depth: null })}`, 'scheduler');


                    // Update attendance data to absent
                    let punchResult = await attendanceModel.actualWorkingHour(updateData);
                    printLogger(2, `punchinButNotPunchoutMarkAbsent punchResult:- ${punchResult}`, 'scheduler');


                    // Add some required fields in punchResult
                    punchResult.status = enumValue.missedPunch;
                    punchResult.actual_working_hours = updateData.actualWorkingHours;
                    punchResult.today_deficit_hours = updateData.todayDeficitHours;
                    punchResult.today_late_in = updateData.todayLateIn;
                    punchResult.today_early_out = updateData.todayEarlyOut;

                    // Attendance data send to monthlyAttendanceController on daily basis
                    let monthlyAttendanceResult = await monthlyAttendanceController.saveMonthlyAttendance(punchResult);
                    printLogger(2, `punchinButNotPunchoutMarkAbsent monthlyAttendanceResult:- ${monthlyAttendanceResult}`, 'scheduler');

                    // Update calculated_last_swipe
                    let lastSwipeData = {
                        "employee_id": result[i]._id,
                        "isPunch": true,
                        "calculatedLastSwipe": moment.utc()
                    }

                    let calculatedLastSwipe = await employeesModel.updateEmployeeLastSwipe(lastSwipeData);

                    // Save earned amount and attendance details
                    await updateEarnedAmount_attendanceCountes(result[i])
                }

                return response(res, 200, true, message.dataFound(), result);
            }
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, `punchinButNotPunchoutMarkAbsent error:-  ${error}`, 'scheduler');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// Reset employee monthly data
exports.resetEmployeeMonthlyData = async (req, res, next) => {
    try {

        printLogger(2, `******* ${req.originalUrl} *********`, 'scheduler');
        let reqFilter = {};

        //  DONT DELETE
        printLogger(2, `payload body resetEmployeeMonthlyData - ${JSON.stringify(req.body)}`, 'scheduler');

        // Get all employees
        let employeesResult = await employeesModel.allEmployees(reqFilter);
        // console.log("length:- ",employeesResult.length)

        printLogger(2, `resetEmployeeMonthlyData employeesResult:-  ${employeesResult}`, 'scheduler');
        // console.log("employeesResult:- ", employeesResult.result)

        let employeeId = [];
        await employeesResult.forEach(element => {
            employeeId.push(element._id)
        });

        reqBody = { employee_id: employeeId }

        let setData = {

            "presents_count": 0,
            "absents_count": 0,
            "leaves_count": 0,
            "half_days_count": 0,
            "missed_punch_count": 0,
            "late_in": 0,
            "early_out": 0,
            "days_worked_till_now": 0,
            "payout_credited": 0,
            "earned_amount": 0
        };


        let employeesUpdateResult = await employeesModel.updateMultiple(reqBody, setData);
        printLogger(2, `resetEmployeeMonthlyData  employeesUpdateResult:- ${util.inspect(employeesUpdateResult, { showHidden: false, depth: null })}`, 'scheduler');

        // console.log("employeesUpdateResult:- ", employeesUpdateResult)
        return response(res, 200, true, message.updateSuccessfully("Data"), employeesUpdateResult);
    }
    catch (error) {

        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, `resetEmployeeMonthlyData error:-  ${error}`, 'scheduler');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// Reset employers monthly data
exports.resetEmployerMonthlyData = async (req, res, next) => {
    try {

        printLogger(2, `************ ${req.originalUrl} **************`, 'scheduler');

        //  DONT DELETE
        printLogger(2, `payload body resetEmployerMonthlyData - ${JSON.stringify(req.body)}`, 'scheduler');

        let companiesResult = await employerModel.allCompanies();

        printLogger(2, `resetEmployerMonthlyData companiesResult:- ${companiesResult}`, 'scheduler');

        let companiesId = [];
        await companiesResult.forEach(element => {
            companiesId.push(element._id)
        });

        reqBody = { company_id: companiesId }

        let setData = {

            "payout_credited_count": 0,
            "payout_credited_amount": 0
        };

        let employeesUpdateResult = await employerModel.updateMultiple(reqBody, setData);
        printLogger(2, `resetEmployerMonthlyData  employeesUpdateResult:- ${util.inspect(employeesUpdateResult, { showHidden: false, depth: null })}`, 'scheduler');

        return response(res, 200, true, message.updateSuccessfully("Data"), employeesUpdateResult);
    }
    catch (error) {

        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, `resetEmployerMonthlyData error:-  ${error}`, 'scheduler');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// Set holiday in attendance
exports.setHoliday = async (req, res, next) => {
    try {
        printLogger(2, `************ ${req.originalUrl} **************`, 'scheduler');

        //  DONT DELETE
        printLogger(2, `payload body setHoliday - ${JSON.stringify(req.body)}`, 'scheduler');

        // Employee list of today's holiday
        // let holidayResult = await holidayModel.holidayListForScheduler();

        let holidayResult = await schedulerModel.setHoliday();

        printLogger(2, `setHoliday holidayResult:-  ${util.inspect(holidayResult, { showHidden: false, depth: null })}`, 'scheduler');

        let attendanceDataArray = [];

        for (let i = 0; i < holidayResult.length; i++) {

            let checkData = { "employee_id": holidayResult[i]._id };

            let checkPunchResult = await checkPunchIn(checkData);
            printLogger(2, `setHoliday checkPunchResult:-  ${util.inspect(checkPunchResult, { showHidden: false, depth: null })}`, 'scheduler');

            if (checkPunchResult === 0) {

                let date = moment().format('YYYY-MM-DD');
                let today = new Date(date + "T00:00:00.000Z");

                let holidayStatus

                for (j = 0; j < holidayResult[i].holidays.length; j++) {

                    if ((holidayResult[i].holidays[j].date).toString() == (today).toString()) {

                        holidayStatus = holidayResult[i].holidays[j].is_paid === true ? enumValue.paidHolidayStatus : enumValue.unpaidHolidayStatus;
                        // console.log("holidayStatus:- ", holidayStatus)
                    }
                }

                // Attendance data
                let attendanceData = {
                    "first_name": holidayResult[i].first_name,
                    "middle_name": holidayResult[i].middle_name,
                    "last_name": holidayResult[i].last_name,
                    "company_id": holidayResult[i].company_id,
                    "company_name": holidayResult[i].company_name,
                    "employee_id": holidayResult[i]._id,
                    "employee_auto_id": holidayResult[i].employee_id,
                    "punch_in": null,
                    "punch_out": null,
                    "work_shift_id": holidayResult[i].work_shift_id,
                    "actual_working_hours": {
                        "hours": 0,
                        "minutes": 0
                    },
                    "status": holidayStatus,
                    "today_late_in": 0,
                    "today_early_out": 0,
                    "today_deficit_hours": {
                        "hours": 0,
                        "minutes": 0
                    }
                };

                attendanceDataArray.push(attendanceData)

                printLogger(2, `setHoliday attendanceData- ${util.inspect(attendanceData, { showHidden: false, depth: null })}`, 'scheduler');

                // Save attendance data
                let punchResult = await attendanceModel.punchIn(attendanceData);
                printLogger(2, `setHoliday punchResult- ${JSON.stringify(util.inspect(punchResult, { showHidden: false, depth: null }))}`, 'scheduler');
                // console.log("punchResult:- ", punchResult)

                // Attendance data send to monthlyAttendanceController on daily basis
                let monthlyAttendanceResult = await monthlyAttendanceController.saveMonthlyAttendance(punchResult);
                printLogger(2, `setHoliday monthlyAttendanceResult- ${JSON.stringify(util.inspect(monthlyAttendanceResult, { showHidden: false, depth: null }))}`, 'scheduler');

                // Update calculated_last_swipe
                let lastSwipeData = {
                    "employee_id": holidayResult[i]._id,
                    "isPunch": true,
                    "calculatedLastSwipe": moment.utc()
                }

                let calculatedLastSwipe = await employeesModel.updateEmployeeLastSwipe(lastSwipeData);

                holidayResult[i].holidayStatus = holidayStatus;

                // Save earned amount and attendance details
                await updateEarnedAmount_attendanceCountes(holidayResult[i])
            }
        }

        printLogger(2, `setHoliday attendanceDataArray- ${JSON.stringify(util.inspect(attendanceDataArray, { showHidden: false, depth: null }))}`, 'scheduler');
        return response(res, 200, true, message.dataFound(), attendanceDataArray);
    }
    catch (error) {

        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, `setHoliday  error- ${error}`, 'scheduler');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// Set weeklyOff in attendance
exports.setWeeklyOff = async (req, res, next) => {
    try {

        printLogger(2, `***************** ${req.originalUrl} *******************`, 'scheduler');

        //  DONT DELETE
        printLogger(2, `payload body setWeeklyOff - ${JSON.stringify(req.body)}`, 'scheduler');

        // Employee list of weekly off's
        let weeklyOffResult = await schedulerModel.setWeeklyOff();

        printLogger(2, `setWeeklyOff weeklyOffResult:- ${util.inspect(weeklyOffResult, { showHidden: false, depth: null })}`, 'scheduler');

        let attendanceDataArray = [];

        for (let i = 0; i < weeklyOffResult.length; i++) {

            let checkData = { "employee_id": weeklyOffResult[i]._id };

            let checkPunchResult = await checkPunchIn(checkData);
            printLogger(2, `setWeeklyOff checkPunchResult:- ${util.inspect(checkPunchResult, { showHidden: false, depth: null })}`, 'scheduler');

            if (checkPunchResult === 0) {

                // Attendance data
                let attendanceData = {
                    "first_name": weeklyOffResult[i].first_name,
                    "middle_name": weeklyOffResult[i].middle_name,
                    "last_name": weeklyOffResult[i].last_name,
                    "company_id": weeklyOffResult[i].company_id,
                    "company_name": weeklyOffResult[i].company_name,
                    "employee_id": weeklyOffResult[i]._id,
                    "employee_auto_id": weeklyOffResult[i].employee_id,
                    "punch_in": null,
                    "punch_out": null,
                    "work_shift_id": weeklyOffResult[i].work_shift_id,
                    "actual_working_hours": {
                        "hours": 0,
                        "minutes": 0
                    },
                    "status": enumValue.weeklyOffStatus,
                    "today_late_in": 0,
                    "today_early_out": 0,
                    "today_deficit_hours": {
                        "hours": 0,
                        "minutes": 0
                    }
                };

                attendanceDataArray.push(attendanceData)

                printLogger(2, `setWeeklyOff attendanceData- ${util.inspect(attendanceData, { showHidden: false, depth: null })}`, 'scheduler');

                // Save attendance data
                let punchResult = await attendanceModel.punchIn(attendanceData);
                printLogger(2, `setWeeklyOff punchResult- ${JSON.stringify(util.inspect(punchResult, { showHidden: false, depth: null }))}`, 'scheduler');


                // Attendance data send to monthlyAttendanceController
                let monthlyAttendanceResult = await monthlyAttendanceController.saveMonthlyAttendance(punchResult);
                printLogger(2, `setWeeklyOff monthlyAttendanceResult- ${JSON.stringify(util.inspect(monthlyAttendanceResult, { showHidden: false, depth: null }))}`, 'scheduler');

                // Update calculated_last_swipe
                let lastSwipeData = {
                    "employee_id": weeklyOffResult[i]._id,
                    "isPunch": true,
                    "calculatedLastSwipe": moment.utc()
                }

                let calculatedLastSwipe = await employeesModel.updateEmployeeLastSwipe(lastSwipeData);

                weeklyOffResult[i].holidayStatus = enumValue.weeklyOffStatus;

                // Save earned amount and attendance details
                await updateEarnedAmount_attendanceCountes(weeklyOffResult[i]);
            }
        }

        printLogger(2, `setWeeklyOff attendanceDataArray- ${JSON.stringify(util.inspect(attendanceDataArray, { showHidden: false, depth: null }))}`, 'scheduler');
        return response(res, 200, true, message.dataFound(), attendanceDataArray);
    }
    catch (error) {

        // console.log(error)
        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, `setWeeklyOff  error- ${error}`, 'scheduler');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// Set employee credit limit if employer month setting is day wise
exports.setEmployeesCreditLimit = async (req, res, next) => {
    try {

        printLogger(2, `***************** ${req.originalUrl} *******************`, 'scheduler');

        //  DONT DELETE
        printLogger(2, `payload body setEmployeesCreditLimit - ${JSON.stringify(req.body)}`, 'scheduler');

        // Get companies data
        let companiesData = await employerModel.allCompanies();

        if (companiesData.length > 0) {

            for (let i = 0; i < companiesData.length; i++) {

                // get current month employees's credit limit type setting from companies data
                let currentMonthSetting = await employeeCreditLimitType(companiesData[i]);

                // If company current month setting is day wise
                if (currentMonthSetting === enumValue.dayWiseCreditLimit) {

                    let reqData = { "company_id": companiesData[i]._id };

                    // Get employees data by company_id
                    let employeesData = await employeesModel.findEmployeesByCompanyId(reqData);

                    for (let j = 0; j < employeesData.length; j++) {

                        // Get net salary and credit limit percent from employees data
                        let netSalary = employeesData[j].net_salary;
                        let creditLimitPercent = employeesData[j].credit_limit_percent || 50;

                        // Calculate employees credit limit
                        let employeeCreditLimit = parseInt((netSalary * creditLimitPercent) / 100);

                        // Update credit limit of employee
                        let updatedData = await schedulerModel.setEmployeesCreditLimit(employeesData[j]._id, employeeCreditLimit);
                        printLogger(2, `setEmployeesCreditLimit updatedData- ${JSON.stringify(util.inspect(updatedData))}`, 'scheduler');
                    }
                }
            }

            printLogger(2, `setEmployeesCreditLimit companiesData- ${JSON.stringify(util.inspect(companiesData))}`, 'scheduler');
            return response(res, 200, true, message.updateSuccessfully("Credit limit"), "");
        }
        else {

            // let dataResult = [{
            //     "value": "",
            //     "msg": message.noDataFound(),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(0, dataResult, 'scheduler');
            // return response(res, 200, false, message.noDataFound(), dataResult);
            throw errData(200, message.noDataFound(), null);
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, `setEmployeesCreditLimit  error- ${error}`, 'scheduler');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};

exports.sentLoanRequest = async (req, res) => {
    try {
        let reqBody = req.body;
        //console.log("reqBody", reqBody);
        let listResult = await transactionModel.transactionsListById(reqBody);
        listResult = listResult[0];
        //   console.log("listResult", listResult);

        /*Employee Bank Details*/
        let empBankDetail = {
            bank_name: listResult.bank_details.bank_name,
            account_number: listResult.bank_details.account_number,
            ifsc_code: listResult.bank_details.ifsc_code,
            name_in_bank: listResult.bank_details.name_in_bank,
            bank_account_type: listResult.bank_details.bank_account_type,
            pan_card: listResult.employee_pan_card,
            branch_name: listResult.bank_details.branch_name
        };

        let empDecryptDetail = decryptData(empBankDetail);

        /*Employer Bank Details*/
        let employerBankDetail = {
            pan_card: listResult.company_pan_card,
            company_cin: listResult.company_cin
        };
        //console.log("employerDecryptDetail", employerBankDetail);
        let employerDecryptDetail = decryptData(employerBankDetail);
        //console.log("employerDecryptDetail", employerDecryptDetail);

        let guarantor_name = listResult.company_gurantor_name ? listResult.company_gurantor_name : "";
        let company_gst_number = listResult.company_gst_number ? listResult.company_gst_number : "";

        let employerPayTransactionCharge = false;
        //// Get current month employer_pay_transaction_charge value from commonFunction
        employerPayTransactionCharge = transactionChargeSetting(listResult.Company);
        let transaction_type = employerPayTransactionCharge.employer_pay_transaction_charge == true ? "Employer" : "Employee";
        //console.log("guarantor_name",guarantor_name);
        //console.log("empDecryptDetail", empDecryptDetail);

        printLogger(2, `***************** ${req.originalUrl} *******************`, 'scheduler');

        //  DONT DELETE
        printLogger(2, `payload body getLoanData - ${JSON.stringify(req.body)}`, 'scheduler');

        /*  START ***  NBFC loan process */

        // Set NBFC loan api payload

        let requested_date = moment(listResult.created_at).utc().format("DD-MM-YYYY");
        let dob = listResult.dob ? moment(listResult.dob).utc().format("DD-MM-YYYY") : '';
        let company_incorporation_date = listResult.company_incorporation_date ? moment(listResult.company_incorporation_date).utc().format("DD-MM-YYYY") : '';
        //console.log("requested_date", moment().utc().startOf('month').add(1, 'months').add(4,'day'));

        let employer_kyc_data = `{ 
            "company_name": "${listResult.company_name}",
            "pan": "${employerDecryptDetail.pan_card}",
            "gst": "${company_gst_number}",
            "cin_partnership_id": "${employerDecryptDetail.company_cin}",
            "incorporation_date": "${company_incorporation_date}",
            "guarantor_name": "${guarantor_name}"
            }`;

        let employee_kyc_data = `{ 
                    "employee_name": "${listResult.first_name}",
                    "employee_middle_name": "${listResult.middle_name}",
                    "employee_last_name": "${listResult.last_name}",
                    "email_id": "${listResult.email}",
                    "gender": "${listResult.gender}",
                    "dob": "${dob}",
                    "pan": "${empDecryptDetail.pan_card}",
                    "aadhar_card": "${empDecryptDetail.employee_aadhar_card}" ,
                    "mobile_number": ${listResult.employee_mobile_number},
                    "father_name": "${listResult.employee_father_mother_name}",
                    "mother_name": "",
                    "address1": "${listResult.employee_address.address_1}",
                    "address2": "${listResult.employee_address.address_2}",
                    "pincode": ${listResult.employee_address.pincode},
                    "country": "${listResult.employee_address.country}",
                    "bank_name": "${empDecryptDetail.bank_name}" ,
                    "branch": "${empDecryptDetail.branch_name}",
                    "account_number": "${empDecryptDetail.account_number}",
                    "name_in_bank": "${empDecryptDetail.name_in_bank}",
                    "bank_account_type": "${empDecryptDetail.bank_account_type}",
                    "ifsc_code": "${empDecryptDetail.ifsc_code}"
                }`;

        let loan_request = `{ 
                    "loan_request_id": "${listResult.request_id}",
                    "loan_request_amount": ${listResult.amount},
                    "requested_date": "${requested_date}",
                    "repayment_date": "${moment().utc().startOf('month').add(1, 'months').add(4, 'day').format("DD-MM-YYYY")}",
                    "transaction_type": "${transaction_type}",
                    "interest_payable": ${employerPayTransactionCharge.transaction_deduction_percent}
                        }`;

        /*   let employer_kyc_data = `{ 
                       "company_name": "SCNL",
                       "pan": "ASDFG7654Q",
                       "gst": "08DHSDKFKF",
                       "cin_partnership_id": "CIN880803423",
                       "incorporation_date": "12-03-2021",
                       "guarantor_name": "ABC"
               }`;
           let employee_kyc_data = `{ 
                       "employee_name": "Ranjeet",
                       "employee_middle_name": "Kumar",
                       "employee_last_name": "Singh",
                       "email_id": "ajeet02@satincreditcare.com",
                       "gender": "M",
                       "dob": "18-02-1987",
                       "pan": "KPLLO6687K",
                       "aadhar_card": "354312349854",
                       "mobile_number": 7355555889,
                       "father_name": "Vinod Kumar",
                       "mother_name": "Bimla Devi",
                       "address1": "492, Udyog Vihar",
                       "address2": "Sector 20, Gurgaon",
                       "pincode": 122001,
                       "country": "INDIA",
                       "bank_name": "ICICI BANK",
                       "branch": "Gurgaon",
                       "account_number": "223056068768263",
                       "name_in_bank": "Ranjeet Kumar",
                       "bank_account_type": "S",
                       "ifsc_code": "ICIC0007630"
                   }`;
   
           let loan_request = `{ 
                       "loan_request_id": 9699325,
                       "loan_request_amount": 9000,
                       "requested_date": "06-01-2021",
                       "repayment_date": "28-01-2022"
                           }`;*/

        let bodyObj = `{"RequestData":{
            "Body": [
                {
                    "employer_kyc_data" : ${employer_kyc_data},
                    "employee_kyc_data" : ${employee_kyc_data},
                    "loan_request" : ${loan_request}
                }]
            }
        }`;
        //console.log("bodyObj", bodyObj);
        // Set NBFC loan api options
        let options = {
            'method': 'POST',
            //'url': '',
            'url': 'https://lmsuat.satincreditcare.com/LMS/rupyo/api/pushLoanApplications',
            'headers': {
                'Authorization': '',
                'Content-Type': 'application/json',
                'x-lms-access-key-id': 'RUPYO_API',
                'x-lms-secret-access-key': 'b54zc23w4ZLFut9e',
                'vendorName': 'RUPYO'
            },
            'body': bodyObj
        };
        printLogger(2, `NBFC loan api request options:- ${options}`, 'scheduler');
        // console.log("options", JSON.stringify(options));
        let result = {};

        // Call NBFC loan api
        request(options, (error, response) => {
            if (error) {
                printLogger(0, " ********* sendPushNotification ************** ", 'scheduler');
                printLogger(0, `error:-  ${error}`, 'scheduler');
                //console.log("error", error);
            }
            else {

                printLogger(2, `response.body:-  ${response.body}`, 'scheduler');
                result = response.body;
                //   console.log("response.body", response.body);
                //console.log("response",response);
            }
        });

        /*  END  ***  NBFC loan process */

        printLogger(2, `getLoanData companiesData- ${JSON.stringify(util.inspect(result))}`, 'scheduler');
        return response(res, 200, true, message.dataFound(), result);
    }
    catch (error) {

        let dataResult = [{
            "value": "",
            "msg": message.error(error),
            "param": "",
            "location": ""
        }]
        printLogger(0, `setEmployeesCreditLimit  error- ${error}`, 'scheduler');
        return response(res, 500, false, message.error(error), dataResult);
    }
};

// Get loan status by loan id
exports.getLoanData = async (req, res) => {
    try {
        printLogger(2, `***************** ${req.originalUrl} *******************`, 'scheduler');

        //  DONT DELETE
        printLogger(2, `payload body getLoanData - ${JSON.stringify(req.body)}`, 'scheduler');

        /*  START ***  NBFC loan process */

        // Set NBFC loan api payload
        let bodyObj = `{}`;

        // Set NBFC loan api options
        let options = {
            'method': 'GET',
            'url': 'https://lmsuat.satincreditcare.com/LMS/rupyo/api/getApplicationStatus?loanId=122430',
            'headers': {
                'Authorization': '',
                'Content-Type': 'application/json',
                'x-lms-access-key-id': 'RUPYO_API',
                'x-lms-secret-access-key': 'b54zc23w4ZLFut9e',
                'vendorName': 'RUPYO'
            },
            'body': bodyObj
        };
        printLogger(2, `NBFC loan api request options:- ${options}`, 'scheduler');

        let result = {};

        // Call NBFC loan api
        request(options, (error, response) => {
            if (error) {
                printLogger(0, " ********* sendPushNotification ************** ", 'scheduler');
                printLogger(0, `error:-  ${error}`, 'scheduler');
                //   console.log("error", error);
            }
            else {

                printLogger(2, `response.body:-  ${response.body}`, 'scheduler');
                result = response.body;
                //   console.log("response.body", response.body);
                //console.log("response",response);
            }
        });

        /*  END  ***  NBFC loan process */

        printLogger(2, `getLoanData companiesData- ${JSON.stringify(util.inspect(result))}`, 'scheduler');
        return response(res, 200, true, message.dataFound(), result);
    }
    catch (error) {

        let dataResult = [{
            "value": "",
            "msg": message.error(error),
            "param": "",
            "location": ""
        }]
        printLogger(0, `setEmployeesCreditLimit  error- ${error}`, 'scheduler');
        return response(res, 500, false, message.error(error), dataResult);
    }
};

// Employees transaction details (by payout request id)
exports.getAllLoanApplicationStatus = async (req, res, next) => {
    try {
        printLogger(2, `***************** ${req.originalUrl} *******************`, 'scheduler');

        //  DONT DELETE
        printLogger(2, `payload body getAllLoanApplicationStatus - ${JSON.stringify(req.body)}`, 'scheduler');


        //let reqBody = req.body;
        //let requestId = reqBody.request_id;
        let _status = 12;

        let _result = await transactionModel.transactionDetailsList(_status);

        if (_result.length <= 0) {
            //console.log("if", result);
            throw errData(200, message.noDataFound('scheduler'), null);
        }
        else {
            // console.log("else", result.result[0]);
            for (let i = 0; i < _result.result.length; i++) {
                //  console.log("For in result", result.result);
                let employeeResult = _result.result[i];

                /// GTE Responce FROM BFC 
                let responceNBFC = await loanStatusByLoanId(_result.result[i]);

                //  console.log("responceNBFC loan status: ", responceNBFC);

                printLogger(2, `NBFC loan status api request responceNBFC:- ${JSON.stringify(responceNBFC)}`, 'scheduler');

                let transactionId = { "_id": _result.result[i]._id };
                printLogger(2, `NBFC loan status api request transactionId:- ${JSON.stringify(transactionId)}`, 'scheduler');
                //   console.log("responceNBFC", responceNBFC);


                let result = await transactionModel.updateTransaction(transactionId, responceNBFC);
                ////////////////////////////////////////////////////
                if (result === null || result === undefined) {
                    throw errData(200, message.unableToUpdate('Transaction'), null);
                }
                else {
                    let _status = responceNBFC.status;
                    //   _status = 13;
                    //    console.log("_status", _status);
                    if (_status === enumValue.creditedStatus) {


                        result.status = _status;
                        result.imps_receipt_number = responceNBFC.imps_receipt_number;
                        result.imps_receipt_link = responceNBFC.imps_receipt_link;
                        result.transaction_charge = 0;
                        result.transaction_message = responceNBFC.transaction_message;

                        let resultStatus = parseInt(result.status);

                        // Employer infrom from in app
                        let _credited = enumValue.creditedStatus;
                        let _rejected = enumValue.rejectedStatus;
                        let _approved = enumValue.approvedStatus;

                        let transactionDeductionPercent = global.env.TRANSACTION_DEDUCTION_PERCENT;

                        // Credited notification for employee
                        if (resultStatus === _credited) {

                            let bankDetail = {

                                bank_name: employeeResult.bank_details.bank_name,
                                account_number: employeeResult.bank_details.account_number,
                                ifsc_code: employeeResult.bank_details.ifsc_code,
                                pan_card: employeeResult.pan_card
                            };

                            let decryptDetail = decryptData(bankDetail);

                            let accountNumber = decryptDetail.account_number.slice(decryptDetail.account_number.length - 5);

                            result.bank_name = decryptDetail.bank_name;
                            result.account_number = `XXXXXXXXX${accountNumber}`;


                            // Check transaction deduction percent setting
                            let _transactionChargeSetting = transactionChargeSetting(employeeResult.Company);

                            let isEmployerTransactionDeduction = _transactionChargeSetting.employer_pay_transaction_charge;
                            transactionDeductionPercent = isEmployerTransactionDeduction === true ? 0 : global.env.TRANSACTION_DEDUCTION_PERCENT;
                        }

                        let smsData = {
                            "employee_name": employeeResult.first_name + " " + employeeResult.last_name,
                            "employee_id": employeeResult.employee_id,
                            "company_name": employeeResult.company_name,
                            "company_code": employeeResult.rupyo_company_code,
                            "request_id": result.request_id,
                            "requested_amount": parseInt(employeeResult.amount),
                            "credited_amount": parseInt(employeeResult.amount - (employeeResult.amount * transactionDeductionPercent / 100)),

                            // "requested_amount": parseInt(_result.amount),
                            // "credited_amount": parseInt(_result.amount - (_result.amount * transactionDeductionPercent / 100)),
                            "deduction_percent": transactionDeductionPercent,
                            "bank_name": result.bank_name,
                            "account_number": result.account_number,
                            "date": moment().format("LL"),
                            "time": moment().utcOffset("+05:30").format('hh:mm:ss A')
                        }

                        // Payout credited sms
                        let payoutCreditedSMS = message.payoutCreditedSMS(smsData);

                        // Employee Approval or decline of pay outs
                        // Notications calling and send

                        // Notifications for employee
                        let creditedNotifications = notification.payoutCredited(smsData);
                        let rejectedNotifications = notification.payoutRejected(smsData);
                        let approvedNotifications = notification.payoutApproved(smsData);


                        // Notifications for employer
                        let creditedNotificationForEmployer = notification.payoutCreditedMessageForEmployer(smsData);
                        let rejectedNotificationForEmployer = notification.payoutRejectedMessageForEmployer(smsData);
                        let approvedNotificationForEmployer = notification.payoutApprovedMessageForEmployer(smsData);


                        if (resultStatus === _credited || resultStatus === _rejected || resultStatus === _approved) {

                            let payoutNotifications = resultStatus === _credited ? creditedNotifications : resultStatus === _rejected ? rejectedNotifications : resultStatus === _approved ? approvedNotifications : creditedNotifications;

                            let payoutNotificationForEmployer = resultStatus === _credited ? creditedNotificationForEmployer : resultStatus === _rejected ? rejectedNotificationForEmployer : resultStatus === _approved ? approvedNotificationForEmployer : creditedNotificationForEmployer;

                            let notificationsData = [];

                            // For employee
                            notificationsData.push({
                                "user_id": result.user_id,
                                "company_id": result.company_id,
                                "message": payoutNotifications,
                                "resource_type": enumValue.payoutStatus,
                                "status": resultStatus,
                                "imps_receipt_link": result.imps_receipt_link,
                                "request_id": result.request_id,
                                "for_notifications": enumValue.employeeRoleId,
                                "created_by": result._id
                            });

                            // For employer
                            notificationsData.push({
                                "user_id": result.user_id,
                                "company_id": result.company_id,
                                "message": payoutNotificationForEmployer,
                                "resource_type": enumValue.payoutStatus,
                                "status": resultStatus,
                                "imps_receipt_link": result.imps_receipt_link,
                                "request_id": result.request_id,
                                "for_notifications": enumValue.employerRoleId,
                                "created_by": result._id
                            });

                            let notificationResult = await notificationsModel.bulkInsert(notificationsData);
                        }

                        // If payout credited
                        if (result.status === enumValue.creditedStatus) {

                            // Save monthly transaction
                            await monthlyTransactionController.saveMonthlyTransaction(result);
                            await updatePayoutCredited(result);

                            // Send SMS to employee
                            let awsSMS = await sendSMS("+91" + employeeResult.mobile_number, payoutCreditedSMS);


                            let checkData = { "company_id": result.company_id };

                            // Get company details
                            let companyResult = await employerModel.findCompany(checkData);

                            let company_id = result.company_id;

                            let updateData = {

                                "payout_credited_count": companyResult.payout_credited_count + 1,
                                "payout_credited_amount": companyResult.payout_credited_amount + result.amount
                            };

                            // Update company data (payout credited count, payout credited amount)
                            let updateCompanyData = await employerModel.updateCompanyData(company_id, updateData);
                        }

                        let notificationData = {
                            "registrationIds": `["${employeeResult.firebase_device_token}"]`,
                            "body": `"Your payout status has been updated by Rupyo team. Please click here for more information."`,
                            "title": `"Payout request status Updated"`,
                            "notificationType": `"PAYOUT_REQUEST_UPDATED"`
                        }

                        pushNotificationResult = sendPushNotification(notificationData);

                        printLogger(2, result, 'transaction');
                        return response(res, 200, true, message.updateSuccessfully('Transaction'), result);
                    }

                }

                /////////////////////////////////////////////////////////////
            }

            printLogger(2, _result, 'scheduler');
            return response(res, 200, true, message.dataFound('scheduler'), _result);
        }
    }
    catch (error) {
        printLogger(0, error, 'scheduler');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};

let loanStatusByLoanId = async (listResult) => {
    try {
        // console.log("loanId:1 listResult :-", listResult);
        let loanId = listResult.loan_id;
        // console.log("loanId:1 :-", loanId);
        // printLogger(2, `loanId:-  ${loanId}`, 'scheduler');
        // console.log("listResult", listResult);
        /*  START ***  NBFC loan process */

        // Set NBFC loan api payload
        let bodyObj = `{}`;

        // Set NBFC loan api options Stage 
        /*let options = {
            'method': 'GET',
            'url': `https://lmsuat.satincreditcare.com/LMS/rupyo/api/getApplicationStatus?loanId=${loanId}`,
            'headers': {
                'Authorization': '',
                'Content-Type': 'application/json',
                'x-lms-access-key-id': 'RUPYO_API',
                'x-lms-secret-access-key': '5yvDxn4(~MZ&C9he',
                'vendorName': 'RUPYO'
            },
            'body': bodyObj
        };*/
// Live URLS
        let options = {
            'method': 'GET',
            'url': `https://lms.satinfinserv.com/LMS/rupyo/api/getApplicationStatus?loanId=${loanId}`,
            'headers': {
                'Authorization': '',
                'Content-Type': 'application/json',
                'x-lms-access-key-id': 'RUPYO_API',
                'x-lms-secret-access-key': 'b54zc23w4ZLFut9e',
                'vendorName': 'RUPYO'
            },
            'body': bodyObj
        };
        printLogger(2, `NBFC loan api request options:- ${JSON.stringify(options)}`, 'scheduler');
        let messageResponce1 = `Loan ID:-'${loanId}`;

        sendEmail('pmandloi@flair-solution.com', 'njhawar@flair-solution.com', `<div>[${JSON.stringify(options)}] :-</div>`, messageResponce1);

        let result = {};

        // Call NBFC loan api
        let data = new Promise((resolve, reject) => {
            request(options, (error, response) => {
                if (error) {
                    printLogger(0, " ********* sendPushNotification ************** ", 'scheduler');
                    printLogger(0, `error:-  ${error}`, 'scheduler');
                 //   console.log("error", error);
                }
                else {
                    printLogger(0, " ********* loanStatusByLoanId ************** ", 'scheduler');

                    printLogger(2, `response.body:-  ${response.body}`, 'scheduler');

                    // printLogger(2, `response.body:-  ${response.body}`, 'scheduler');
                    result = response.body;
                    // console.log("response.body", response.body);


                    let Loan_status_tracker = [];
                    let statusTracker = [];

                    if (listResult.status_tracker) {
                        statusTracker = listResult.status_tracker
                    }

                    // printLogger(2, `response.body:-  ${response.body}`, 'scheduler');
                    // result = response.body;
                    //console.log("response.body", response.body);
                    // console.log("listResult.loan_status_tracker", listResult.loan_status_tracker);

                    let JsonPars = JSON.parse(response.body);

                    let messageResponce = `response Loan ID:-'${JsonPars}`;

                    sendEmail('pmandloi@flair-solution.com', 'njhawar@flair-solution.com', `<div>[${JSON.stringify(options)}] :-</div>`, messageResponce);


                    printLogger(2, `JsonPars:-  ${JsonPars}`, 'scheduler');
                    let _status = 12;
                    //console.log("JsonPars", JsonPars);

                    // console.log("loan_id", JsonPars.Loans[0].loan_id);
                    //console.log("status", JsonPars.Loans[0].status);

                    // let loan_id = JsonPars.Loans[0].loan_id;

                    let responceStatus = JsonPars.ResponseData.status;
                    // console.log("responceStatus", responceStatus);
                    //let responce_message = JsonPars.response_message;
                    let responceUtr_number = JsonPars.ResponseData.utr_number ? JsonPars.ResponseData.utr_number : "";


                    // status
                    if (responceStatus === "PENDING") {
                        _status = 12;
                    }
                    else if (responceStatus === "ACTIVE") {
                        _status = 13;
                    }
                    else if (responceStatus === "REJECTED") {
                        _status = 14;
                    }

                    if (listResult.loan_status_tracker) {
                        Loan_status_tracker = listResult.loan_status_tracker
                    }

                    let Loan_status_trackerData = {
                        "status_made": Date.now(),
                        "message": response.body
                    }

                    Loan_status_tracker.push(Loan_status_trackerData);

                    let statusTracketData = {
                        "status": _status,
                        "status_made": Date.now(),
                        //"status_made_by": req.userData._id,
                        //"imps_receipt_link": reqBody.imps_receipt_link
                    }
                    statusTracker.push(statusTracketData)

                    if (_status === 12) {
                        data = {
                            //"loan_id": loan_id,
                            "status": _status,
                            "transaction_message": response.body,
                            "loan_status_tracker": Loan_status_tracker,
                            "imps_receipt_number": responceUtr_number,
                            "amount": parseFloat(listResult.amount),
                            "transaction_charge": 0,
                            //"status_tracker": statusTracker,
                            //"transaction_message": responce_message
                        }
                    }
                    else {
                        data = {
                            //"loan_id": loan_id,
                            "status": _status,
                            "transaction_message": response.body,
                            "loan_status_tracker": Loan_status_tracker,
                            "imps_receipt_number": responceUtr_number,
                            "amount": parseFloat(listResult.amount),
                            "transaction_charge": 0,
                            "status_tracker": statusTracker,
                            //"transaction_message": responce_message
                        }
                    }


                    // console.log("data in", data);
                    // console.log("response",response);

                    // let result = await transactionModel.updateTransactionNew(reqBody._id, data);
                    //  console.log("result",result);
                    printLogger(2, `NBFC loan api request data:- ${JSON.stringify(data)}`, 'scheduler');

                    /*  END  ***  NBFC loan process */

                    printLogger(2, `getLoanData companiesData- ${JSON.stringify(util.inspect(result))}`, 'scheduler');
                    resolve(data);
                    return data;
                    // return response(res, 200, true, message.dataFound(), result);
                    //console.log("response",response);
                }
            });

        });
        return await data;



    }
    catch (error) {
        printLogger(0, error, 'scheduler');
    //    console.log("error", error);
        // return response(res, 500, false, message.error(error), dataResult) 
        return false;
    }
};