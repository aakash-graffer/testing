const moment = require('moment');
const { ObjectId } = require('mongodb');
const fs = require('fs');

// Import required AWS SDK clients and commands for Node.js
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const attendanceModel = require('../models/attendance.model');
const transactionModel = require('../models/transaction.model');
const monthlyAttendanceModel = require('../models/monthlyAttendance.model');
const monthlyTransactionModel = require('../models/monthlyTransaction.model');
const holidayModel = require('../models/holiday.model');
const { printLogger } = require('../core/printLogger');
const { enumValue } = require('./utility');
const db = require('../database');
let AWS = require('aws-sdk');
const util = require('util');


// SHOW MONTHLY ATTENDANCE
// Employee available amount
module.exports.showMonthlyAttendance = async (employeeResult) => {
    try {

        let thisMonthAbsents = 0;
        let thisMonthLeaves = 0;
        let totalWorkedDays = 0;
        let thisMonthMissedPunch = 0;

        let year = moment().utc().format('YYYY');
        let month = moment().utc().format('M');

        let rupyoCreditLimit;
        let presents = 0;
        let absents = 0;
        let half_days = 0;
        let leaves = 0;
        let missed_punch = 0;
        let earnedAmount = 0;
        let accruedAmount = 0;

        let checkData = {
            "employee_id": employeeResult._id,
            "year": year,
            "month": month,
            'user_id': employeeResult._id,
            'time_filter': enumValue._thisMonth,
            'status': enumValue.pendingStatus,
            "net_salary": employeeResult.net_salary
        }

        let earnedAmountResult = await earnedAmountAction(checkData);

        if (earnedAmountResult !== 0) {

            presents = earnedAmountResult.presents;
            absents = earnedAmountResult.absents;
            half_days = earnedAmountResult.half_days;
            leaves = earnedAmountResult.leaves;
            missed_punch = earnedAmountResult.missed_punch;
            thisMonthAbsents = earnedAmountResult.absents;
            thisMonthLeaves = earnedAmountResult.leaves;
            thisMonthMissedPunch = earnedAmountResult.missed_punch;
            totalWorkedDays = earnedAmountResult.totalWorkedDays;
            earnedAmount = earnedAmountResult.earnedAmount;
        }

        // Employee credit limit
        rupyoCreditLimit = parseFloat(employeeResult.rupyo_credit_limit);

        // Accrued over the days they have worked in the current month
        if (rupyoCreditLimit < earnedAmount) {

            accruedAmount = rupyoCreditLimit;
        }
        else {
            accruedAmount = earnedAmount;
        }

        checkData.status = [enumValue.pendingStatus, enumValue.approvedStatus, enumValue.holdStatus];

        // Calculate available amount
        let transactionListResult = await transactionModel.employeeProcessingAmount(checkData)

        let totalPendingAmount = 0;

        if (transactionListResult.length > 0) {
            totalPendingAmount = parseFloat(transactionListResult[0].totalPendingAmount.toFixed(2));
        }


        // Check employee credited payout (monthly)
        let payoutResult = await monthlyTransactionModel.findMonthlyTransactionByYearMonth(checkData)

        let payoutCredited = 0;
        let numberOfPayout = 0;

        // If payoutResult is not null
        if (payoutResult != null || payoutResult != undefined) {

            payoutCredited = payoutResult.payout_credited;
            numberOfPayout = payoutResult.number_of_payout;
        }

        // Calculate rejected request amount
        checkData.user_id = employeeResult._id;
        checkData.time_filter = enumValue._thisMonth;
        checkData.status = enumValue.rejectedStatus;


        // Calculate available amount
        let availableAmount = (parseFloat(accruedAmount) - (parseFloat(payoutCredited) + totalPendingAmount));

        let data = {
            "thisMonthAbsents": thisMonthAbsents,
            "thisMonthLeaves": thisMonthLeaves,
            "thisMonthMissedPunch": thisMonthMissedPunch,
            "totalWorkedDays": totalWorkedDays,
            "availableAmount": availableAmount || 0,
            "totalEarnedAmount": earnedAmount || 0
        }
        return data;
    }
    catch (error) {

        return 0
    }
};


// Employee processing amount
module.exports.employeeProcessingAmount = async (data) => {
    try {
        let transactionListResult = await transactionModel.employeeProcessingAmount(data)

        if (transactionListResult.length == 0) {
            return 0;
        }
        else {

            return parseFloat(transactionListResult[0].totalPendingAmount.toFixed(2))
        }
    }
    catch {
        return 0;
    }
};


// Get monthly transaction data
module.exports.findMonthlyTransactionByYearMonth = async (data) => {

    let totalAmountWithdrawn = 0;

    let monthlyTransactionResult = await monthlyTransactionModel.findMonthlyTransactionByYearMonth(data)

    totalAmountWithdrawn = monthlyTransactionResult === null ? 0 : monthlyTransactionResult.payout_credited;

    return data = {
        "totalAmountWithdrawn": totalAmountWithdrawn
    }
};


