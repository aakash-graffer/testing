const moment = require('moment');
const util = require('util');

const employeeModel = require('../models/employees.model');
const attendanceModel = require('../models/attendance.model');
const monthlyTransactionModel = require('../models/monthlyTransaction.model');
const { message, printLogger, enumValue, errData } = require('../core/utility');
const { response } = require('../core/responseformat');
const transactionModel = require('../models/transaction.model');


// Show payroll details
exports.showPayroll = async (req, res, next) => {
    try {
        printLogger(2, ` ****************** ${req.originalUrl} ******************** `, 'transaction');

        let todayDate = moment().utc().format("DD-MM-YYYY");
        let currentMonth = moment().utc().format("M");
        let currentYear = moment().utc().format("YYYY");

        // Get employee id from jwt token
        let data = {

            "employee_id": req.userData._id,
            "month": currentMonth,
            "year": currentYear
        };

        // Get employee salary details
        let employeeResult = await employeeModel.findEmployee(data);
        printLogger(2, `employeeResult:- ${util.inspect(employeeResult)}`, 'transaction');

        if (employeeResult === null || employeeResult === undefined) {

            // let dataResult = [{
            //     "value": "",
            //     "msg": message.userNotRegistered(),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(0, dataResult, 'employee');
            // return response(res, 200, false, message.userNotRegistered(), dataResult);
            throw errData(200, message.userNotRegistered(), null);
        }
        else {

            let pay = 0;
            let date;
            let totalEarned = 0;
            let loggedWorkHours = " ";

            let totalDays = moment().utc().endOf('month').format("DD");
            let netPayPerMonth = parseFloat(employeeResult.net_salary);
            let netPayPerDay = parseFloat(netPayPerMonth) / parseFloat(totalDays);

            // Calculate employee rupyo credit limit
            if (employeeResult.credit_limit_type === enumValue.percentBaseType && employeeResult.credit_limit_percent > 0) {

                employeeResult.rupyo_credit_limit = parseFloat((employeeResult.net_salary * employeeResult.credit_limit_percent) / 100);
            }

            let rupyoPayoutLimit = employeeResult.rupyo_credit_limit;
            let payoutCredited = 0;

            // Get employee attendance details
            let attendanceResult = await attendanceModel.findAttendanceByEmployeeId(data);
            printLogger(2, `attendanceResult:- ${util.inspect(attendanceResult)}`, 'transaction');

            // Calculate daily earnings data
            let earningsData = [];

            // START FOR LOOP
            for (let j = 0; j < attendanceResult.length; j++) {

                // We display today date that's why we use created_at and not use punch_in
                date = moment(attendanceResult[j].created_at).format("DD-MM-YYYY");

                let workHours = attendanceResult[j].actual_working_hours.hours;
                let workMinutes = attendanceResult[j].actual_working_hours.minutes;

                if (workHours === undefined || workHours === null) {
                    workHours = 0;
                }

                if (workMinutes === undefined || workMinutes === null) {
                    workMinutes = 0;
                }

                loggedWorkHours = `${workHours} hours ${workMinutes} min`;


                // Not show today data if user not punch out
                if (date != todayDate) {

                    let _status = attendanceResult[j].status;

                    if (_status === enumValue.presentStatus) {

                        pay = netPayPerDay;
                        totalEarned = totalEarned + pay;
                        loggedWorkHours = `${workHours} hours ${workMinutes} min`;
                    }

                    else if (_status === enumValue.missedPunch) {

                        pay = 0;
                        totalEarned = totalEarned + pay;
                        loggedWorkHours = `Missed punch`;
                    }

                    else if (_status === enumValue.absentStatus) {

                        pay = 0;
                        totalEarned = totalEarned + pay;
                        loggedWorkHours = `Absent`;
                    }

                    else if (_status === enumValue.halfDayStatus) {

                        pay = netPayPerDay / 2;
                        totalEarned = totalEarned + pay;
                        loggedWorkHours = `${workHours} hours ${workMinutes} min`;
                    }

                    else if (_status === enumValue.leaveStatus) {

                        pay = netPayPerDay;
                        totalEarned = totalEarned + pay;
                        loggedWorkHours = `Leave`;
                    }

                    else if (_status === enumValue.paidHolidayStatus) {

                        pay = netPayPerDay;
                        totalEarned = totalEarned + pay;
                        loggedWorkHours = `Paid Holiday`;
                    }

                    else if (_status === enumValue.unpaidHolidayStatus) {

                        pay = 0;
                        totalEarned = totalEarned + pay;
                        loggedWorkHours = `Unpaid Holiday`;
                    }

                    else if (_status === enumValue.weeklyOffStatus) {

                        pay = netPayPerDay;
                        totalEarned = totalEarned + pay;
                        loggedWorkHours = `Weekly Off`;
                    }

                    let _earningsData = {
                        "date": date,
                        "logged_work_hours": loggedWorkHours || "",
                        "amount": parseFloat(pay.toFixed(2)) || 0
                    }
                    earningsData.push(_earningsData);
                }
                else if (date == todayDate) {

                    if (attendanceResult[j].actual_working_hours.hours !== undefined) {

                        let _status = attendanceResult[j].status;

                        if (_status === enumValue.presentStatus) {

                            pay = netPayPerDay;
                            totalEarned = totalEarned + pay;
                            loggedWorkHours = `${workHours} hours ${workMinutes} min`;
                        }

                        else if (_status === enumValue.missedPunch) {

                            pay = 0;
                            totalEarned = totalEarned + pay;
                            loggedWorkHours = `Missed punch`;
                        }

                        else if (_status === enumValue.absentStatus) {

                            pay = 0;
                            totalEarned = totalEarned + pay;
                            loggedWorkHours = `Absent`;
                        }

                        else if (_status === enumValue.halfDayStatus) {

                            pay = netPayPerDay / 2;
                            totalEarned = totalEarned + pay;
                            loggedWorkHours = `${workHours} hours ${workMinutes} min`;
                        }

                        else if (_status === enumValue.leaveStatus) {

                            pay = netPayPerDay;
                            totalEarned = totalEarned + pay;
                            loggedWorkHours = `Leave`;
                        }

                        else if (_status === enumValue.paidHolidayStatus) {

                            pay = netPayPerDay;
                            totalEarned = totalEarned + pay;
                            loggedWorkHours = `Paid Holiday`;
                        }

                        else if (_status === enumValue.unpaidHolidayStatus) {

                            pay = 0;
                            totalEarned = totalEarned + pay;
                            loggedWorkHours = `Unpaid Holiday`;
                        }

                        else if (_status === enumValue.weeklyOffStatus) {

                            pay = netPayPerDay;
                            totalEarned = totalEarned + pay;
                            loggedWorkHours = `Weekly Off`;
                        }

                        let _earningsData = {
                            "date": date,
                            "logged_work_hours": loggedWorkHours || "",
                            "amount": parseFloat(pay.toFixed(2)) || 0
                        }
                        earningsData.push(_earningsData);
                    }
                }
            }
            // END FOR LOOP

            let pendingStatus = [enumValue.pendingStatus, enumValue.approvedStatus, enumValue.holdStatus];
            let reqFilter = {
                "user_id": req.userData._id,
                "status": pendingStatus,
                "time_filter": enumValue._thisMonth
            }

            // Get payout requested data by employee id
            let processingAmountResult = await transactionModel.employeeProcessingAmount(reqFilter);
            printLogger(2, `processingAmountResult:- ${util.inspect(processingAmountResult)}`, 'transaction');

            let processingAmount = 0;

            if (processingAmountResult.length === 0) {
                processingAmount = 0;
            }
            else {
                processingAmount = processingAmountResult[0].totalPendingAmount;
            }

            // Get payout credited data by employee id
            let payoutResult = await monthlyTransactionModel.findMonthlyTransactionByYearMonth(data);
            printLogger(2, `payoutResult:- ${util.inspect(payoutResult)}`, 'transaction');

            if (payoutResult === null || payoutResult === undefined) {
                payoutCredited = 0;
            }
            else {
                payoutCredited = parseInt(payoutResult.payout_credited);
            }

            // Remaining credit limit 
            let accruedAmount = 0;

            if (rupyoPayoutLimit < totalEarned) {

                accruedAmount = rupyoPayoutLimit;
            }
            else {
                accruedAmount = totalEarned;
            }

            let remainingCreditLimit = parseFloat(accruedAmount - payoutCredited);

            // Add processing amount and payout credited
            let payoutRequested = processingAmount + payoutCredited;

            let responseData = {

                "net_pay_per_month": netPayPerMonth || 0,
                "net_pay_per_day": parseFloat(netPayPerDay.toFixed(2)) || 0,
                "salary_earned": parseFloat(totalEarned.toFixed(2)) || 0,
                "payout_requested": parseFloat(payoutRequested.toFixed(2)) || 0,
                "payout_credited": parseFloat(payoutCredited.toFixed(2)) || 0,
                "remaining_credit_limit": parseFloat(remainingCreditLimit.toFixed(2)) || 0,
                "basic_pay": parseFloat(employeeResult.basic_pay) || 0,
                "additional_pay": parseFloat(employeeResult.additional_pay) || 0,
                "net_deductions": parseFloat(employeeResult.net_deductions) || 0,

                "withdrawal_limits_by_employer": rupyoPayoutLimit || 0,

                "earnings": earningsData
            }

            printLogger(2, `responseData:- ${util.inspect(responseData)}`, 'transaction');
            return response(res, 200, true, message.dataFound(), responseData);
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'transaction');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};