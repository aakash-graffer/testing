const { validationResult } = require('express-validator');
const moment = require('moment');
const momentWeekdaysIn = require('moment-weekdaysin');
const util = require('util');
const { ObjectId } = require('mongodb');

const monthlyAttendanceModel = require('../models/monthlyAttendance.model');
const employerModel = require('../models/employer.model');
const holidayModel = require('../models/holiday.model');
const workshiftModel = require('../models/workshift.model');
const notificationsController = require("../controllers/notifications.controller");
const { message, notification, printLogger, enumValue, errData } = require('../core/utility');
const { response } = require('../core/responseformat');


// Save monthly attendance data
exports.saveMonthlyAttendance = async (attendanceData) => {
    try {

        printLogger(2, "***********************  Save Monthly Attendance  ***********************", 'attendance');
        printLogger(2, `saveMonthlyAttendance -> attendanceData :- ${util.inspect(attendanceData)}`, 'attendance');

        let present = 0;
        let absent = 0;
        let halfDay = 0;
        let leave = 0;
        let missedPunch = 0;
        let daysWorked = 0;
        let weeklyOff = 0;
        let paidHoliday = 0;
        let unpaidHoliday = 0;
        let lateIn = 0;
        let earlyOut = 0;
        let punchIn;
        let punchOut;
        let today = moment().utc().format("YYYY-MM-DD");
        let year = moment().utc().format('YYYY');
        let month = moment().utc().format('MM');

        if (attendanceData.punch_in === null || attendanceData.punch_out === null) {

            punchIn = moment();
            punchOut = moment();
            today = moment().utc().format("YYYY-MM-DD");
            year = moment().utc().format('YYYY');
            month = moment().utc().format('MM');
        }
        else {

            punchIn = moment(attendanceData.punch_in);
            punchOut = moment(attendanceData.punch_out);
            year = moment(punchIn).format('YYYY');
            month = moment(punchIn).format('MM');
        }


        // Deficit hours
        let todayDeficitTime = (attendanceData.today_deficit_hours.hours * 60) + attendanceData.today_deficit_hours.minutes;


        // Manage status
        if (attendanceData.status === enumValue.presentStatus) {

            present = 1;
            daysWorked = 1;
        }
        else if (attendanceData.status === enumValue.absentStatus) {

            absent = 1;
        }
        else if (attendanceData.status === enumValue.missedPunch) {

            missedPunch = 1;
        }
        else if (attendanceData.status === enumValue.halfDayStatus) {

            halfDay = 1;
            daysWorked = 1;
        }
        else if (attendanceData.status === enumValue.leaveStatus) {

            leave = 1;
        }
        else if (attendanceData.status === enumValue.weeklyOffStatus) {

            weeklyOff = 1;
        }
        else if (attendanceData.status === enumValue.paidHolidayStatus) {

            paidHoliday = 1;
        }
        else if (attendanceData.status === enumValue.unpaidHolidayStatus) {

            unpaidHoliday = 1;
        }

        // Object for findMonthlyAttendance field
        let checkData = {
            "year": year,
            "month": month,
            "employee_id": attendanceData.employee_id
        };

        // Find monthly attendance data by year, month and employee id
        let findResult = await monthlyAttendanceModel.findMonthlyAttendanceByYearMonth(checkData);
        printLogger(2, `saveMonthlyAttendance  findResult:-  ${util.inspect(findResult)}`, 'attendance');


        /* Create new monthly attendace data */
        // If findResult is undefined or null. Save new monthly attendance data
        if (findResult === null || findResult === undefined) {

            let calendar = [];

            let calendarData = {
                "date": moment(attendanceData.created_at).valueOf(),
                "type": attendanceData.status
            };

            calendar.push(calendarData);

            let monthlyData = {
                "employee_id": attendanceData.employee_id,
                "company_id": attendanceData.company_id,
                "year": year,
                "month": month,
                "presents": present,
                "absents": absent,
                "half_days": halfDay,
                "leaves": leave,
                "missed_punch": missedPunch,
                "weekly_off": weeklyOff,
                "paid_holiday": paidHoliday,
                "unpaid_holiday": unpaidHoliday,
                "late_in": attendanceData.today_late_in,
                "early_out": attendanceData.today_early_out,
                "days_worked": daysWorked,
                "deficit_hours": attendanceData.today_deficit_hours,
                "total_work_hours": attendanceData.actual_working_hours,
                "average_work_hours": attendanceData.actual_working_hours,
                "calendar": calendar
            }

            // Save new monthly attendance data
            let saveResult = await monthlyAttendanceModel.createMonthlyAttendance(monthlyData);

            printLogger(2, "***********************  createMonthlyAttendance  ***********************", 'attendance');
            printLogger(2, `saveResult:-  ${saveResult}`, 'attendance');
        }

        /* Update monthly attendance data */
        else {

            findResult.presents = findResult.presents === undefined ? 0 : findResult.presents;
            findResult.absents = findResult.absents === undefined ? 0 : findResult.absents;
            findResult.half_days = findResult.half_days === undefined ? 0 : findResult.half_days;
            findResult.leaves = findResult.leaves === undefined ? 0 : findResult.leaves;
            findResult.missed_punch = findResult.missed_punch === undefined ? 0 : findResult.missed_punch;
            findResult.weekly_off = findResult.weekly_off === undefined ? 0 : findResult.weekly_off;
            findResult.paid_holiday = findResult.paid_holiday === undefined ? 0 : findResult.paid_holiday;
            findResult.unpaid_holiday = findResult.unpaid_holiday === undefined ? 0 : findResult.unpaid_holiday;


            let createdAtDate = moment(attendanceData.created_at).format('YYYY-MM-DD');

            let todayStartTime = new Date(createdAtDate + "T00:00:00.000Z");
            let todayEndTime = new Date(createdAtDate + "T23:59:59.000Z");

            // Get calendar data from findResult
            let calendar = findResult.calendar;

            let notCreateData = false;
            for (let i = 0; i < calendar.length; i++) {

                if (moment.utc(calendar[i].date) >= todayStartTime && moment.utc(calendar[i].date) <= todayEndTime) {

                    notCreateData = true;
                }
            }

            //  Not create data check
            if (notCreateData === false) {

                let calendarData = {
                    "date": moment(attendanceData.created_at).valueOf(),
                    "type": attendanceData.status
                };

                // Updated data push to exist calendar
                calendar.push(calendarData);

                /* Calculate total work time */
                // Old work hours
                let oldWorkHours = findResult.total_work_hours.hours;
                let oldWorkMinutes = findResult.total_work_hours.minutes;
                let oldWorkTime = (oldWorkHours * 60) + oldWorkMinutes;

                // New work hours
                let newWorkHours = attendanceData.actual_working_hours.hours;
                let newWorkMinutes = attendanceData.actual_working_hours.minutes;
                let newWorkTime = (newWorkHours * 60) + newWorkMinutes;

                // Add Old work hours and new work hours
                let updatedWorkTime = parseInt(oldWorkTime + newWorkTime);

                // Convert updatedWorkTime minuts into hours and minutes
                let updatedWorkH = parseInt(updatedWorkTime / 60);
                let updatedWorkM = parseInt(updatedWorkTime % 60);

                // Update total work hours and days worked
                let _totalWorkHours = {
                    "hours": updatedWorkH,
                    "minutes": updatedWorkM
                };

                let _daysWorked = findResult.days_worked + daysWorked;

                /* Calculate average work time */
                let _averageWorkHours = {
                    "hours": 0,
                    "minutes": 0
                };

                if (_daysWorked > 0) {


                    // Calculate average work hours
                    let averageWorkTime = parseFloat(updatedWorkTime / _daysWorked);

                    // Convert updatedWorkTime minuts into hours and minutes
                    let averageWorkH = parseInt(averageWorkTime / 60);
                    let averageWorkM = parseInt(averageWorkTime % 60);

                    _averageWorkHours = {
                        "hours": averageWorkH,
                        "minutes": averageWorkM
                    };
                }

                /* Calculate deficit work time */
                let oldDeficitHours = 0;
                let oldDeficitMinutes = 0;

                if (findResult.deficit_hours.hours) {

                    oldDeficitHours = findResult.deficit_hours.hours;
                }

                if (findResult.deficit_hours.minutes) {

                    oldDeficitMinutes = findResult.deficit_hours.minutes;
                }

                let oldDeficitTime = parseInt((oldDeficitHours * 60) + oldDeficitMinutes);

                let updateDeficitTime = parseInt(oldDeficitTime + todayDeficitTime);

                // Convert deficit minuts into hours and minutes
                let deficitH = parseInt(updateDeficitTime / 60);
                let deficitM = parseInt(updateDeficitTime % 60);

                let _deficitHours = {
                    "hours": deficitH,
                    "minutes": deficitM
                }


                let updateMonthlyAttendance = {
                    // Manage fields
                    "monthly_attendance_id": findResult._id,
                    "presents": findResult.presents + present,
                    "absents": findResult.absents + absent,
                    "half_days": findResult.half_days + halfDay,
                    "leaves": findResult.leaves + leave,
                    "missed_punch": findResult.missed_punch + missedPunch,
                    "weekly_off": findResult.weekly_off + weeklyOff,
                    "paid_holiday": findResult.paid_holiday + paidHoliday,
                    "unpaid_holiday": findResult.unpaid_holiday + unpaidHoliday,
                    "late_in": findResult.late_in + attendanceData.today_late_in,
                    "early_out": findResult.early_out + attendanceData.today_early_out,
                    "days_worked": _daysWorked,
                    "deficit_hours": {
                        "hours": _deficitHours.hours,
                        "minutes": _deficitHours.minutes
                    },
                    "total_work_hours": {
                        "hours": _totalWorkHours.hours,
                        "minutes": _totalWorkHours.minutes
                    },
                    "average_work_hours": {
                        "hours": _averageWorkHours.hours,
                        "minutes": _averageWorkHours.minutes
                    },
                    "calendar": calendar
                }


                // Update monthly attendance data on daily basis
                let updateMonthlyAttendanceResult = await monthlyAttendanceModel.updateMonthlyAttendance(updateMonthlyAttendance)

                printLogger(2, "***********************  updateMonthlyAttendanceResult  ***********************", 'attendance');
                printLogger(2, `updateMonthlyAttendanceResult:-  ${util.inspect(updateMonthlyAttendanceResult)}`, 'attendance');
            }
        }
    }
    catch (error) {

        printLogger(0, "***********************  ERROR  ***********************", 'attendance');
        printLogger(0, error, 'attendance');
    }
};