// Send push notification
module.exports.sendPushNotification = (reqData) => {
    try {

        printLogger(2, " ********* sendPushNotification ************** ", '');

        let bodyObj = `{
             "registration_ids": ${reqData.registrationIds},
        "notification": {
            "sound": "default",
            "body":  ${reqData.body},
            "title":  ${reqData.title},
            "content_available": true,
            "priority": "high"
        }
        "data" : {
            "type":  ${reqData.notificationType}
        }
    }`;


        let request = require('request');
        let options = {
            'method': 'POST',
            'url': 'https://fcm.googleapis.com/fcm/send',
            'headers': {
                // 'Authorization': 'key=AAAAusLXPqs:APA91bF5PuJ4DB7S3iuOywyfD6qjNLvu1ju7QpfJCEiYW-AYwLhBK9H_QELrw4cQRDw270BozghMBdzTGmFlqwQExfoE57XsJGejmvT8je_WEmtPrGHZ-jVig3sEPHv3HY_YFYSFgHQ5', // dev
                // 'Authorization': 'key=AAAAkzcPJi8:APA91bFOO2dLqbC-y-dOBwG93XchZ8B28VS8yZM5thvFnUT3RnXB13DIbl9tuPh05qN1QIZ6PYzoc-JM-ZOThXAIRq9Rm-fkHBpPalvj2I0nzpNJjWobWI-EBcT_5Cl2fe1DsMa695VL', // stage
                'Authorization': 'key=AAAAnC9U8qo:APA91bF7YZGecHG1FpAe4ZWaaJqiP_RbJT-fbl2N7SK9Xp1ao2X34gtSb2KQAog2BgwumkXQ1_7atsKB2NsSrX95QYFZFRuVdzzUNrR0a_H4N9oFBRtW2rxTVVikvDsZsFdro1rnlpeD', // prod                
                'Content-Type': 'application/json'
            },
            body: bodyObj
        };

        request(options, (error, response) => {
            if (error) {
                printLogger(0, " ********* sendPushNotification ************** ", '');
                printLogger(0, `error:-  ${error}`, '');
            }
            else {

                printLogger(2, `response.body:-  ${response.body}`, '');
                return response.body
            }
        });
    }
    catch (error) {

        printLogger(0, `Error:-  ${error}`, '');
        return 0
    }
};


// Employee available amount
module.exports.availableAmountAction = async (employeeResult) => {
    try {

        printLogger(2, " *************** commonFunction_availableAmountAction ***************** ", 'transaction');

        let year = moment().utc().format('YYYY');
        let month = moment().utc().format('MM');
        let todayDate = moment().utc().startOf('month').format('D');
        let lastDate = moment().utc().endOf('month').format('D');

        let presents = 0;
        let absents = 0;
        let half_days = 0;
        let leaves = 0;
        let missed_punch = 0;
        let earnedAmount = 0;
        let totalWorkedDays = 0;
        let weeklyOff = 0;
        let paidHoliday = 0;
        let unpaidHoliday = 0;
        let rupyoCreditLimit = 0;
        let accruedAmount = 0;

        let checkData = {
            "employee_id": employeeResult._id,
            "year": year,
            "month": month,
            'time_filter': enumValue._thisMonth,
            'status': enumValue.pendingStatus,
            "net_salary": employeeResult.net_salary
        }

        let earnedAmountResult = await earnedAmountAction(checkData);
        printLogger(2, `availableAmountAction_earnedAmountResult:- ${earnedAmountResult}`, 'transaction');

        if (earnedAmountResult != 0) {

            presents = earnedAmountResult.presents || 0;
            absents = earnedAmountResult.absents || 0;
            half_days = earnedAmountResult.half_days || 0;
            leaves = earnedAmountResult.leaves || 0;
            missed_punch = earnedAmountResult.missed_punch || 0;
            thisMonthAbsents = earnedAmountResult.absents || 0;
            thisMonthLeaves = earnedAmountResult.leaves || 0;
            thisMonthMissedPunch = earnedAmountResult.missed_punch || 0;
            totalWorkedDays = earnedAmountResult.totalWorkedDays || 0;
            earnedAmount = earnedAmountResult.earnedAmount || 0;
        }


        // Employee credit limit
        rupyoCreditLimit = parseFloat(employeeResult.rupyo_credit_limit);


        let currentDate = new Date();
        let creditLimitType = enumValue.monthWiseCreditLimit;
        let creditLimitPercent = employeeResult.credit_limit_percent ? employeeResult.credit_limit_percent : 50;

        // Get current month credit_limit_type and credit_limit_percent value
        if (employeeResult.Company.employee_credit_limit_setting && employeeResult.Company.employee_credit_limit_setting.length > 0) {

            let employeeCreditLimitSetting = employeeResult.Company.employee_credit_limit_setting;

            let filteredArray = employeeCreditLimitSetting.filter(element => new Date(element.activation_date) <= currentDate);

            let maxDate = new Date('2001-01-01T00:00:00.000Z');

            for (let j = 0; j < filteredArray.length; j++) {

                if (new Date(filteredArray[j].activation_date) > maxDate) {

                    maxDate = filteredArray[j].activation_date;
                    creditLimitType = filteredArray[j].credit_limit_type;
                }
            }

            // console.log("employeeResult.credit_limit_percent;- ", employeeResult.credit_limit_percent)
            // console.log("earnedAmount;- ", earnedAmount)
            // console.log("creditLimitType;- ", creditLimitType)
            // console.log("creditLimitPercent;- ", creditLimitPercent)

            if (creditLimitType === enumValue.dayWiseCreditLimit) {

                accruedAmount = parseInt((earnedAmount * creditLimitPercent) / 100);
            }
            else {

                // Accrued over the days they have worked in the current month
                if (rupyoCreditLimit < earnedAmount) {

                    accruedAmount = rupyoCreditLimit;
                }
                else {
                    accruedAmount = earnedAmount;
                }
            }
        }
        else {

            // Accrued over the days they have worked in the current month
            if (rupyoCreditLimit < earnedAmount) {

                accruedAmount = rupyoCreditLimit;
            }
            else {
                accruedAmount = earnedAmount;
            }
        }

        // console.log("accuredAmount:- ", accruedAmount)

        // // Accrued over the days they have worked in the current month
        // if (rupyoCreditLimit < earnedAmount) {

        //     accruedAmount = rupyoCreditLimit;
        // }
        // else {
        //     accruedAmount = earnedAmount;
        // }

        // Check employee credited payout (this month)
        let payoutResult = await monthlyTransactionModel.findMonthlyTransactionByYearMonth(checkData);
        printLogger(2, `availableAmountAction_payoutResult:- ${payoutResult}`, 'transaction');

        let payoutCredited = 0;
        let numberOfPayout = 0;

        // If payoutResult is not null
        if (payoutResult === null || payoutResult === undefined) {

            payoutCredited = 0;
            numberOfPayout = 0;
        }
        else {

            // Total credited payout
            payoutCredited = payoutResult.payout_credited;

            // Total number of payout of current month
            numberOfPayout = payoutResult.number_of_payout;
        }

        checkData.user_id = employeeResult._id;
        checkData.time_filter = enumValue._thisMonth;
        checkData.status = [enumValue.pendingStatus, enumValue.approvedStatus, enumValue.holdStatus];

        let totalPendingAmount = 0;

        // Check employee processing amount
        let transactionListResult = await transactionModel.employeeProcessingAmount(checkData);
        printLogger(2, `availableAmountAction_transactionListResult:- ${transactionListResult}`, 'transaction');

        if (transactionListResult.length > 0) {
            totalPendingAmount = parseFloat(transactionListResult[0].totalPendingAmount.toFixed(2));
        }
        else {
            totalPendingAmount = 0;
        }

        // Calculate available amount
        let availableAmount = parseInt(accruedAmount) - parseInt(payoutCredited) - parseFloat(totalPendingAmount);
        printLogger(2, `availableAmountAction_availableAmount:- ${availableAmount}`, 'transaction');


        let data = {
            "availableAmount": availableAmount,
            "payoutCredited": payoutCredited
        }
        return data
    }
    catch (error) {

        printLogger(0, `availableAmountAction_error:- ${error}`, 'transaction');
        return 0
    }
};


