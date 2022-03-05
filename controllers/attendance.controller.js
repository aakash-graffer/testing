const { validationResult } = require('express-validator');
const moment = require('moment');

const { message, notification, printLogger, enumValue, errData } = require('../core/utility');
const { showMonthlyAttendance, employeeProcessingAmount, findMonthlyTransactionByYearMonth,
    sendPushNotification, updateEarnedAmount_attendanceCountes, sendSMS, checkPunchIn } = require('../core/commonFunctions');
const { response } = require('../core/responseformat');
const employeesModel = require('../models/employees.model');
const workshiftModel = require('../models/workshift.model');
const attendanceModel = require('../models/attendance.model');
const monthlyAttendanceController = require('../controllers/monthlyAttendance.controller');
const notificationsController = require("../controllers/notifications.controller");
const notificationsModel = require('../models/notifications.model');


// Punch in/punch out
exports.punchIn = async (req, res, next) => {
    try {

        // req.body object
        let reqBody = req.body;
        let today = moment().utc().format("YYYY-MM-DD");
        let totalDays = parseInt(moment().utc().endOf('month').format("DD"));
        let rupyoCreditLimit = 0;
        let year = moment().utc().format('YYYY');
        let month = moment().utc().format('M');

        // Check validation errors
        const errors = validationResult(req);
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'attendance');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            // Get employee_id from token
            let checkData = { "employee_id": req.userData._id };
            let checkId = { "_id": req.userData._id };

            let result = await employeesModel.signInAdvance(checkId);
            let employeeResult = result[0]

            if (employeeResult === null || employeeResult === undefined) {

                printLogger(0, employeeResult, 'attendance');
                // return response(res, 403, false, message.unauthorizedUser(), employeeResult);
                throw errData(200, message.unauthorizedUser(), null);
            }
            else {

                let companyStatus = employeeResult.Company.status;

                if (companyStatus === enumValue.activeStatus) {

                    // Check employee shift
                    let shift_data = { "work_shift_id": employeeResult.work_shift_id };

                    // Find work shift by shift id
                    let workshiftResult = await workshiftModel.findWorkshift(shift_data);

                    if (workshiftResult === null || workshiftResult === undefined) {

                        printLogger(0, workshiftResult, 'attendance');
                        // return response(res, 200, false, message.workShiftNotFound(), '');
                        throw errData(200, message.workShiftNotFound(), null);
                    }
                    else {

                        // Calculate employee rupyo credit limit
                        if (employeeResult.credit_limit_type === enumValue.percentBaseType && employeeResult.credit_limit_percent > 0) {
                            employeeResult.rupyo_credit_limit = parseFloat((employeeResult.net_salary * employeeResult.credit_limit_percent) / 100);
                        }

                        rupyoCreditLimit = employeeResult.rupyo_credit_limit;

                        // Convert time into moment
                        // Shift start time
                        let shiftStartTime = moment.utc(today + " " + workshiftResult.shift_start_time).valueOf();

                        // Two hour before shift start time
                        let shiftStartHour = moment.utc(shiftStartTime).subtract(2, 'hours').valueOf();

                        // Shift end time
                        let shiftEndTime = moment.utc(today + " " + workshiftResult.shift_end_time).valueOf();

                        if (shiftEndTime < shiftStartTime) {
                            shiftEndTime = moment.utc(today + " " + workshiftResult.shift_end_time).add(1, "days").valueOf();
                        }

                        employeeResult.lateMessage = false;
                        let lateMessage = false;
                        let userProvidedTime;
                        let punchTime;
                        let _punchTime = moment(reqBody.time).valueOf();
                        printLogger(4, `App time:- ${moment(reqBody.time).valueOf()}`, 'attendance');
                        printLogger(4, `Current time:- ${moment().utc().valueOf()}`, 'attendance');
                        printLogger(4, `reqBody.time:- ${reqBody.time}`, 'attendance');


                        // Check today punch in data exist or not
                        let punchinId = await checkPunchIn(checkData);

                        // If user punched out today
                        if (punchinId === null) {

                            let dataResult = [{
                                "value": "",
                                "msg": message.markedAttendance(),
                                "param": "",
                                "location": ""
                            }]

                            printLogger(0, dataResult, 'attendance');
                            return response(res, 200, false, message.markedAttendance(), dataResult);
                        }

                        /* EMPLOYEE PUNCH IN */
                        // If request don't have punchinId
                        else if (punchinId === 0) {

                            printLogger(4, `_punchTime:== ${_punchTime}`, 'attendance');
                            printLogger(4, `shiftStartTime:- ${shiftStartTime}`, 'attendance');
                            printLogger(4, `shiftEndTime:- ${shiftEndTime}`, 'attendance');
                            printLogger(4, `shiftStartHour:- ${shiftStartHour}`, 'attendance');
                            printLogger(4, `Case 1:- ${_punchTime >= shiftStartHour}`, 'attendance');
                            printLogger(4, `Case 2:- ${_punchTime <= shiftEndTime}`, 'attendance');

                            // Check open shift
                            if (workshiftResult.is_open_shift && workshiftResult.is_open_shift == true) {

                                employeeResult.punchinTime = _punchTime;
                            }
                            else {

                                // Punch in time acccept one hour after shift_start_time and before shift_end_time
                                // shiftStartHour is one hour before shift_start_time
                                if (_punchTime >= shiftStartHour && _punchTime <= shiftEndTime) {

                                    let timeAfter30MinShiftStart = moment.utc(shiftStartTime).add(30, 'minutes').valueOf();

                                    if (_punchTime > timeAfter30MinShiftStart) {

                                        employeeResult.lateMessage = true;
                                        lateMessage = true
                                    }
                                    employeeResult.punchinTime = _punchTime;
                                }
                                else {

                                    return response(res, 200, false, message.punchInTimeNotCorrect(), "");
                                }
                            }

                            let punchInData = await punchInAction(employeeResult);

                            // Update employee last swipe data
                            let lastSwipeData = {
                                "employee_id": req.userData._id,
                                "isPunch": false,
                                "lastSwipe": punchInData.in,
                                "calculatedLastSwipe": punchInData.in
                            }

                            let lastSwipe = employeesModel.updateEmployeeLastSwipe(lastSwipeData);

                            printLogger(2, punchInData, 'attendance');

                            let showMessage = message.punchedIn();

                            if (lateMessage === true) {
                                showMessage = message.punchedInAfter30Minutes();
                            }
                            return response(res, 200, true, showMessage, punchInData);
                        }

                        /* EMPLOYEE PUNCH OUT */
                        // If request have punchinId. Update punch out time
                        else {

                            let _reqBody = { "punchin_id": punchinId };

                            // Check open shift
                            if (workshiftResult.is_open_shift && workshiftResult.is_open_shift === true) {

                                _reqBody.punchoutTime = _punchTime;
                            }
                            else {

                                // Punch out time accept after shift_start_time
                                if (_punchTime >= shiftStartTime) {

                                    let timeAfter2HoursShiftEnd = moment.utc(shiftEndTime).add(2, 'hours').valueOf();

                                    if (_punchTime > timeAfter2HoursShiftEnd) {
                                        lateMessage = true;
                                    }
                                    _reqBody.punchoutTime = _punchTime;
                                }
                                else {

                                    return response(res, 200, false, message.punchOutTimeNotCorrect(), "");
                                }
                            }

                            // Employee punch out
                            let punchOutResult = await attendanceModel.punchOut(_reqBody);

                            // console.log("punchOutResult:- ", punchOutResult)

                            printLogger(2, punchOutResult, 'attendance');

                            // Punch in, punch out time in moment
                            let _punch_in = moment(punchOutResult.punch_in);
                            let _punch_out = moment(_reqBody.punchoutTime);

                            // Calculate actual working hour using moment
                            let workingHours = parseInt(moment.duration(_punch_out.diff(_punch_in)).hours());
                            let workingMinutes = parseInt(moment.duration(_punch_out.diff(_punch_in)).minutes());

                            let actualWorkingHours = {
                                "hours": workingHours,
                                "minutes": workingMinutes
                            };

                            if (workingHours === isNaN || workingMinutes === isNaN) {
                                actualWorkingHours = {
                                    "hours": 0,
                                    "minutes": 0
                                };
                            }

                            _reqBody.punchinTime = punchOutResult.punch_in;
                            _reqBody.status = punchOutResult.status;

                            // Find work shift data 
                            let updateData = await manageStatus(workshiftResult, actualWorkingHours, _reqBody);

                            // Save data monthly attendance
                            let actualWorkingHourData = await actualWorkingHour(updateData);

                            // Update employee last swipe data
                            let lastSwipeData = {
                                "employee_id": req.userData._id,
                                "isPunch": true,
                                "lastSwipe": actualWorkingHourData.out,
                                "calculatedLastSwipe": actualWorkingHourData.out
                            }

                            let lastSwipe = employeesModel.updateEmployeeLastSwipe(lastSwipeData);

                            let checkData = {
                                "employee_id": employeeResult._id,
                                "year": year,
                                "month": month,
                                'user_id': employeeResult._id,
                                'time_filter': enumValue._thisMonth,
                                'status': enumValue.pendingStatus
                            }

                            checkData.status = [enumValue.pendingStatus, enumValue.approvedStatus, enumValue.holdStatus];

                            // TRANSCATION MODEL -> EMPLOYEE TRANSACTIONS LIST
                            let processInAmount = await employeeProcessingAmount(checkData);


                            // MONTHLY ATTENDANCE MODEL -> SHOW MONTHLY ATTENDANCE
                            let monthlyAttendanceResult = await showMonthlyAttendance(employeeResult);

                            //  MONTHLY TRANSACTION MODEL -> FIND MONTHLY TRANSACTION
                            let monthlyTransactionResult = await findMonthlyTransactionByYearMonth(checkData);


                            let _todayPunchin = moment(actualWorkingHourData.in).utc();
                            let _todayPunchout = moment(actualWorkingHourData.out).utc();
                            hoursSpentToday = moment.duration(_todayPunchout.diff(_todayPunchin)).hours();

                            // Save earned amount and attendance details
                            await updateEarnedAmount_attendanceCountes(employeeResult)

                            // Add stats details in punch out response
                            actualWorkingHourData.stats = {
                                "salary": {
                                    "total_days_in_current_month": totalDays,
                                    "total_days_worked_in_current_month": monthlyAttendanceResult.totalWorkedDays,
                                    "salary_earned": parseFloat(monthlyAttendanceResult.totalEarnedAmount.toFixed(2)),
                                    "credit_limit": rupyoCreditLimit,
                                    "amount_in_process": processInAmount,
                                    "amount_available": parseFloat(monthlyAttendanceResult.availableAmount.toFixed(2)),
                                    "remaining_credit_limit": parseFloat(rupyoCreditLimit - monthlyTransactionResult.totalAmountWithdrawn.toFixed(2)),
                                    "total_amount_withdrawn": parseFloat(monthlyTransactionResult.totalAmountWithdrawn.toFixed(2)),
                                    "total_net_salary": parseFloat(employeeResult.net_salary)
                                },
                                "attendance": {
                                    "hours_spent_today": hoursSpentToday,
                                    "absents_this_month": monthlyAttendanceResult.thisMonthAbsents,
                                    "leaves_this_month": monthlyAttendanceResult.thisMonthLeaves,
                                    "missed_punch_this_month": monthlyAttendanceResult.thisMonthMissedPunch,
                                }
                            }

                            printLogger(2, actualWorkingHourData, 'attendance');

                            let showMessage = message.punchedOut();

                            // Late message
                            if (lateMessage === true) {
                                showMessage = message.punchedOutAfter2Hours();
                            }

                            return response(res, 200, true, showMessage, actualWorkingHourData);
                        }
                    }
                }
                else {

                    // let dataResult = [{
                    //     "value": '',
                    //     "msg": message.yourCompanyNotActive(),
                    //     "param": "",
                    //     "location": ""
                    // }]
                    // printLogger(0, dataResult, 'employee');
                    // return response(res, 200, false, message.yourCompanyNotActive(), dataResult);
                    throw errData(200, message.yourCompanyNotActive(), null);
                }
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
        printLogger(0, `Error:- ${error}`, 'attendance');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Attendance list (For all)
exports.attendanceList = async (req, res, next) => {
    try {

        let reqBody = req.body;
        let companyId = req.userData.role_id === enumValue.employerRoleId ? req.userData.company_id : reqBody.company_id;
        reqBody.employee_id = req.userData.role_id === enumValue.employeeRoleId ? req.userData._id : reqBody.employee_id;

        // Attendance list
        let listResults = await attendanceModel.attendanceList(reqBody, companyId);

        // let present = listResults.result[0].present[0] === null || listResults.result[0].present[0] === undefined ? 0 : listResults.result[0].present[0].status;
        // let absent = listResults.result[0].absent[0] === null || listResults.result[0].absent[0] === undefined ? 0 : listResults.result[0].absent[0].status;
        // let half_day = listResults.result[0].half_day[0] === null || listResults.result[0].half_day[0] === undefined ? 0 : listResults.result[0].half_day[0].status;
        // let leave = listResults.result[0].leave[0] === null || listResults.result[0].leave[0] === undefined ? 0 : listResults.result[0].leave[0].status;
        // let missed_punch = listResults.result[0].missed_punch[0] === null || listResults.result[0].missed_punch[0] === undefined ? 0 : listResults.result[0].missed_punch[0].status;
        // let listData = listResults.result[0].list[0] === null || listResults.result[0].list[0] === undefined ? [] : listResults.result[0].list;


        let result = {
            "total": listResults.total,
            "present": 0, //present,
            "absent": 0, //absent,
            "half_day": 0, // half_day,
            "leave": 0, //leave,
            "weekly_holiday": 0, // weekly_holiday,
            "missed_punch": 0, // missed_punch,
            "_listResult": listResults.result
        };

        printLogger(2, result, 'attendance');
        return response(res, 200, true, message.dataFound(), result);
    }
    catch (error) {

        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, `Error:- ${error}`, 'attendance');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Change employee attendance status
exports.editAttendance = async (req, res, next) => {
    try {

        let reqBody = req.body;
        let today = moment().utc().format("YYYY-MM-DD");
        let punch_in;
        let punch_out;
        let actualWorkingHour;
        let changeData;
        let shiftStartTime;
        let shiftEndTime;

        let oldAttendanceData = await attendanceModel.findAttendance(reqBody._id);

        if (oldAttendanceData === null) {

            // let dataResult = [{
            //     "value": "",
            //     "msg": message.noDataFound(),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(0, dataResult, 'attendance');
            // return response(res, 200, false, message.noDataFound(), dataResult);
            throw errData(200, message.noDataFound(), null);
        }

        // Check old attendance date
        // Can not change today attendance
        let oldAttendanceDate = moment(oldAttendanceData.created_at).utc().format("YYYY-MM-DD");

        if (oldAttendanceDate === today) {

            // let dataResult = [{
            //     "value": "",
            //     "msg": message.cantChangeTodaysAttendance(),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(0, oldAttendanceDate, 'attendance');
            // return response(res, 200, false, message.cantChangeTodaysAttendance(), dataResult);
            throw errData(200, message.cantChangeTodaysAttendance(), null);
        }
        else {

            // Update attendance
            let statusResult = await attendanceModel.editAttendance(reqBody, req.userData);

            // Get workshift data
            let workshiftData = { "work_shift_id": statusResult.work_shift_id };

            let workshiftResult = await workshiftModel.findWorkshift(workshiftData);

            if (workshiftResult === null || workshiftResult === undefined) {

                printLogger(0, workshiftResult, 'attendance');
                // return response(res, 200, false, message.workShiftNotFound(), "");
                throw errData(200, message.workShiftNotFound(), null);
            }
            else {

                shiftStartTime = workshiftResult.shift_start_time;
                shiftEndTime = workshiftResult.shift_end_time;
            }

            // Set shift start time and shift end time
            let _shiftStartTime = moment.utc(today + " " + shiftStartTime);
            let _shiftEndTime = moment.utc(today + " " + shiftEndTime);


            if (_shiftEndTime < _shiftStartTime) {
                _shiftEndTime = moment.utc(today + " " + shiftEndTime).add(1, "days");
            }


            // Calculate actual working hour using moment (shift end time and shift start time)
            let punchHours = moment.duration(_shiftEndTime.diff(_shiftStartTime)).hours();
            let punchMinutes = moment.duration(_shiftEndTime.diff(_shiftStartTime)).minutes();
            let _shiftHours = punchHours;
            let _shiftMinutes = punchMinutes;


            // Add status and updated_by in statusResult
            statusResult.status = reqBody.status;
            statusResult.updated_by = req.userData._id

            // If status is absent or leave punchIn, punchOut are null and actualWorkingHour is 0
            if (statusResult.status === enumValue.absentStatus || statusResult.status === enumValue.leaveStatus) {
                changeData = {
                    "_id": reqBody._id,
                    "punchIn": null,
                    "punchOut": null,
                    "actualWorkingHour": {
                        "hours": 0,
                        "minutes": 0
                    },
                    "todayDeficitHour": {
                        "hours": _shiftHours,
                        "minutes": _shiftMinutes
                    },
                    "todayLateIn": 0,
                    "todayEarlyOut": 0
                }
            }

            // If status is present set shift start time / shift end time as punch in / punch out time and set actualWorkingHour
            else if (statusResult.status === enumValue.presentStatus) {

                // Punch in, punch out time in moment
                punch_in = _shiftStartTime;
                punch_out = _shiftEndTime;


                changeData = {
                    "_id": reqBody._id,
                    "punchIn": punch_in,
                    "punchOut": punch_out,
                    "actualWorkingHour": {
                        "hours": punchHours,
                        "minutes": punchMinutes
                    },
                    "todayDeficitHour": {
                        "hours": 0,
                        "minutes": 0
                    },
                    "todayLateIn": 0,
                    "todayEarlyOut": 0
                }
            }


            // If status is MISSED PUNCH set shift start time / shift end time as punch in / punch out time and set actualWorkingHour
            else if (statusResult.status === enumValue.missedPunch) {

                // Punch in, punch out time in moment
                punch_in = _shiftStartTime;
                punch_out = _shiftEndTime;


                changeData = {
                    // "status": changeData.status,
                    "_id": reqBody._id,
                    "punchIn": null, // punch_in,
                    "punchOut": null, //punch_out,
                    "actualWorkingHour": {
                        "hours": 0,
                        "minutes": 0,
                    },
                    "todayDeficitHour": {
                        "hours": 0,
                        "minutes": 0
                    },
                    "todayLateIn": 0,
                    "todayEarlyOut": 0
                }
            }


            // If status halfday set shift stsrt time as punch in and set half time of shift duration as punch out time
            else if (statusResult.status === enumValue.halfDayStatus) {

                /* Calculate actual working hour */
                let wholeWorkingTime = parseInt(((punchHours * 60) + punchMinutes) / 2);

                let _punchOutTime = moment(today + " " + shiftStartTime).add(wholeWorkingTime, "minutes");

                punch_in = _shiftStartTime;
                punch_out = _punchOutTime;

                // set actual working hour
                punchHours = parseInt(wholeWorkingTime / 60);
                punchMinutes = parseInt(wholeWorkingTime % 60);

                // Convert shift time into minutes
                let shiftTime = (_shiftHours * 60) + _shiftMinutes;

                /* Calculate today deficit hours */
                // Deficit hours
                let deficitTime = parseInt(shiftTime - wholeWorkingTime);

                // Convert deficit minuts into hours and minutes
                let deficitH = parseInt(deficitTime / 60);

                let deficitM = parseInt(deficitTime % 60);

                changeData = {
                    // "status": changeData.status,
                    "_id": reqBody._id,
                    "punchIn": punch_in,
                    "punchOut": punch_out,
                    "actualWorkingHour": {
                        "hours": punchHours,
                        "minutes": punchMinutes
                    },
                    "todayDeficitHour": {
                        "hours": deficitH,
                        "minutes": deficitM
                    },
                    "todayLateIn": 0,
                    "todayEarlyOut": 1
                }
            }

            // If status is HOLIDAY or WEEKLY OFF set  punch in / punch out time as NULL and set actualWorkingHour as 0
            else if (statusResult.status === enumValue.weeklyOffStatus || statusResult.status === enumValue.paidHolidayStatus || statusResult.status === enumValue.unpaidHolidayStatus) {

                changeData = {

                    "_id": reqBody._id,
                    "punchIn": null,
                    "punchOut": null,
                    "actualWorkingHour": {
                        "hours": 0,
                        "minutes": 0,
                    },
                    "todayDeficitHour": {
                        "hours": 0,
                        "minutes": 0
                    },
                    "todayLateIn": 0,
                    "todayEarlyOut": 0
                }
            }

            // If user entered wrong status
            else {

                printLogger(0, message.statusWrong(), 'attendance');
                // return response(res, 200, false, message.statusWrong(), "");
                throw errData(200, message.statusWrong(), null);
            }

            // Update attendance data 
            let updateAttendanceResult = await updateAttendance(oldAttendanceData, changeData, statusResult, req.userData._id);

            // Send push notification
            let reqData = { "_id": oldAttendanceData.employee_id };

            let result = await employeesModel.signInAdvance(reqData);
            employeeResult = result[0]

            // Update earned amount and attendances counts
            await updateEarnedAmount_attendanceCountes(employeeResult);

            // If employee have firebase_devide_token
            if (employeeResult.firebase_device_token) {

                let notificationData = {
                    "registrationIds": `["${employeeResult.firebase_device_token}"]`,
                    "body": `"Your attendance has been updated by your employer. Please click here for more information"`,
                    "title": `"Attendance Updated"`,
                    "notificationType": `"ATTENDANCE_UPDATED"`
                }
                let pushNotificationResult = sendPushNotification(notificationData);
            }

            let smsData = {
                "employee_name": employeeResult.first_name + " " + employeeResult.last_name,
                "employee_id": employeeResult.employee_id
            }

            // Send SMS to employee
            let awsSMS = await sendSMS("+91" + employeeResult.mobile_number, message.updatedAttendance(smsData));

            printLogger(2, updateAttendanceResult, 'attendance');
            return response(res, 200, true, message.updateSuccessfully('Employee attendance'), updateAttendanceResult);
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, `Error:- ${error}`, 'attendance');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// // Short methods
// Employee punch in
async function punchInAction(employeeResult) {

    // Attendance data
    let attendanceData = {
        "first_name": employeeResult.first_name,
        "middle_name": employeeResult.middle_name,
        "last_name": employeeResult.last_name,
        "company_id": employeeResult.company_id,
        "company_name": employeeResult.company_name,
        "employee_id": employeeResult._id,
        "employee_auto_id": employeeResult.employee_id,
        "punch_in": employeeResult.punchinTime,
        "punch_out": null,
        "status": employeeResult.lateMessage === true ? enumValue.missedPunch : enumValue.presentStatus,
        "work_shift_id": employeeResult.work_shift_id,
        "work_shift_name": employeeResult.work_shift_name
    }

    // Employee punch in
    let result = await attendanceModel.punchIn(attendanceData);

    let _result = {
        "in": moment(result.punch_in),
        "out": null
    }

    if (employeeResult.lateMessage === true) {

        // Notications Calling and send
        let punchoutData = { time: moment(_result.in).format('YYYY-MM-DD HH:MM:SS a') }

        // Employee inform app 
        // Late punch in notification
        let notificationParams = {
            "employee_name": employeeResult.first_name + " " + employeeResult.last_name,
            "employee_id": employeeResult.employee_id
        }

        let missedPunchNotification = message.punchedInAfter30Minutes(notificationParams);

        // Notification for employee
        let notificationsData = {
            "user_id": employeeResult._id,
            "company_id": employeeResult.company_id,
            "message": missedPunchNotification,
            "resource_type": enumValue.attendanceStatus,
            "status": enumValue.missedPunch,
            "is_read": false,
            "time": moment(result.punch_in).valueOf(),
            "for_notifications": enumValue.employeeRoleId,
            "created_by": employeeResult._id
        };

        let _notificationData = [];
        _notificationData.push(notificationsData)

        // Save notifications
        let notificationResult = await notificationsModel.bulkInsert(_notificationData);
    }

    return _result
}


// Manage attendance atatus
async function manageStatus(workshiftResult, actualWorkingHours, reqBody) {
    try {

        // console.log("Manage status -> workshiftResult:- ", workshiftResult)

        let status
        let today = moment().utc().format("YYYY-MM-DD");
        let todayLateIn = 0;
        let todayEarlyOut = 0;
        let punchIn = moment(reqBody.punchinTime);
        let punchOut = moment(reqBody.punchoutTime);
        let shiftStartTime = moment.utc(today + " " + workshiftResult.shift_start_time);
        let shiftEndTime = moment.utc(today + " " + workshiftResult.shift_end_time);


        // Calculate shift hours using moment
        let shiftHours = Math.abs(moment.duration(shiftEndTime.diff(shiftStartTime)).hours());
        let shiftMinutes = Math.abs(moment.duration(shiftEndTime.diff(shiftStartTime)).minutes());

        // Late in
        if (moment.duration(punchIn.diff(shiftStartTime)).hours() >= 1) {
            todayLateIn = 1;
        }

        // Early out
        if (moment.duration(shiftEndTime.diff(punchOut)).hours() >= 1) {
            todayEarlyOut = 1;
        }

        // Convert actual working time into minutes
        let actualWorkingTime = (actualWorkingHours.hours * 60) + actualWorkingHours.minutes;

        // Convert shift time into minutes
        let shiftTime = (shiftHours * 60) + shiftMinutes;

        /* Calculate today deficit hours */
        // Deficit hours
        let deficitTime = parseInt(shiftTime - actualWorkingTime);

        // Convert deficit minuts into hours and minutes
        let deficitH = parseInt(deficitTime / 60);

        let deficitM = parseInt(deficitTime % 60);



        let todayDeficitHours = {
            "hours": deficitH,
            "minutes": deficitM
        }

        // Actual working hours greater than equal shift hours
        if (actualWorkingTime >= (shiftTime - 59)) {

            status = enumValue.presentStatus;     //present
        }

        // Actual working hours less than equal shift hours -1 and greater than equal half time of shift hours 
        else if (actualWorkingTime >= (shiftTime / 2) && actualWorkingTime <= (shiftTime - 60)) {

            status = enumValue.halfDayStatus;       //halfday
        }

        // Actual working hours less than half time of shift hours  
        else if (actualWorkingTime < (shiftTime / 2)) {

            status = enumValue.absentStatus;       //absent
        }

        // Set missed punch status if missed punch
        if (reqBody.status === enumValue.missedPunch) {

            // console.log('missedpunch IF')
            status = enumValue.missedPunch;
        }


        // Check open shift
        if (workshiftResult.is_open_shift && workshiftResult.is_open_shift === true) {

            // console.log("manageStatus Open shift : TRUE");

            status = enumValue.presentStatus,
                todayLateIn = 0,
                todayEarlyOut = 0,
                todayDeficitHours = {
                    "hours": 0,
                    "minutes": 0
                }
        }

        updateData = {
            "punchin_id": reqBody.punchin_id,
            "punchIn": reqBody.punchinTime,
            "punchOut": reqBody.punchoutTime,
            "actualWorkingHours": actualWorkingHours,
            "status": status,
            "todayLateIn": todayLateIn,
            "todayEarlyOut": todayEarlyOut,
            "todayDeficitHours": todayDeficitHours
        };

        return updateData;
    }
    catch {
        return 0;
    }
}


// Update actual working hours and employee attendance status
async function actualWorkingHour(updateData) {

    // Update actual working hours and employee attendance status
    let actualWorkingHoursResult = await attendanceModel.actualWorkingHour(updateData)

    // Add actual_working_hour and status in actualWorkingHoursResult
    actualWorkingHoursResult.actual_working_hours = updateData.actualWorkingHours;
    actualWorkingHoursResult.status = updateData.status;
    actualWorkingHoursResult.today_late_in = updateData.todayLateIn;
    actualWorkingHoursResult.today_early_out = updateData.todayEarlyOut;
    actualWorkingHoursResult.today_deficit_hours = updateData.todayDeficitHours;

    // console.log("actualWorkingHour -> actualWorkingHoursResult:- ", actualWorkingHoursResult)

    // Attendance data send to monthlyAttendanceController on daily basis
    await monthlyAttendanceController.saveMonthlyAttendance(actualWorkingHoursResult);

    let _result = {
        "in": moment(actualWorkingHoursResult.punch_in),
        "out": moment(actualWorkingHoursResult.punch_out)
    }

    return _result
};


//  Update attendance
async function updateAttendance(oldAttendanceData, changeData, statusResult, loginId) {
    let data;
    try {
        let updatedResult = await attendanceModel.updateAttendance(changeData)

        updatedResult.punch_in = changeData.punchIn;
        updatedResult.punch_out = changeData.punchOut;
        updatedResult.actual_working_hours = changeData.actualWorkingHour;
        updatedResult.today_deficit_hours = changeData.todayDeficitHour;
        updatedResult.today_late_in = changeData.todayLateIn;
        updatedResult.today_early_out = changeData.todayEarlyOut;

        // Attandance Alteration/ override alert by employer to employee
        // Employee Attandance modified by Rupyo Admin
        // Notications Calling and send
        let attendanceUpdate = statusResult.status === enumValue.presentStatus ? "Present" : statusResult.status === enumValue.absentStatus ? "Absent" : statusResult.status === enumValue.leaveStatus ? "Leave" : statusResult.status === enumValue.halfDayStatus ? "Half Day" : statusResult.status === enumValue.missedPunch ? "Missed Punch" : statusResult.status === enumValue.paidHolidayStatus ? "Paid Holiday" : statusResult.status === enumValue.unpaidHolidayStatus ? "Unpaid Holiday" : statusResult.status === enumValue.weeklyOffStatus ? "Weekly Off" : " ";

        let employeeData = {
            "first_name": updatedResult.first_name + " " + updatedResult.middle_name + " " + updatedResult.last_name,
            "created_at": moment.utc(updatedResult.created_at).format('YYYY-MM-DD'), //.format('YYYY-MM-DD hh:mm a'),
            "attendance_update": attendanceUpdate
        };

        let punchOut = moment(changeData.punchOut).valueOf();

        // Employee inform app    
        let _status = statusResult.status;
        let _time = statusResult.status === enumValue.presentStatus ? punchOut : statusResult.status === enumValue.absentStatus ? " " : statusResult.status === enumValue.leaveStatus ? " " : statusResult.status === enumValue.halfDayStatus ? punchOut : statusResult.status === enumValue.missedPunch ? " " : statusResult.status === enumValue.weeklyOffStatus ? " " : statusResult.status === enumValue.paidHolidayStatus ? " " : statusResult.status === enumValue.unpaidHolidayStatus ? " " : punchOut;

        // Employee notifications send in app
        let employeeNotifications = notification.employeeAttandanceModifiedByRupyoAdmin(employeeData);

        // Notification store employee
        let notificationsData = {
            "user_id": updatedResult.employee_id,
            "company_id": updatedResult.company_id,
            "message": employeeNotifications,
            "resource_type": enumValue.attendanceStatus,
            "request_id": updatedResult._id,
            "status": _status,
            "time": _time,
            "for_notifications": enumValue.employeeRoleId,
            "created_by": loginId,
        };
        notificationsController.saveNotification(notificationsData);

        // Update in monthly attendance collection
        await monthlyAttendanceController.updateMonthlyAttendance(oldAttendanceData, updatedResult);

        data = {

            "_id": changeData._id,
            "status": updatedResult.status,
            "punch_in": changeData.punchIn,
            "punch_out": changeData.punchOut,
            "actual_working_hours": changeData.actualWorkingHour
        }

        if (statusResult.status === enumValue.absentStatus || statusResult.status === enumValue.leaveStatus) {

            updatedResult.punch_in = changeData.punchIn,
                updatedResult.punch_out = changeData.punchOut,
                updatedResult.actual_working_hours = changeData.actualWorkingHour
        }

        return data
    }
    catch (error) {

        return data
    }
};