// Show monthly attendance data
exports.showMonthlyAttendance = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {

            printLogger(0, "***********************  Validations Error  ***********************", 'attendance');
            printLogger(0, errors.array(), 'attendance');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            // Current year and current month
            let year = moment().utc().format("YYYY");
            let month = moment().utc().format("M");

            let reqQuery = req.query;
            let reqBody = req.body;
            let currentMonth = false;

            if (reqQuery.year === year && reqQuery.month === month) {
                currentMonth = true;
            }

            // If client sent year, month
            if (reqQuery.year && reqQuery.month) {

                year = reqQuery.year,
                    month = reqQuery.month
            }

            let reqFilter = {
                "employee_id": req.userData._id,
                "year": year,
                "month": month
            }


            // Get Calendar data
            let result = await monthlyAttendanceModel.showMonthlyAttendance(reqFilter);
            let _result

            if (result === null) {

                if (currentMonth) {

                    // Check holiday by company id and year
                    let checkData = {
                        "company_id": req.userData.company_id,
                        "year": year
                    }

                    let resultCalendar = [];

                    // Get Holiday data
                    let holidayResult = await holidayModel.findByCompanyIdAndYear(checkData);
                    // console.log("holidayResult:- ", holidayResult)

                    if (holidayResult) {
                        let startDay = moment(`${year}-${month}-01`).format('YYYY-MM-DD');
                        let lastDay = moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');

                        let startDate = new Date(startDay + "T00:00:00.000Z");
                        let endDate = new Date(lastDay + "T23:59:59.000Z");

                        if (holidayResult.holidays.length > 0) {

                            for (let i = 0; i < holidayResult.holidays.length; i++) {
                                if (holidayResult.holidays[i].date >= startDate && holidayResult.holidays[i].date < endDate) {

                                    resultCalendar.push({
                                        date: moment(holidayResult.holidays[i].date).valueOf(),
                                        type: holidayResult.holidays[i].is_paid === true ? enumValue.paidHolidayStatus : enumValue.unpaidHolidayStatus
                                    })
                                }
                            }
                        }
                    }


                    // Get weekly off data
                    let companyResult;
                    if (req.userData.company_id === undefined || req.userData.company_id === null) {

                        companyResult = {
                            weekly_holiday: []
                        }
                    }
                    else {
                        companyResult = await employerModel.findCompany({ company_id: ObjectId(req.userData.company_id) });
                    }

                    if (companyResult.weekly_holiday.length > 0) {

                        for (let i = 0; i < companyResult.weekly_holiday.length; i++) {

                            let dayName = companyResult.weekly_holiday[i] == 1 ? 'Monday' : companyResult.weekly_holiday[i] == 2 ? 'Tuesday' : companyResult.weekly_holiday[i] == 3 ? 'Wednesday' : companyResult.weekly_holiday[i] == 4 ? 'Thursday' : companyResult.weekly_holiday[i] == 5 ? 'Friday' : companyResult.weekly_holiday[i] == 6 ? 'Saturday' : companyResult.weekly_holiday[i] == 7 ? 'Sunday' : 'Sunday';

                            let weekOffDate = momentWeekdaysIn().utc().weekdaysInMonth(dayName);

                            for (let j = 0; j < weekOffDate.length; j++) {

                                resultCalendar.push({
                                    date: moment(weekOffDate[j]).valueOf(),
                                    type: enumValue.weeklyOffStatus
                                })
                            }
                        }
                    }


                    let weeklyOffCount = 0;
                    let paidHolidayCount = 0;
                    let unpaidHolidayCount = 0;

                    // console.log("result:- ", result)
                    if (resultCalendar) {
                        for (let i = 0; i < resultCalendar.length; i++) {

                            if (resultCalendar[i].type == enumValue.weeklyOffStatus) {
                                weeklyOffCount = weeklyOffCount + 1;
                            }

                            if (resultCalendar[i].type == enumValue.paidHolidayStatus) {
                                paidHolidayCount = paidHolidayCount + 1;
                            }

                            if (resultCalendar[i].type == enumValue.unpaidHolidayStatus) {
                                unpaidHolidayCount = unpaidHolidayCount + 1;
                            }
                        }
                    }


                    _result = {
                        "absents": 0,
                        "leaves": 0,
                        "half_days": 0,
                        "missed_punch": 0,
                        "weekly_off": 0,
                        "paid_holiday": 0,
                        "unpaid_holiday": 0,
                        "late_in": 0,
                        "early_out": 0,
                        "days_worked": 0,
                        "deficit_hours": {
                            "hours": 0,
                            "minutes": 0
                        },
                        "total_work_hours": {
                            "hours": 0,
                            "minutes": 0
                        },
                        "average_work_hours": {
                            "hours": 0,
                            "minutes": 0
                        },
                        "weekly_holiday": [],
                        "calendar": resultCalendar
                    }

                    printLogger(2, "*********************** SHOW MONTHLY ATTENDANCE _result  ***********************", 'attendance');
                    printLogger(2, util.inspect(_result), 'attendance');
                    return response(res, 200, true, message.dataFound(), _result);
                }
                else {
                    _result = {
                        "absents": null,
                        "leaves": null,
                        "half_days": null,
                        "missed_punch": null,
                        "weekly_off": null,
                        "paid_holiday": null,
                        "unpaid_holiday": null,
                        "late_in": null,
                        "early_out": null,
                        "days_worked": null,
                        "deficit_hours": {
                            "hours": null,
                            "minutes": null
                        },
                        "total_work_hours": {
                            "hours": null,
                            "minutes": null
                        },
                        "average_work_hours": {
                            "hours": null,
                            "minutes": null
                        },
                        "weekly_holiday": [],
                        "calendar": [
                            {
                                "date": null,
                                "type": null
                            }
                        ]
                    }

                    printLogger(2, "*********************** SHOW MONTHLY ATTENDANCE _result  ***********************", 'attendance');
                    printLogger(2, util.inspect(_result), 'attendance');
                    // return response(res, 200, false, message.noDataFound(), _result);
                    throw errData(200, message.noDataFound(), _result);
                }
            }
            else {

                // Check holiday by company id and year
                let checkData = {
                    "company_id": req.userData.company_id,
                    "year": year
                }

                // Get Holiday data
                let holidayResult = await holidayModel.findByCompanyIdAndYear(checkData);
                // console.log("holidayResult:- ", holidayResult)

                if (holidayResult) {
                    let startDay = moment(`${year}-${month}-01`).format('YYYY-MM-DD');
                    let lastDay = moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');

                    let startDate = new Date(startDay + "T00:00:00.000Z");
                    let endDate = new Date(lastDay + "T23:59:59.000Z");

                    if (holidayResult.holidays.length > 0) {

                        for (let i = 0; i < holidayResult.holidays.length; i++) {
                            if (holidayResult.holidays[i].date >= startDate && holidayResult.holidays[i].date < endDate) {

                                result.calendar.push({
                                    date: moment(holidayResult.holidays[i].date).valueOf(),
                                    type: holidayResult.holidays[i].is_paid === true ? enumValue.paidHolidayStatus : enumValue.unpaidHolidayStatus
                                })
                            }
                        }
                    }
                }


                // Get weekly off data
                let companyResult;
                if (result.company_id === undefined || result.company_id === null) {

                    companyResult = {
                        weekly_holiday: []
                    }
                }
                else {
                    companyResult = await employerModel.findCompany({ company_id: ObjectId(result.company_id) });
                }


                if (companyResult.weekly_holiday.length > 0) {

                    for (let i = 0; i < companyResult.weekly_holiday.length; i++) {

                        let dayName = companyResult.weekly_holiday[i] == 1 ? 'Monday' : companyResult.weekly_holiday[i] == 2 ? 'Tuesday' : companyResult.weekly_holiday[i] == 3 ? 'Wednesday' : companyResult.weekly_holiday[i] == 4 ? 'Thursday' : companyResult.weekly_holiday[i] == 5 ? 'Friday' : companyResult.weekly_holiday[i] == 6 ? 'Saturday' : companyResult.weekly_holiday[i] == 7 ? 'Sunday' : 'Sunday';

                        let weekOffDate = momentWeekdaysIn().utc().weekdaysInMonth(dayName);

                        for (let j = 0; j < weekOffDate.length; j++) {

                            result.calendar.push({
                                date: moment(weekOffDate[j]).valueOf(),
                                type: enumValue.weeklyOffStatus
                            })
                        }
                    }
                }

                let weeklyOffCount = 0;
                let paidHolidayCount = 0;
                let unpaidHolidayCount = 0;

                // console.log("result:- ", result)
                if (result.calendar) {
                    for (let i = 0; i < result.calendar.length; i++) {

                        if (result.calendar[i].type == enumValue.weeklyOffStatus) {
                            weeklyOffCount = weeklyOffCount + 1;
                        }

                        if (result.calendar[i].type == enumValue.paidHolidayStatus) {
                            paidHolidayCount = paidHolidayCount + 1;
                        }

                        if (result.calendar[i].type == enumValue.unpaidHolidayStatus) {
                            unpaidHolidayCount = unpaidHolidayCount + 1;
                        }
                    }
                }

                _result = {
                    "absents": result.absents,
                    "leaves": result.leaves,
                    "half_days": result.half_days,
                    "missed_punch": result.missed_punch,
                    "weekly_off": weeklyOffCount,
                    "paid_holiday": paidHolidayCount,
                    "unpaid_holiday": unpaidHolidayCount,
                    "late_in": result.late_in,
                    "early_out": result.early_out,
                    "days_worked": result.days_worked,
                    "deficit_hours": result.deficit_hours,
                    "total_work_hours": result.total_work_hours,
                    "average_work_hours": result.average_work_hours,
                    "weekly_holiday": companyResult.weekly_holiday,
                    "calendar": result.calendar
                }

                printLogger(2, "*********************** SHOW MONTHLY ATTENDANCE _result  ***********************", 'attendance');
                printLogger(2, util.inspect(_result), 'attendance');
                return response(res, 200, true, message.dataFound(), _result);
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

        printLogger(0, "*********************** SHOW MONTHLY ATTENDANCE error  ***********************", 'attendance');
        printLogger(0, error, 'attendance');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Update monthly attendance data
exports.updateMonthlyAttendance = async (oldAttendanceData, updatedResult) => {
    try {

        // Get values from enum
        let presentStatus = enumValue.presentStatus;
        let absentStatus = enumValue.absentStatus;
        let halfdayStatus = enumValue.halfDayStatus;
        let leaveStatus = enumValue.leaveStatus;
        let missedPunchStatus = enumValue.missedPunch

        let year = moment(oldAttendanceData.created_at).format('YYYY');
        let month = moment(oldAttendanceData.created_at).format('M');
        let present = 0;
        let absent = 0;
        let halfDay = 0;
        let leave = 0;
        let missedPunch = 0;
        let weeklyOff = 0;
        let paidHoliday = 0;
        let unpaidHoliday = 0;
        let daysWorked = 0;
        let oldPresent = 0;
        let oldAbsent = 0;
        let oldHalfDay = 0;
        let oldLeave = 0;
        let oldMissedPunch = 0;
        let oldWeeklyOff = 0;
        let oldPaidHoliday = 0;
        let oldUnpaidHoliday = 0;
        let oldDaysWorked = 0;
        let editedLateIn = 0;
        let editedEarlyOut = 0;

        // Object for findMonthlyAttendance field
        let checkData = {
            "year": year,
            "month": month,
            "employee_id": oldAttendanceData.employee_id
        };

        // Find monthly attendance data by year, month and employee id
        let findResult = await monthlyAttendanceModel.findMonthlyAttendanceByYearMonth(checkData)



        /* DEFICIT HOURS CALCULATION */
        let editedDeficitHours = parseInt(updatedResult.today_deficit_hours.hours - oldAttendanceData.today_deficit_hours.hours);
        let editedDeficitMinutes = parseInt(updatedResult.today_deficit_hours.minutes - oldAttendanceData.today_deficit_hours.minutes);


        let updatedDeficitHours = parseInt(findResult.deficit_hours.hours + editedDeficitHours);
        let updatedDeficitMinutes = parseInt(findResult.deficit_hours.minutes + editedDeficitMinutes);


        /* WORK HOURS CALCULATION */
        let editedWorkHours = parseInt(updatedResult.actual_working_hours.hours - oldAttendanceData.actual_working_hours.hours);
        let editedWorkMinutes = parseInt(updatedResult.actual_working_hours.minutes - oldAttendanceData.actual_working_hours.minutes);

        let updatedWorkHours = parseInt(findResult.total_work_hours.hours + editedWorkHours);
        let updatedWorkMinutes = parseInt(findResult.total_work_hours.minutes + editedWorkMinutes);

        // If updatedDeficitMinutes > 59 set hours and minutes
        if (updatedDeficitMinutes > 59) {

            let addHours = parseInt(updatedDeficitMinutes / 60);
            let addMinutes = parseInt(updatedDeficitMinutes % 60);

            updatedDeficitHours = updatedDeficitHours + addHours;
            updatedDeficitMinutes = addMinutes;
        }

        let _deficitHours = {
            "hours": updatedDeficitHours,
            "minutes": updatedDeficitMinutes
        }


        // If updatedWorkMinutes > 59 set hours and minutes
        if (updatedWorkMinutes > 59) {

            let addHours = parseInt(updatedWorkMinutes / 60);
            let addMinutes = parseInt(updatedWorkMinutes % 60);

            updatedWorkHours = updatedWorkHours + addHours;
            updatedWorkMinutes = addMinutes;
        }

        let _totalWorkHours = {
            "hours": updatedWorkHours,
            "minutes": updatedWorkMinutes
        }

        editedLateIn = parseInt(updatedResult.today_late_in - oldAttendanceData.today_late_in);

        editedEarlyOut = parseInt(updatedResult.today_early_out - oldAttendanceData.today_early_out);

        // Manage old status
        if (oldAttendanceData.status === presentStatus) {

            oldPresent = 1;
            oldDaysWorked = 1;
        }
        else if (oldAttendanceData.status === absentStatus) {
            oldAbsent = 1;
        }
        else if (oldAttendanceData.status === halfdayStatus) {

            oldHalfDay = 1;
            oldDaysWorked = 1;
        }
        else if (oldAttendanceData.status === leaveStatus) {
            oldLeave = 1;
        }
        else if (oldAttendanceData.status === missedPunchStatus) {
            oldMissedPunch = 1;
        }
        else if (oldAttendanceData.status === enumValue.weeklyOffStatus) {
            oldWeeklyOff = 1;
        }
        else if (oldAttendanceData.status === enumValue.paidHolidayStatus) {
            oldPaidHoliday = 1;
        }
        else if (oldAttendanceData.status === enumValue.unpaidHolidayStatus) {
            oldUnpaidHoliday = 1;
        }

        // Manage new status
        if (updatedResult.status === presentStatus) {

            present = 1;
            daysWorked = 1;
        }
        else if (updatedResult.status === absentStatus) {

            absent = 1;
        }
        else if (updatedResult.status === halfdayStatus) {

            halfDay = 1;
            daysWorked = 1;
        }
        else if (updatedResult.status === leaveStatus) {

            leave = 1;
        }
        else if (updatedResult.status === missedPunchStatus) {

            missedPunch = 1;
        }
        else if (updatedResult.status === enumValue.weeklyOffStatus) {
            weeklyOff = 1;
        }
        else if (updatedResult.status === enumValue.paidHolidayStatus) {
            paidHoliday = 1;
        }
        else if (updatedResult.status === enumValue.unpaidHolidayStatus) {
            unpaidHoliday = 1;
        }

        let _daysWorked = findResult.days_worked + daysWorked;

        let oldWorkTime = (findResult.total_work_hours.hours * 60) + findResult.total_work_hours.minutes;
        let newWorkTime = (editedWorkHours * 60) + editedWorkMinutes;

        let updatedWorkTime = parseInt(oldWorkTime + newWorkTime);

        /* Calculate average work time */
        let _averageWorkHours = findResult.average_work_hours;

        let netDaysWorked = _daysWorked + oldDaysWorked;

        if (netDaysWorked > 0) {
            let averageWorkTime = parseFloat(updatedWorkTime / netDaysWorked);

            // Convert updatedWorkTime minuts into hours and minutes
            let averageWorkH = parseInt(averageWorkTime / 60);
            let averageWorkM = parseInt(averageWorkTime % 60);

            _averageWorkHours = {
                "hours": averageWorkH,
                "minutes": averageWorkM
            };
        }
        else {
            _averageWorkHours = {
                "hours": 0,
                "minutes": 0
            };
        }

        // Get calendar data from findResult
        let calendar = findResult.calendar ? findResult.calendar : [];

        // // Updated data push to exist calendar

        let currentDate = moment(oldAttendanceData.created_at).valueOf();

        for (let i = 0; i < calendar.length; i++) {


            if (calendar[i].date === currentDate) {

                calendar[i] = {
                    "date": moment(oldAttendanceData.created_at).valueOf(),
                    "type": updatedResult.status
                }
            }
        }



        findResult.presents = findResult.presents === undefined ? 0 : findResult.presents;
        findResult.absents = findResult.absents === undefined ? 0 : findResult.absents;
        findResult.half_days = findResult.half_days === undefined ? 0 : findResult.half_days;
        findResult.leaves = findResult.leaves === undefined ? 0 : findResult.leaves;
        findResult.missed_punch = findResult.missed_punch === undefined ? 0 : findResult.missed_punch;
        findResult.weekly_off = findResult.weekly_off === undefined ? 0 : findResult.weekly_off;
        findResult.paid_holiday = findResult.paid_holiday === undefined ? 0 : findResult.paid_holiday;
        findResult.unpaid_holiday = findResult.unpaid_holiday === undefined ? 0 : findResult.unpaid_holiday;


        let updateMonthlyAttendance = {
            // Manage fields
            "monthly_attendance_id": findResult._id,
            "presents": findResult.presents + present - oldPresent,
            "absents": findResult.absents + absent - oldAbsent,
            "half_days": findResult.half_days + halfDay - oldHalfDay,
            "leaves": findResult.leaves + leave - oldLeave,
            "missed_punch": findResult.missed_punch + missedPunch - oldMissedPunch,
            "weekly_off": findResult.weekly_off + weeklyOff - oldWeeklyOff,
            "paid_holiday": findResult.paid_holiday + paidHoliday - oldPaidHoliday,
            "unpaid_holiday": findResult.unpaid_holiday + unpaidHoliday - oldUnpaidHoliday,
            "late_in": findResult.late_in + editedLateIn,
            "early_out": findResult.early_out + editedEarlyOut,
            "days_worked": _daysWorked - oldDaysWorked,
            "deficit_hours": {
                "hours": _deficitHours.hours,
                "minutes": _deficitHours.minutes
            },
            "total_work_hours": {
                "hours": _totalWorkHours.hours,
                "minutes": _totalWorkHours.minutes
            },
            "average_work_hours": {
                "hours": _averageWorkHours.hours,
                "minutes": _averageWorkHours.minutes
            },
            "calendar": calendar
        }

        // Update monthly attendance data on daily basis
        let updateMonthlyAttendanceResult = await monthlyAttendanceModel.updateMonthlyAttendance(updateMonthlyAttendance)


        printLogger(2, "*********************** UPDATE MONTHLY ATTENDANCE result  ***********************", 'attendance');
        printLogger(2, util.inspect(updateMonthlyAttendanceResult), 'attendance');
    }
    catch (error) {

        printLogger(0, "*********************** UPDATE MONTHLY ATTENDANCE error  ***********************", 'attendance');
        printLogger(0, error, 'attendance');
    }
};