// Send SMS
module.exports.sendSMS = async (phoneNumber, message) => {
    try {

        // Set the AWS Region
        const REGION = "ap-south-1"; // "us-east-2" //e.g. "us-east-1"

        // Set the parameters
        const params = {
            Message: message, // required
            PhoneNumber: phoneNumber, //PHONE_NUMBER, in the E.164 phone number structure
        };

        // Create SNS service object
        const sns = new SNSClient({ region: REGION });

        const run = async () => {
            try {
                const data = await sns.send(new PublishCommand(params));
                let dataResult = [{
                    "value": "",
                    "msg": data.MessageId,
                    "param": "",
                    "location": ""
                }]
                return data.MessageId;
            }
            catch (err) {

                return 0;
            }
        };
        run();
    }
    catch (error) {

        return 0;
    }
};


// Send Email
module.exports.sendEmail = async (Cc_Addresses, To_Addresses, HtmlFormatBody, Subject) => {
    try {
        printLogger(2, `Cc_Addresses:- ${Cc_Addresses}`, '');
        printLogger(2, `To_Addresses:- ${To_Addresses}`, '');
        printLogger(2, `HtmlFormatBody:- ${HtmlFormatBody}`, '');

        const REGION = "ap-south-1"; //e.g. "us-east-1"

        // Create SES service object.
        // Create sendEmail params
        let params = {
            Destination: { /* required */
                CcAddresses: [
                    `${Cc_Addresses}`,
                    /* more items */
                ],
                ToAddresses: [
                    `${To_Addresses}`,
                    /* more items */
                ]
            },
            Message: { /* required */
                Body: {
                    /* required */
                    Html: {
                        Charset: "UTF-8",
                        Data: HtmlFormatBody
                    },
                    Text: {
                        Charset: "UTF-8",
                        Data: "TEXT_FORMAT_BODY"
                    }
                },
                Subject: {
                    Charset: 'UTF-8',
                    Data: Subject
                }
            },
            Source: 'support@rupyo.in', /* required */
            ReplyToAddresses: [
                'support@rupyo.in',
                /* more items */
            ],
        };

        printLogger(2, `params:- ${util.inspect(params, { showHidden: false, depth: null })}`, '');

        // Create the promise and SES service object
        let sendPromise = new AWS.SES({ apiVersion: '2010-12-01', region: REGION }).sendEmail(params).promise();

        // Handle promise's fulfilled/rejected states
        sendPromise
            .then((data) => {

                printLogger(2, `data:- ${data}`, '');
                return data.MessageId;
            })
            .catch((error) => {

                printLogger(2, `error 1 catch:- ${error}`, '');
                return error.stack;
            });
    }
    catch (error) {

        printLogger(2, `error catch:- ${error}`, '');
        return 0;
    }
};


// Update payout credited on every payout credited
module.exports.updatePayoutCredited = async (reqData) => {
    try {

        let data = {
            "employee_id": reqData.user_id,
            "year": moment().utc().format('YYYY'),
            "month": moment().utc().format('M')
        }

        let monthlyTransactionResult = await monthlyTransactionModel.findMonthlyTransactionByYearMonth(data);

        let totalAmountWithdrawn = monthlyTransactionResult === null ? 0 : monthlyTransactionResult.payout_credited;

        let query = {
            "_id": ObjectId(reqData.user_id)
        }


        let updateData = {
            $set: {
                "payout_credited": totalAmountWithdrawn
            }
        }

        db.collection('users').updateOne(query, updateData, (error, updateResult) => {
            if (error) {

                return 0;
            }
            else {

                return updateResult;
            }
        })
    }
    catch (error) {

        return 0;
    }
};



// Update earned amount and attendance count
module.exports.updateEarnedAmount_attendanceCountes = async (employeeResult) => {
    try {
        printLogger(2, "******* Common Functions ***********", 'employee');
        printLogger(2, "******* updateEarnedAmount_attendanceCountes ***********", 'employee');
        printLogger(2, `employeeResult:-  ${util.inspect(employeeResult)}`, 'employee');

        let lastDate = parseInt(moment().utc().endOf('month').format("DD"));

        let presents = 0;
        let absents = 0;
        let halfDays = 0;
        let leaves = 0;
        let earnedAmount = 0;
        let totalWorkedDays = 0;
        let year = moment().utc().format('YYYY');
        let month = moment().utc().format('M');

        let checkData = {
            "employee_id": employeeResult._id,
            "year": year,
            "month": month,
            'user_id': employeeResult._id,
            'time_filter': enumValue._thisMonth,
            'status': enumValue.pendingStatus,
            "net_salary": employeeResult.net_salary
        }

        let earnedAmountResult = await earnedAmountAction(checkData);

        printLogger(2, `earnedAmountResult:-  ${util.inspect(earnedAmountResult)}`, 'employee');

        if (earnedAmountResult != 0) {

            presents = earnedAmountResult.presents || 0;
            absents = earnedAmountResult.absents || 0;
            halfDays = earnedAmountResult.half_days || 0;
            leaves = earnedAmountResult.leaves || 0;
            thisMonthAbsents = earnedAmountResult.absents || 0;
            thisMonthLeaves = earnedAmountResult.leaves || 0;
            thisMonthMissedPunch = earnedAmountResult.missed_punch || 0;
            totalWorkedDays = earnedAmountResult.totalWorkedDays || 0;
            earnedAmount = earnedAmountResult.earnedAmount || 0;
        }


        // Calculate employee credit limit & net pay per day
        let netPayPerDay = parseFloat(checkData.net_salary / lastDate);

        //* ADD WEEKLYOFF AND PAID HOLIDAY AMOUNT */
        // Add earned amount on weeklyOff and paid amount status
        // if (employeeResult.holidayStatus && employeeResult.holidayStatus === enumValue.weeklyOffStatus || employeeResult.holidayStatus === enumValue.paidHolidayStatus) {
        //     earnedAmount = earnedAmount + netPayPerDay
        // }

        let query = { "_id": ObjectId(employeeResult._id) }

        let updateData = {
            $set: {
                "presents_count": presents,
                "absents_count": absents,
                "half_days_count": halfDays,
                "leaves_count": leaves,
                "earned_amount": parseFloat(earnedAmount.toFixed(2)),
                "missed_punch_count": thisMonthMissedPunch,
                "days_worked_till_now": totalWorkedDays
            }
        }

        printLogger(2, `****** Save salary data to user table`, 'employee');
        printLogger(2, `query:-  ${util.inspect(query)}`, 'employee');
        printLogger(2, `updateData:-  ${util.inspect(updateData)}`, 'employee');

        db.collection('users').updateOne(query, updateData, (error, updateResult) => {
            if (error) {

                return 0;
            }
            else {

                return updateResult;
            }
        })
    }
    catch (error) {

        return 0;
    }
};



// Earned amount internal method
let earnedAmountAction = async (checkData) => {
    try {

        let lastDate = parseInt(moment().utc().endOf('month').format("DD"));

        // Check total earned amount
        let monthlyAttendanceResult = await monthlyAttendanceModel.showMonthlyAttendance(checkData);

        printLogger(2, "******* Common Functions ***********", 'employee');
        printLogger(2, "******* earnedAmountAction ***********", 'employee');
        printLogger(2, `monthlyAttendanceResult:-  ${util.inspect(monthlyAttendanceResult)}`, 'employee');

        let presents = 0;
        let absents = 0;
        let half_days = 0;
        let leaves = 0;
        let missed_punch = 0;
        let earnedAmount = 0;
        let totalWorkedDays = 0;
        let weeklyOff = 0;
        let paidHoliday = 0;
        let unpaidHoliday = 0;

        if (monthlyAttendanceResult === null) {

            presents = 0;
            absents = 0
            half_days = 0;
            leaves = 0;
            missed_punch = 0;
            weeklyOff = 0;
            paidHoliday = 0;
            unpaidHoliday = 0;
            thisMonthAbsents = 0;
            thisMonthLeaves = 0;
            totalWorkedDays = 0;
        }
        else {

            presents = monthlyAttendanceResult.presents || 0;
            absents = monthlyAttendanceResult.absents || 0;
            half_days = monthlyAttendanceResult.half_days || 0;
            leaves = monthlyAttendanceResult.leaves || 0;
            missed_punch = monthlyAttendanceResult.missed_punch || 0;
            thisMonthAbsents = monthlyAttendanceResult.absents || 0;
            thisMonthLeaves = monthlyAttendanceResult.leaves || 0;
            totalWorkedDays = monthlyAttendanceResult.days_worked || 0;
            thisMonthMissedPunch = monthlyAttendanceResult.missed_punch || 0;
            weeklyOff = monthlyAttendanceResult.weekly_off || 0;
            paidHoliday = monthlyAttendanceResult.paid_holiday || 0;
            unpaidHoliday = monthlyAttendanceResult.unpaid_holiday || 0;
        }


        // Calculate employee credit limit & net pay per day
        let netPayPerDay = parseFloat(checkData.net_salary / lastDate);

        let presentAmount = parseFloat(netPayPerDay * presents);
        let halfDayAmount = parseFloat((netPayPerDay / 2) * half_days);
        let leavesAmount = parseFloat(netPayPerDay * leaves);
        let weeklyOffAmount = parseFloat(netPayPerDay * weeklyOff);
        let paidHolidayAmount = parseFloat(netPayPerDay * paidHoliday);

        // parseFloat(netPayPerDay * daysWorked);
        earnedAmount = presentAmount + halfDayAmount + leavesAmount + weeklyOffAmount + paidHolidayAmount;

        return {
            presents,
            absents,
            half_days,
            leaves,
            missed_punch,
            thisMonthAbsents,
            thisMonthLeaves,
            totalWorkedDays,
            thisMonthMissedPunch,
            earnedAmount
        }
    }
    catch {

        return 0;
    }
};



// Download s3 file
exports.downloadFileFromS3 = async (bucketName, fileName, outputPath) => {
    try {

        let params = {
            Bucket: bucketName,
            Key: fileName
        };

        let file = fs.createWriteStream(outputPath);

        return new Promise(function (resolve, reject) {


            resolve(new AWS.S3({
                apiVersion: '2006-03-01'
            }).getObject(params).createReadStream().pipe(file));
        });
    }
    catch (error) {

        return 0;
    }
};




// Holiday list by company_id
exports.companyHolidays = async (companyId) => {
    try {

        // Check holiday by company id and year
        let checkData = {
            "company_id": companyId,
            "year": parseInt(moment().format('YYYY'))
        }

        let holidayResult = await holidayModel.findByCompanyIdAndYear(checkData);

        printLogger(2, holidayResult, 'employee');
        if (holidayResult === null) {
            return []
        }
        else {
            return holidayResult.holidays
        }
    }
    catch (error) {

        printLogger(0, error, 'employee');
        return 0;
    }
};



// Check employee today mark attendance or not
exports.checkPunchIn = async (data) => {
    try {
        printLogger(2, ' **************** commonFunction ->  checkPunchIn ****************', 'attendance');
        let today = moment().utc().format("YYYY-MM-DD");

        data.employee_id = (data.employee_id).toString();

        // Find today attendance
        let todayAttendanceData = await attendanceModel.findTodayAttedance(data);
        printLogger(2, `todayAttendanceData:- ${util.inspect(todayAttendanceData, { showHidden: false, depth: null })}`, 'attendance');

        // If todayAttendanceData is null
        if (todayAttendanceData === undefined || todayAttendanceData === null) {
            return 0;  // punch in
        }
        else {
            let todayLastSwipe = false;

            // Check calculated_last_swipe date
            if (todayAttendanceData.calculated_last_swipe >= new Date(today + "T00:00:00.000Z") && todayAttendanceData.calculated_last_swipe <= new Date(today + "T23:59:59.000Z")) {

                todayLastSwipe = true;
            }

            // If todayLastSwipe is true
            if (todayLastSwipe) {

                // If is_punch is true
                if (todayAttendanceData.is_punch) {

                    return null; // already marked attendance
                }
                else {

                    return todayAttendanceData._id; // punch out
                }
            }
            else {

                return null;
            }
        }
    }
    catch (error) {

        printLogger(0, `commonFunction ->  checkPunchIn Error:- ${util.inspect(error, { showHidden: false, depth: null })}`, 'attendance');
        return null;
    }
};



// Get current month setting for credit_limit_type
exports.employeeCreditLimitType = (companyData) => {
    try {
        printLogger(2, ' **************** commonFunction ->  employeeCreditLimitType ****************', "employer");
        printLogger(2, `commonFunction ->  employeeCreditLimitType -> companyData:- ${util.inspect(companyData)}`, "employer");

        let currentDate = new Date();

        // Employer credit limit default set month wise
        let creditLimitType = enumValue.monthWiseCreditLimit;

        // Get current month employee_credit_limit_setting
        if (companyData.employee_credit_limit_setting && companyData.employee_credit_limit_setting.length > 0) {

            let employeeCreditLimitArray = companyData.employee_credit_limit_setting;

            let filteredArray = employeeCreditLimitArray.filter(element => new Date(element.activation_date) <= currentDate);

            let maxDate = new Date('2001-01-01T00:00:00.000Z');

            for (let j = 0; j < filteredArray.length; j++) {

                if (new Date(filteredArray[j].activation_date) > maxDate) {

                    maxDate = filteredArray[j].activation_date;
                    creditLimitType = filteredArray[j].credit_limit_type;
                }
            }
        }
        return creditLimitType;
    }
    catch (error) {
        return false;
    }
};



// Get current month transaction_charge_setting
exports.transactionChargeSetting = (companyData) => {
    try {
        printLogger(2, ' **************** commonFunction ->  transactionChargeSetting ****************', "employer");
        printLogger(2, `commonFunction ->  transactionChargeSetting -> companyData:- ${util.inspect(companyData)}`, "employer");

        let currentDate = new Date();

        // By default current month transaction charge setting is false
        let employerPayTransactionCharge = false;
        let transactionDeductionPercent = global.env.TRANSACTION_DEDUCTION_PERCENT;

        if (companyData.transaction_charge_setting && companyData.transaction_charge_setting.length > 0) {

            let transactionChargeArray = companyData.transaction_charge_setting;

            let filteredArray = transactionChargeArray.filter(element => new Date(element.activation_date) <= currentDate);

            let maxDate = new Date('2001-01-01T00:00:00.000Z');

            for (let j = 0; j < filteredArray.length; j++) {

                if (new Date(filteredArray[j].activation_date) > maxDate) {

                    maxDate = filteredArray[j].activation_date;
                    employerPayTransactionCharge = filteredArray[j].employer_pay_transaction_charge;
                    transactionDeductionPercent = filteredArray[j].transaction_deduction_percent;
                }
            }
        }

        return {
            "employer_pay_transaction_charge": employerPayTransactionCharge || false,
            "transaction_deduction_percent": transactionDeductionPercent || global.env.TRANSACTION_DEDUCTION_PERCENT
        };
    }
    catch (error) {
        return false;
    }
};





// // Get next month setting for credit_limit_type
// exports.employeeCreditLimitTypeForNextMonth = (companyData) => {
//     try {
//         printLogger(2, ' **************** commonFunction ->  employeeCreditLimitType ****************', "employer");
//         printLogger(2, `commonFunction ->  employeeCreditLimitType -> companyData:- ${util.inspect(companyData)}`, "employer");

//         let maxDate = new Date('2001-01-01T00:00:00.000Z');
//         let currentDate = new Date();
//         let nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 2);

//         // Employer credit limit default set month wise
//         let creditLimitType = enumValue.monthWiseCreditLimit;

//         // Get next month employee_credit_limit_setting
//         if (companyData.employee_credit_limit_setting && companyData.employee_credit_limit_setting.length > 0) {

//             let employeeCreditLimitArray = companyData.employee_credit_limit_setting;

//             let filteredArray = employeeCreditLimitArray.filter(element => new Date(element.activation_date) <= nextMonthDate);

//             for (let j = 0; j < filteredArray.length; j++) {

//                 if (new Date(filteredArray[j].activation_date) > maxDate) {

//                     maxDate = filteredArray[j].activation_date;
//                     creditLimitType = filteredArray[j].credit_limit_type;
//                 }
//             }
//         }
//         return {
//             "changes_reflection_date": maxDate,
//             "credit_limit_type": creditLimitType
//         };
//     }
//     catch (error) {
//         return false;
//     }
// };



// // Get next month transaction_charge_setting
// exports.transactionChargeSettingForNextMonth = (companyData) => {
//     try {
//         printLogger(2, ' **************** commonFunction ->  transactionChargeSetting ****************', "employer");
//         printLogger(2, `commonFunction ->  transactionChargeSetting -> companyData:- ${util.inspect(companyData)}`, "employer");

//         let currentDate = new Date();
//         let nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 2);

//         // By default next month transaction charge setting is false
//         let employerPayTransactionCharge = false;
//         let transactionDeductionPercent = global.env.TRANSACTION_DEDUCTION_PERCENT;

//         if (companyData.transaction_charge_setting && companyData.transaction_charge_setting.length > 0) {

//             let transactionChargeArray = companyData.transaction_charge_setting;

//             let filteredArray = transactionChargeArray.filter(element => new Date(element.activation_date) <= nextMonthDate);

//             let maxDate = new Date('2001-01-01T00:00:00.000Z');

//             for (let j = 0; j < filteredArray.length; j++) {

//                 if (new Date(filteredArray[j].activation_date) > maxDate) {

//                     maxDate = filteredArray[j].activation_date;
//                     employerPayTransactionCharge = filteredArray[j].employer_pay_transaction_charge;
//                     transactionDeductionPercent = filteredArray[j].transaction_deduction_percent;
//                 }
//             }
//         }

//         return {
//             "employer_pay_transaction_charge": employerPayTransactionCharge || false,
//             "transaction_deduction_percent": transactionDeductionPercent || global.env.TRANSACTION_DEDUCTION_PERCENT
//         };
//     }
//     catch (error) {
//         return false;
//     }
// };



// Get next month setting for credit_limit_type
exports.employeeCreditLimitTypeForNextMonth = (companyData) => {
    try {
        printLogger(2, ' **************** commonFunction ->  employeeCreditLimitType ****************', "employer");
        printLogger(2, `commonFunction ->  employeeCreditLimitType -> companyData:- ${util.inspect(companyData)}`, "employer");

        let maxDate = new Date('2001-01-01T00:00:00.000Z');
        let nextMonth = moment.utc().add(1, "month").format('M');
        let nextMonthYear = moment.utc().format('YYYY');

        if (nextMonth === 12) {
            nextMonthYear = moment.utc().add(1, "year").format('YYYY');
        }

        // Employer credit limit default set month wise
        let creditLimitType = enumValue.monthWiseCreditLimit;

        // Get next month employee_credit_limit_setting
        if (companyData.employee_credit_limit_setting && companyData.employee_credit_limit_setting.length > 0) {

            let employeeCreditLimitArray = companyData.employee_credit_limit_setting;


            for (let i = 0; i < employeeCreditLimitArray.length; i++) {
                // console.log("employeeCreditLimitArray[i].month:- ",employeeCreditLimitArray[i].month)
                // console.log("employeeCreditLimitArray[i].year:- ",employeeCreditLimitArray[i].year)
                if (parseInt(employeeCreditLimitArray[i].month) === parseInt(nextMonth) && parseInt(employeeCreditLimitArray[i].year) === parseInt(nextMonthYear)) {
                    // console.log("if")
                    creditLimitType = employeeCreditLimitArray[i].credit_limit_type;
                    maxDate = employeeCreditLimitArray[i].activation_date;
                }
                else {
                    // console.log("else")
                    creditLimitType = null;
                    maxDate = null;
                }
            }



            // let filteredArray = employeeCreditLimitArray.filter(element => new Date(element.activation_date) <= nextMonthDate);

            // for (let j = 0; j < filteredArray.length; j++) {

            //     if (new Date(filteredArray[j].activation_date) > maxDate) {

            //         maxDate = filteredArray[j].activation_date;
            //         creditLimitType = filteredArray[j].credit_limit_type;
            //     }
            // }
        }
        return {
            "changes_reflection_date": maxDate,
            "credit_limit_type": creditLimitType
        };
    }
    catch (error) {
        return false;
    }
};


// Get next month transaction_charge_setting
exports.transactionChargeSettingForNextMonth = (companyData) => {
    try {
        printLogger(2, ' **************** commonFunction ->  transactionChargeSetting ****************', "employer");
        printLogger(2, `commonFunction ->  transactionChargeSetting -> companyData:- ${util.inspect(companyData)}`, "employer");

        let nextMonth = moment.utc().add(1, "month").format('M');
        let nextMonthYear = moment.utc().format('YYYY');

        if (nextMonth === 12) {
            nextMonthYear = moment.utc().add(1, "year").format('YYYY');
        }

        // By default next month transaction charge setting is false
        let employerPayTransactionCharge = false;
        let transactionDeductionPercent = global.env.TRANSACTION_DEDUCTION_PERCENT;

        if (companyData.transaction_charge_setting && companyData.transaction_charge_setting.length > 0) {

            let transactionChargeArray = companyData.transaction_charge_setting;

            for (let i = 0; i < transactionChargeArray.length; i++) {
                // console.log("transactionChargeArray[i].month:- ",transactionChargeArray[i].month)
                // console.log("transactionChargeArray[i].year:- ",transactionChargeArray[i].year)
                if (parseInt(transactionChargeArray[i].month) === parseInt(nextMonth) && parseInt(transactionChargeArray[i].year) === parseInt(nextMonthYear)) {
                    // console.log("if")
                    employerPayTransactionCharge = transactionChargeArray[i].employer_pay_transaction_charge;
                    transactionDeductionPercent = transactionChargeArray[i].transaction_deduction_percent;
                }
                else {
                    // console.log("else")
                    employerPayTransactionCharge = null;
                    transactionDeductionPercent = null;
                }
            }
            // console.log("employerPayTransactionCharge:- ",employerPayTransactionCharge)
            // console.log("transactionDeductionPercent:- ",transactionDeductionPercent)

            // let filteredArray = transactionChargeArray.filter(element =>{ 
            //     // console.log("element:- ",element)
            //     console.log("element.month:- ",element.month)
            //     console.log("element.year:- ",element.year)
            //     element.month == nextMonth && element.year == nextMonthYear});
            // employerPayTransactionCharge = filteredArray.length > 0 ? filteredArray[0].employer_pay_transaction_charge : null;
            // transactionDeductionPercent = filteredArray.length > 0 ? filteredArray[0].transaction_deduction_percent : null;
        }

        return {
            "employer_pay_transaction_charge": employerPayTransactionCharge,
            "transaction_deduction_percent": transactionDeductionPercent,
        };
    }
    catch (error) {
        return false;
    }
};


// Get updated array for transaction_charge_setting (for update)
exports.getUpdatedArrayForTransactionChargeSetting = (companyData, reqData) => {
    try {

        let transactionChargeSettingArray = [];
        let year = moment().utc().format('YYYY');
        let month = moment().utc().add(1, 'month').format('MM');

        if (month == 1) {
            year = parseInt(year) + 1;
        }

        // Find transaction charge setting
        if (companyData.transaction_charge_setting) {

            transactionChargeSettingArray = companyData.transaction_charge_setting;
        }

        let updateCount = 0;
        let newAddCount = 0;

        for (let i = 0; i < transactionChargeSettingArray.length; i++) {

            // Find transaction charge setting for next year, month
            if (transactionChargeSettingArray[i].year == year && transactionChargeSettingArray[i].month == month) {

                updateCount = 1;

                // Update transaction charge setting array for next year, month (If aleady exist for next year, month)
                transactionChargeSettingArray[i] = {
                    "year": year,
                    "month": month,
                    "employer_pay_transaction_charge": reqData.employer_pay_transaction_charge,
                    "transaction_deduction_percent": reqData.transaction_deduction_percent,
                    "activation_date": moment().utc().add(1, 'month').startOf('month'),
                    "last_changed_date": moment().utc()
                }
                break;
            }
            else {

                newAddCount = newAddCount + 1;
            }
        }

        if (updateCount === 0) {

            // Push new transaction charge setting for next year, month
            transactionChargeSettingArray.push({
                "year": year,
                "month": month,
                "employer_pay_transaction_charge": reqData.employer_pay_transaction_charge,
                "transaction_deduction_percent": reqData.transaction_deduction_percent,
                "activation_date": moment().utc().add(1, 'month').startOf('month'),
                "last_changed_date": moment().utc()
            })
        }

        return transactionChargeSettingArray;
    }
    catch (error) {

        return false;
    }
};



// Get updated array for employee_credit_limit_setting (for update)
exports.getUpdatedArrayForEmployeeCreditLimitSetting = (commpanyData, reqData) => {
    try {
        let employeeCreditLimitArray = [];
        let year = moment().utc().format('YYYY');
        let month = moment().utc().add(1, 'month').format('MM');

        if (month == 1) {
            year = parseInt(year) + 1;
        }

        if (commpanyData.employee_credit_limit_setting) {

            employeeCreditLimitArray = commpanyData.employee_credit_limit_setting;
        }

        let updateCount = 0;
        let newAddCount = 0;

        for (let i = 0; i < employeeCreditLimitArray.length; i++) {

            // Find transaction charge setting for next year, month
            if ((employeeCreditLimitArray[i].year) == year && (employeeCreditLimitArray[i].month) == month) {

                updateCount = 1;

                // Update transaction charge setting array for next year, month (If aleady exist for next year, month)
                employeeCreditLimitArray[i] = {
                    "year": year,
                    "month": month,
                    "credit_limit_type": reqData.credit_limit_type,
                    // "credit_limit_percent": reqData.credit_limit_percent,
                    "activation_date": moment().utc().add(1, 'month').startOf('month'),
                    "last_changed_date": moment().utc()
                }
                break;
            }
            else {

                newAddCount = newAddCount + 1;
            }
        }

        if (updateCount === 0) {

            // Push new transaction charge setting for next year, month
            employeeCreditLimitArray.push({
                "year": year,
                "month": month,
                "credit_limit_type": reqData.credit_limit_type,
                // "credit_limit_percent": reqData.credit_limit_percent,
                "activation_date": moment().utc().add(1, 'month').startOf('month'),
                "last_changed_date": moment().utc()
            })
        }

        return employeeCreditLimitArray;
    }
    catch (error) {

        return false;
    }
};



// Code by Pratik
exports.transactionChargeSettingTesting = (companyData,month,year) => {
    try {
        //return console.log(companyData);

        printLogger(2, ' **************** commonFunction ->  transactionChargeSetting ****************', "employer");
        printLogger(2, `commonFunction ->  transactionChargeSetting -> companyData:- ${util.inspect(companyData)}`, "employer");

        //let currentDate = new Date();

        // let year = year;
       //  console.log(year,'year');
        // let month = moment().utc().add(1, 'month').format('MM');

        // By default current month transaction charge setting is false
        let employerPayTransactionCharge = false;
        //let transactionDeductionPercent = global.env.TRANSACTION_DEDUCTION_PERCENT;

        if (companyData.transaction_charge_setting && companyData.transaction_charge_setting.length > 0) {

            let transactionChargeArray = companyData.transaction_charge_setting;

            let filteredArray = transactionChargeArray.filter(element => 
                element.year == year && element.month == month
            );

           

            

            let maxDate = new Date('2001-01-01T00:00:00.000Z');

            for (let j = 0; j < filteredArray.length; j++) {

                if (new Date(filteredArray[j].activation_date) > maxDate) {

                    maxDate = filteredArray[j].activation_date;
                    employerPayTransactionCharge = filteredArray[j].employer_pay_transaction_charge;
                    transactionDeductionPercent = filteredArray[j].transaction_deduction_percent;
                }
            }
        }
        //console.log(transactionDeductionPercent,'transactionDeductionPercent');
        return {
            "employer_pay_transaction_charge": employerPayTransactionCharge || false,
            "transaction_deduction_percent": transactionDeductionPercent
        };
    }
    catch (error) {
        return false;
    }
};