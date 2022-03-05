const { validationResult } = require('express-validator');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const nodeRsa = require('node-rsa');
const request = require('request');

const monthlyTransactionController = require('./monthlyTransaction.controller');
const employerModel = require('../models/employer.model');
const notificationsModel = require('../models/notifications.model');
const transactionModel = require('../models/transaction.model');
const employeesModel = require('../models/employees.model');
const monthlyTransactionModel = require('../models/monthlyTransaction.model');
const monthlyAttendanceModel = require('../models/monthlyAttendance.model');
const userModel = require('../models/user.model');
const tokenMethod = require("../core/getOpenIdToken");
const { response } = require('../core/responseformat');
const { message, notification, printLogger, randomString, enumValue, decryptData, errData } = require('../core/utility');
const { availableAmountAction, showMonthlyAttendance, sendPushNotification,
    updatePayoutCredited, sendSMS, transactionChargeSetting, sendEmail } = require('../core/commonFunctions');

const privateKey = global.env.PRIVATEKEY;

// Greater than 500 and multiple by 8
const key = new nodeRsa(privateKey);


// Employee payout request
exports.payoutRequest = async (req, res, next) => {
    try {
        printLogger(2, ` ***************  ${req.originalUrl} ****************  `, 'transaction');

        // active status
        let activeStatus = enumValue.activeStatus;
        let todayDate = moment().utc().format('D');
        let lastDate = moment().utc().endOf('month').format('D');

        const errors = validationResult(req);

        // If validation errors
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'transaction');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }

        // If today is last day of month
        else if (todayDate >= (lastDate - 1)) {
            throw errData(200, message.lastDayMessage(), null);
        }
        else {

            // req.body object
            let reqBody = req.body;

            // Amount in processing
            let processInAmount = 0;

            let data = { "_id": req.userData._id }

            // Check employee Status
            let result = await employeesModel.signInAdvance(data);

            let employeeResult = result[0];
            let companyDetail = employeeResult.Company;

            if (employeeResult === null || employeeResult === undefined) {
                throw errData(200, message.unauthorizedUser(), null);
            }

            // If employee status and company status is active
            else if (employeeResult.status === activeStatus && employeeResult.Company.status === activeStatus) {


                // Check for payout activation date
                let _currentDate = moment().utc().valueOf();
                let isActive = true;

                if (employeeResult.employee_payout_activation_date) {

                    if (_currentDate <= moment(employeeResult.employee_payout_activation_date).valueOf()) {

                        isActive = false
                    }
                }

                // Check payout activation date
                if (isActive === false) {
                    throw errData(200, message.payoutInactiveMessage(), null);
                }
                else {

                    // 15 minute gap between two payout request
                    let checkRequest = { "user_id": req.userData._id };
                  //  console.log("checkRequest", checkRequest);
                    let oldRequestResult = await transactionModel.lastPayoutRequest(checkRequest);

                    if (oldRequestResult.length > 0) {

                   /*     let currentTime = moment().utc();
                        let currentTimeYear = parseInt(currentTime.format('YYYY'));
                        let currentTimeMonth = parseInt(currentTime.format('M'));
                        let currentTimeDay = parseInt(currentTime.format('D'));

                        let oldRequestTime = moment(oldRequestResult[0].date_time);

                        let oldRequestTimeYear = parseInt(oldRequestTime.format('YYYY'));
                        let oldRequestTimeMonth = parseInt(oldRequestTime.format('M'));
                        let oldRequestTimeDay = parseInt(oldRequestTime.format('D'));

                        var currentTimeValue = moment([currentTimeYear, (currentTimeMonth - 1), currentTimeDay]);
                        var oldRequestTimeValue = moment([oldRequestTimeYear, (oldRequestTimeMonth - 1), oldRequestTimeDay]);
                        let diffrenceDays = currentTimeValue.diff(oldRequestTimeValue, 'days')

                        sendEmail('pmandloi@flair-solution.com', 'njhawar@flair-solution.com', `<div>currentTime=${currentTime} currentTimeYear= ${currentTimeYear}
                        currentTimeMonth =${currentTimeMonth}
                        currentTimeDay =${currentTimeDay}
                        oldRequestTime =${oldRequestTime}
                        oldRequestTimeYear =${oldRequestTimeYear}
                        oldRequestTimeMonth =${oldRequestTimeMonth}
                        oldRequestTimeDay =${oldRequestTimeDay}
                        currentTimeValue =${currentTimeValue}
                        oldRequestTimeValue =${oldRequestTimeValue}
                        diffrenceDays =${diffrenceDays}

                         :-</div>`, currentTime);

                        if (diffrenceDays === 0) {

                            printLogger(2, diffrenceDays, 'transaction');
                            // return response(res, 200, false, message.payoutRequestAfter15Min(), "");
                            throw errData(200, message.payoutRequestAfter15Min(), null);
                        }
*/

                         let currentTime = moment().utc();
                         let oldRequestTime = moment(oldRequestResult[0].date_time);
                      /*   console.log("currentTime",currentTime);
                         console.log("oldRequestTime",oldRequestTime);
 
                         console.log("currentTime",currentTime.format('D'));
                         console.log("oldRequestTime",oldRequestTime.format('D'));
 
                         console.log("currentTime",currentTime);
                         console.log("oldRequestTime",oldRequestTime);*/
 
                         let differenceHours = moment.duration(currentTime.diff(oldRequestTime)).hours();
                         let differenceMinutes = moment.duration(currentTime.diff(oldRequestTime)).minutes();
 
                         let diffrenceTime = parseInt((differenceHours * 60) + differenceMinutes);
 
                         if (diffrenceTime <= 15) {
 
                             printLogger(2, diffrenceTime, 'transaction');
                             // return response(res, 200, false, message.payoutRequestAfter15Min(), "");
                             throw errData(200, message.payoutRequestAfter15Min(), null);
                         }
                    }

                    let checkDataForEmployer = {
                        "days_filter": enumValue._thisMonth,
                        "company_id": employeeResult.company_id
                    }

                    // Check Company remaining credit limit
                    let transactionResult = await transactionModel.transactionsFilterListMonthly(checkDataForEmployer);

                    let totalAmountPaid = transactionResult[0].payoutCount[0] === undefined || transactionResult[0].payoutCount[0] === null ? 0 : transactionResult[0].payoutCount[0].totalAmount;

                    let companyRupyoCreditLimit = employeeResult.Company.rupyo_credit_limit;

                    let employerRemainingCreditLimit = parseFloat((companyRupyoCreditLimit - totalAmountPaid)) || 0;

                    let rupyoCreditLimit = employeeResult.rupyo_credit_limit;
                    if (employeeResult.credit_limit_type === enumValue.percentBaseType && employeeResult.credit_limit_percent > 0) {

                        employeeResult.rupyo_credit_limit = parseFloat((employeeResult.net_salary * employeeResult.credit_limit_percent) / 100);
                    }

                    rupyoCreditLimit = employeeResult.rupyo_credit_limit;

                    // Set payout request status is pending
                    let pendingStatus = enumValue.pendingStatus;
                    let approvedStatus = enumValue.approvedStatus;
                    let holdStatus = enumValue.holdStatus;

                    // AVAILABE AMOUNT ACTION
                    // Process in amount already added in availableAmountAction method
                    let availableAmountActionResult = await availableAmountAction(employeeResult);

                    let availableAmount = availableAmountActionResult.availableAmount;
                    let payoutCredited = availableAmountActionResult.payoutCredited;

                    // Final count of amount_in_process 
                    processInAmount = parseInt(reqBody.amount);

                    printLogger(2, `employerRemainingCreditLimit:-  ${employerRemainingCreditLimit}`, 'transaction');
                    printLogger(2, `availableAmount:-  ${availableAmount}`, 'transaction');
                    printLogger(2, `processInAmount:- ${processInAmount}`, 'transaction');

                    // console.log("employerRemainingCreditLimit:- ", employerRemainingCreditLimit)
                    // console.log("availableAmount:- ", availableAmount)
                    // console.log("processInAmount:- ", processInAmount)

                    if (processInAmount <= availableAmount && processInAmount <= employerRemainingCreditLimit) {

                        /*  START ***  NBFC loan process */
                        let loanId

                        // Set NBFC loan api payload
                        let bodyObj = `{
                            "employer_kyc_data": {
                                "company_name": ${companyDetail.company_name},
                                "pan": ${companyDetail.pan_card ? key.decrypt(companyDetail.pan_card, `utf8`) : ''},
                                "gst": ${companyDetail.gst_number},
                                "cin_partership_id": ${companyDetail.company_cin ? key.decrypt(companyDetail.company_cin, `utf8`) : ''}
                                "incorporation_date": ${companyDetail.incorporation_date},
                                "gurantor_name": ${companyDetail.gurantor_name}
                            },
                            "employee_kyc_data": {
                                "employee_name": ${employeeResult.first_name} ${employeeResult.last_name},
                                "dob": ${employeeResult.dob},
                                "pan": ${employeeResult.bank_details.pan_card ? key.decrypt(employeeResult.bank_details.pan_card, `utf8`) : ''},
                                "aadhar_card": ${employeeResult.aadhar_card},
                                "mobile_number": ${employeeResult.mobile_number},
                                "father_mother_name": ${employeeResult.father_mother_name},
                                "address1": ${employeeResult.address.address_1},
                                "address2": ${employeeResult.address.address_2},
                                "pincode": ${employeeResult.address.pincode},
                                "country": ${employeeResult.address.country},
                                "bank_name": ${employeeResult.bank_details.bank_name ? key.decrypt(employeeResult.bank_details.bank_name, `utf8`) : ''},
                                "branch": ${employeeResult.bank_details.branch_name ? key.decrypt(employeeResult.bank_details.branch_name, `utf8`) : ''},
                                "account_number": ${employeeResult.bank_details.account_number ? key.decrypt(employeeResult.bank_details.account_number, `utf8`) : ''},
                                "ifsc_code": ${employeeResult.bank_details.ifsc_code ? key.decrypt(employeeResult.bank_details.ifsc_code, `utf8`) : ''},
                            },
                            "loan_request": {
                                "loan_request_amount": ${reqBody.amount},
                                "requested_date": ${moment().utc().valueOf()},
                                "repayment_date": ""
                            }
                        }`;

                        // Set NBFC loan api options
                        let options = {
                            'method': '',
                            'url': '',
                            'headers': {
                                'Authorization': '',
                                'Content-Type': 'application/json'
                            },
                            'body': bodyObj
                        };
                        printLogger(2, `NBFC loan api request options:- ${options}`, 'transaction');

                        // Call NBFC loan api
                        request(options, (error, response) => {
                            if (error) {
                                printLogger(0, " ********* sendPushNotification ************** ", 'transaction');
                                printLogger(0, `error:-  ${error}`, 'transaction');
                            }
                            else {

                                printLogger(2, `response.body:-  ${response.body}`, 'transaction');
                                loanId = response.body
                            }
                        });

                        /*  END  ***  NBFC loan process */

                        // Genereate random string for request id 
                        let _randomString = randomString(12);

                        // 14 digit request id
                        let requestId = `RP${_randomString}`;

                        let statusTracker = [
                            {
                                "status": pendingStatus,
                                "status_made": Date.now(),
                                "status_made_by": employeeResult._id
                            }
                        ];

                        // Payout request
                        let reqData = {
                            "first_name": employeeResult.first_name,
                            "middle_name": employeeResult.middle_name,
                            "last_name": employeeResult.last_name,
                            "company_name": employeeResult.company_name,
                            "company_id": employeeResult.company_id,
                            "user_id": employeeResult._id,
                            "date_time": moment().utc().valueOf(),
                            "request_id": requestId,
                            "loan_id": loanId,
                            "amount": reqBody.amount,
                            "status": pendingStatus,
                            "remaining_amount": availableAmount - reqBody.amount,
                            "status_tracker": statusTracker,
                            "created_by": req.userData._id
                        }

                        // Payout request
                        let payoutRequestResult = await transactionModel.payoutRequest(reqData)

                        let resultResponse = {
                            "amount_available": availableAmount,
                            "total_amount_withdrawn": payoutCredited,
                            "amount_in_process": processInAmount,
                            "total_net_salary": employeeResult.net_salary ? employeeResult.net_salary : ""
                        }

                        let payoutNotificationData = {
                            "employee_name": employeeResult.first_name + " " + employeeResult.last_name,
                            "employee_id": employeeResult.employee_id,
                            "company_name": employeeResult.company_name,
                            "company_id": employeeResult.company_id,
                            "request_id": requestId,
                            "amount": reqBody.amount,
                            "date": moment().format("LL"),
                            "time": moment().utcOffset("+05:30").format('hh:mm:ss A')
                        };

                        // Notification message for rupyo admin
                        let notificationMessageForAdmin = notification.payoutRequestNotificationForAdmin(payoutNotificationData);

                        // Notification message for employer
                        let notificationMessageForEmployer = notification.payoutRequestNotificationForEmployer(payoutNotificationData);

                        // Notification message employee
                        let notificationMessageForEmployee = notification.payoutRequestNotificationForEmployee(payoutNotificationData);

                        let notificationsData = [];

                        // Notification for rupyo admin
                        notificationsData.push({
                            "user_id": req.userData._id,
                            "company_id": employeeResult.company_id,
                            "message": notificationMessageForAdmin,
                            "resource_type": enumValue.payoutStatus,
                            "status": enumValue.pendingStatus,
                            "request_id": requestId,
                            "for_notifications": enumValue.rupyoAdminRoleId,
                            "created_by": employeeResult._id
                        });

                        // Notification for employer
                        notificationsData.push({
                            "user_id": req.userData._id,
                            "company_id": employeeResult.company_id,
                            "message": notificationMessageForEmployer,
                            "resource_type": enumValue.payoutStatus,
                            "status": enumValue.pendingStatus,
                            "request_id": requestId,
                            "for_notifications": enumValue.employerRoleId,
                            "created_by": employeeResult._id
                        });

                        // Notification for employee
                        notificationsData.push({
                            "user_id": req.userData._id,
                            "company_id": employeeResult.company_id,
                            "message": notificationMessageForEmployee,
                            "resource_type": enumValue.payoutStatus,
                            "status": enumValue.pendingStatus,
                            "request_id": requestId,
                            "for_notifications": enumValue.employeeRoleId,
                            "created_by": employeeResult._id
                        });

                        notificationsModel.bulkInsert(notificationsData);

                        printLogger(2, resultResponse, 'transaction');
                        return response(res, 200, true, message.insertSuccessfully('Payout request'), resultResponse);
                    }

                    // If pending request amount is greater than available amount or employer remaining credit limit
                    else {
                        throw errData(200, message.canNotRequest(), null);
                    }
                }
            }

            // Company and employee status are not active
            else {
                throw errData(200, message.companyNotActive(), null);
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
        printLogger(0, error, 'transaction');
        // return response(res, 500, false, message.error(error), '');
        next(error)
    }
};


// Employees transactions list
exports.transactionsList = async (req, res, next) => {
    try {
        printLogger(2, ` ***************  ${req.originalUrl} ****************  `, 'transaction');

        let reqBody = req.body;
        let payoutApproveAccess = false;
        let payoutCreditAccess = false;

        if (req.userData.role_id === enumValue.rupyoAdminRoleId) {

            let currentAdminDetails = { "user_id": req.userData._id };

            // Get admin details
            let rupyoAdminResult = await userModel.findRupyoAdmin(currentAdminDetails);
            payoutApproveAccess = rupyoAdminResult != null ? rupyoAdminResult.have_payout_approve_access : false;
            payoutCreditAccess = rupyoAdminResult != null ? rupyoAdminResult.have_payout_credit_access : false;
        }
        else if (req.userData.role_id === enumValue.superAdminRoleId) {

            // Super admin payout approve, credit access always true
            payoutApproveAccess = true;
            payoutCreditAccess = true;
        }

        let companyId = req.userData.role_id === enumValue.employerRoleId ? req.userData.company_id : reqBody.company_id;

        // Get transaction list data
        let listResult = await transactionModel.transactionsList(reqBody, companyId);

        // Set have_payout_approve_access, have_payout_credit_access key (Bydefault false)
        listResult.have_payout_approve_access = payoutApproveAccess;
        listResult.have_payout_credit_access = payoutCreditAccess;

        if (listResult.result.length > 0) {

            printLogger(2, listResult, 'transaction');
            return response(res, 200, true, message.dataFound(), listResult);
        }
        else {

            // let dataResult = [{
            //     "value": '',
            //     "msg": message.noDataFound(),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(0, dataResult, 'transaction');
            // return response(res, 200, false, message.noDataFound(), dataResult);
            throw errData(200, message.noDataFound(), null);
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'transaction');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};

// Employees transactions list
exports.listById = async (req, res, next) => {
    try {
        printLogger(2, ` ***************  ${req.originalUrl} ****************  `, 'transaction');

        let reqBody = req.body;
        let payoutApproveAccess = false;
        let payoutCreditAccess = false;

        if (req.userData.role_id === enumValue.rupyoAdminRoleId) {

            let currentAdminDetails = { "user_id": req.userData._id };

            // Get admin details
            let rupyoAdminResult = await userModel.findRupyoAdmin(currentAdminDetails);
            payoutApproveAccess = rupyoAdminResult != null ? rupyoAdminResult.have_payout_approve_access : false;
            payoutCreditAccess = rupyoAdminResult != null ? rupyoAdminResult.have_payout_credit_access : false;
        }
        else if (req.userData.role_id === enumValue.superAdminRoleId) {

            // Super admin payout approve, credit access always true
            payoutApproveAccess = true;
            payoutCreditAccess = true;
        }


        // Get transaction list data
        let listResult = await transactionModel.transactionsListById(reqBody);
       // console.log("listResult", listResult[0]);
        // Set have_payout_approve_access, have_payout_credit_access key (Bydefault false)
        // listResult.have_payout_approve_access = payoutApproveAccess;
        // listResult.have_payout_credit_access = payoutCreditAccess;

        if (listResult.length > 0) {

            printLogger(2, listResult, 'transaction');
            return response(res, 200, true, message.dataFound(), listResult[0]);
        }
        else {
            throw errData(200, message.noDataFound(), null);
        }
    }
    catch (error) {
        printLogger(0, error, 'transaction');
        next(error)
    }
};


// Employees transaction details (by payout request id)
exports.transactionDetails = async (req, res, next) => {
    try {
        printLogger(2, ` ***************  ${req.originalUrl} ****************  `, 'transaction');

        let reqBody = req.body;
        let requestId = reqBody.request_id;

        let result = await transactionModel.transactionDetails(requestId);
        let transactionDetailsResult = result[0];

        if (result.length <= 0) {
            throw errData(200, message.noDataFound('Transaction'), null);
        }
        else {

            for (let i = 0; i < transactionDetailsResult.status_tracker.length; i++) {

                let statusMadeBy = transactionDetailsResult.status_tracker[i].status_made_by ? transactionDetailsResult.status_tracker[i].status_made_by : "";

                let checkData;
                if (statusMadeBy !== "") {
                    checkData = { "_id": ObjectId(transactionDetailsResult.status_tracker[i].status_made_by) }
                    let userResult = await userModel.find(checkData);

                    let firstName = userResult.first_name ? userResult.first_name : "";
                    let middleName = userResult.middle_name ? userResult.middle_name : "";
                    let lastName = userResult.last_name ? userResult.last_name : "";

                    let adminName = firstName + " " + middleName + " " + lastName;
                    transactionDetailsResult.status_tracker[i].admin_name = adminName;
                }
                else {
                    transactionDetailsResult.status_tracker[i].admin_name = "NBFC";
                }



                //transactionDetailsResult.status_tracker[i].admin_name = adminName;

                // Transaction details imps receipt link
                for (j = 0; j < transactionDetailsResult.status_tracker.length; j++) {

                    if (transactionDetailsResult.status_tracker[j].imps_receipt_link !== undefined && transactionDetailsResult.status_tracker[j].imps_receipt_link !== null) {

                        let impsReceiptUrl = await tokenMethod.getCloudFrontURL(transactionDetailsResult.status_tracker[j].imps_receipt_link);
                        transactionDetailsResult.status_tracker[j].imps_receipt_link = impsReceiptUrl;
                    }
                }
            }

            printLogger(2, transactionDetailsResult, 'transaction');
            return response(res, 200, true, message.dataFound('Transaction'), transactionDetailsResult);
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'transaction');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Employee transactions list (Mobile application)
exports.employeeTransactions = async (req, res, next) => {
    try {
        printLogger(2, ` ***************  ${req.originalUrl} ****************  `, 'transaction');

        let reqQuery = req.query;
        let roleId = parseInt(req.userData.role_id)
        let userId = roleId === enumValue.employeeRoleId ? req.userData._id : "";
        let companyId = roleId === enumValue.employerRoleId ? req.userData.company_id : "";

        let reqFilter = {
            "user_id": userId,
            "status": parseInt(reqQuery.type),
            "time_filter": parseInt(reqQuery.year),
            "page": parseInt(reqQuery.page),
            "company_id": companyId,
            "search_name": reqQuery.search_name
        };

        let listResult = await transactionModel.employeeTransactionsList(reqFilter)

        if (listResult.length == 0) {

            // let dataResult = [{
            //     "value": '',
            //     "msg": message.noDataFound(),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(0, dataResult, 'transaction');
            // return response(res, 200, false, message.noDataFound(), dataResult);
            throw errData(200, message.noDataFound(), null);
        }
        else {

            for (i = 0; i < listResult.length; i++) {

                if (!listResult[i].imps_receipt_link) {

                    listResult[i].imps_receipt_link = "";
                }
            }
            printLogger(2, listResult, 'transaction');
            return response(res, 200, true, message.dataFound(), listResult);
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'transaction');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Update transaction
exports.updateTransaction = async (req, res, next) => {
    try {
        printLogger(2, ` ***************  ${req.originalUrl} ****************  `, 'transaction');

        let reqBody = req.body;
        let _status = reqBody.status;
        let transactionCharge = 0;
        let impsReceiptNumber = '';
        let transactionMessage = '';
        let data;

        let currentMonth = moment().utc().format('M');

        let transactionId = { "_id": reqBody._id };

        let _result = await transactionModel.getTransactionDetails(transactionId);

        let payoutRequestMonth = moment(_result.created_at).format('M');

        // Check payout request month
        // You can update only current month request
        if (currentMonth === payoutRequestMonth) {

            let checkData = { "employee_id": _result.user_id };
            //   console.log("checkData",checkData);

            let employeeResult = await employeesModel.findEmployee(checkData);

            let statusTracker = [];

            if (_result.status_tracker) {
                statusTracker = _result.status_tracker
            }

            // If transaction status is rejected
            if (_status === enumValue.rejectedStatus) {

                let statusTracketData = {
                    "status": _status,
                    "status_made": Date.now(),
                    "status_made_by": req.userData._id
                }
                statusTracker.push(statusTracketData)

                data = {
                    "status": _status,
                    "remaining_amount": (_result.remaining_amount + _result.amount) || 0,
                    "transaction_message": reqBody.transaction_message,
                    "status_tracker": statusTracker,
                    "updated_by": req.userData._id,
                }
            }

            // Check employee available amount
            else {
                let checkDataForEmployer = {
                    "days_filter": enumValue._thisMonth,
                    "company_id": employeeResult.company_id
                }
//console.log("checkDataForEmployer",checkDataForEmployer);
                // Check Company remaining credit limit
                let transactionResult = await transactionModel.transactionsFilterListMonthly(checkDataForEmployer);

                let totalAmountPaid = transactionResult[0].payoutCount[0] === undefined || transactionResult[0].payoutCount[0] === null ? 0 : transactionResult[0].payoutCount[0].totalAmount;

                let companyRupyoCreditLimit = employeeResult.Company.rupyo_credit_limit;

                let employerRemainingCreditLimit = parseFloat((companyRupyoCreditLimit - totalAmountPaid));

                // Check employer remaining credit limit
                if (_result.amount <= employerRemainingCreditLimit) {

                    let currentAdminDetails = { "user_id": req.userData._id };

                    // Get admin details
                    let rupyoAdminResult = await userModel.findRupyoAdmin(currentAdminDetails);

                    // If transaction status is approved
                    if (_status === enumValue.approvedStatus) {

                        // Request For NBFC
                        let _data = await loadRequestToNBFC(transactionId);
                        //  console.log("_data", _data);
                        _status = _data.status;

                        // Check rupyo admin have access to approve payout request
                        if (rupyoAdminResult.have_payout_approve_access && rupyoAdminResult.have_payout_approve_access === true) {

                            let statusTracketData = {
                                "status": _status,
                                "status_made": Date.now(),
                                "status_made_by": req.userData._id
                            }
                            statusTracker.push(statusTracketData)


                            data = {
                                "status": _status,
                                "transaction_charge": 0,
                                "transaction_message": reqBody.transaction_message,
                                "status_tracker": statusTracker,
                                "updated_by": req.userData._id,
                                "loan_status_tracker": _data.loan_status_tracker,
                                "loan_id": _data.loan_id,
                                "transaction_message": _data.transaction_message,

                            }
                        }

                        // Current logged in admin don't have access to approve the payout request
                        else {
                            throw errData(200, message.dontHaveAccessToApprovePayout(), null);
                        }
                    }


                    // If transaction status is credited 
                    else if (_status === enumValue.creditedStatus) {

                        // Check rupyo admin have access to credit payout request
                        if (rupyoAdminResult.have_payout_credit_access && rupyoAdminResult.have_payout_credit_access === true) {

                            let statusTracketData = {
                                "status": _status,
                                "status_made": Date.now(),
                                "status_made_by": req.userData._id,
                                "imps_receipt_link": reqBody.imps_receipt_link
                            }
                            statusTracker.push(statusTracketData)

                            data = {
                                "status": _status,
                                "amount": parseFloat(_result.amount),
                                "imps_receipt_number": reqBody.imps_receipt_number,
                                "imps_receipt_link": reqBody.imps_receipt_link,
                                "transaction_charge": 0,
                                "transaction_message": reqBody.transaction_message,
                                "status_tracker": statusTracker,
                                "updated_by": req.userData._id,
                            }
                        }

                        // Current logged in admin don't have access to credit the payout request
                        else {
                            throw errData(200, message.dontHaveAccessToCreditPayout(), null);
                        }
                    }
                }
                else {

                    printLogger(2, employerRemainingCreditLimit, 'transaction');
                    // return response(res, 200, false, message.employerCreditLimitExhausted(), "");
                    throw errData(200, message.employerCreditLimitExhausted(), null);
                }
            }


            // Update transaction
            let result = await transactionModel.updateTransaction(transactionId, data);

            if (result === null || result === undefined) {
                throw errData(200, message.unableToUpdate('Transaction'), null);
            }
            else {

                result.status = _status;
                result.imps_receipt_number = reqBody.imps_receipt_number;
                result.imps_receipt_link = reqBody.imps_receipt_link;
                result.transaction_charge = 0;
                result.transaction_message = reqBody.transaction_message;
                result.updated_by = req.userData._id;

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
                    "requested_amount": parseInt(_result.amount),
                    "credited_amount": parseInt(_result.amount - (_result.amount * transactionDeductionPercent / 100)),
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
        else {
            throw errData(200, message.updateOnlyCurrentMonthRequest(), null);
        }
    }
    catch (error) {
        printLogger(0, error, 'transaction');
        next(error)
    }
};


// Sign in common function for sign in and auto sign in (employee)
let loadRequestToNBFC = async (transactionId) => {

    let data;
    try {
        printLogger(2, `NBFC loan api request transactionId:- ${JSON.stringify(transactionId)}`, 'scheduler');

       // console.log("transactionId", transactionId);
        let listResultOld = await transactionModel.transactionsListById(transactionId);
        listResult = listResultOld[0];
        printLogger(2, `NBFC loan api request listResult:- ${JSON.stringify(listResult)}`, 'scheduler');
        //  printLogger(2, `NBFC loan api request listResult parse:- ${JSON.parse(JSON.stringify(listResult))}`, 'scheduler');
        // console.log("listResult", listResult);

       // console.log("roc_type", listResult.Company.roc_type);
        /*  console.log("first_name", listResult.company_first_name);
         console.log("last_name", listResult.company_last_name);
         console.log("middle_name", listResult.company_middle_name);
         console.log("email", listResult.company_email);
         console.log("mobile_number", listResult.company_mobile_number);
         console.log("address_1", listResult.Company.address.address_1);
         console.log("address_2", listResult.Company.address.address_2);
         console.log("pin_code", listResult.Company.address.pin_code);
         console.log("city", listResult.Company.address.city);
         console.log("state", listResult.Company.address.state);
         console.log("country", listResult.Company.address.country);
         console.log("bank_name", listResult.Company.bank_details.bank_name);
         console.log("account_number", listResult.Company.bank_details.account_number);
         console.log("ifsc_code", listResult.Company.bank_details.ifsc_code);
         console.log("branch_name", listResult.Company.bank_details.branch_name);
         console.log("bank_account_type", listResult.Company.bank_details.bank_account_type); */

        //    console.log("bank_name",listResult.bank_details.bank_name);
        /*Employee Bank Details*/

        let rocType = listResult.Company.roc_type ? listResult.Company.roc_type : 1;
        let NameRocType = '';
        if (rocType === 1) {
            NameRocType = 'Private Limited';
        }
        else {
            NameRocType = 'Partnership';
        }

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
            company_cin: listResult.company_cin,
            bank_name: listResult.Company.bank_details.bank_name,
            account_number: listResult.Company.bank_details.account_number,
            ifsc_code: listResult.Company.bank_details.ifsc_code,
            bank_account_type: listResult.Company.bank_details.bank_account_type,
            branch_name: listResult.Company.bank_details.branch_name
        };
        //console.log("employerDecryptDetail", employerBankDetail);
        let employerDecryptDetail = decryptData(employerBankDetail);
        //  console.log("employerDecryptDetail", employerDecryptDetail);

        let guarantor_name = listResult.company_gurantor_name ? listResult.company_gurantor_name : "";
        let company_gst_number = listResult.company_gst_number ? listResult.company_gst_number : "";

        let employerPayTransactionCharge = false;
        //// Get current month employer_pay_transaction_charge value from commonFunction
        employerPayTransactionCharge = transactionChargeSetting(listResult.Company);
        let transaction_type = employerPayTransactionCharge.employer_pay_transaction_charge == true ? "Employer" : "Employee";
        //console.log("guarantor_name",guarantor_name);
        //console.log("empDecryptDetail", empDecryptDetail);

        //printLogger(2, `***************** ${req.originalUrl} *******************`, 'scheduler');

        //  DONT DELETE
        //  printLogger(2, `payload body getLoanData - ${JSON.stringify(req.body)}`, 'scheduler');

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
            "guarantor_name": "${guarantor_name}",
            "employer_address_1": "${listResult.Company.address.address_1}",
            "employer_address_2": "${listResult.Company.address.address_2 || ""}",
            "employer_district":"",
            "employer_state": "${listResult.Company.address.state}",
            "employer_pincode": ${listResult.Company.address.pincode},
            "organization_type": "${NameRocType}",
            "employer_bank_name": "${employerDecryptDetail.bank_name}",
            "employer_bank_branch": "${employerDecryptDetail.branch_name}",
            "employer_account_number": "${employerDecryptDetail.account_number}",
            "employer_bank_ifsc": "${employerDecryptDetail.ifsc_code}"
            }`;

        let employee_kyc_data = `{ 
                    "employee_name": "${listResult.first_name}",
                    "employee_middle_name": "${listResult.middle_name}",
                    "employee_last_name": "${listResult.last_name}",
                    "email_id": "${listResult.email}",
                    "gender": "${listResult.gender}",
                    "dob": "${dob}",
                    "pan": "${empDecryptDetail.pan_card}",
                    "aadhar_card": "${listResult.employee_aadhar_card}" ,
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

        let bodyObj = `{"RequestData":{
            "Body": [
                {
                    "employer_kyc_data" : ${employer_kyc_data},
                    "employee_kyc_data" : ${employee_kyc_data},
                    "loan_request" : ${loan_request}
                }]
            }
        }`;
      //  console.log("bodyObj", bodyObj);
        printLogger(2, `NBFC loan api request bodyObj:- ${bodyObj}`, 'scheduler');
        // Set NBFC loan api options Stage 
        /*let options = {
            'method': 'POST',
           // 'url': 'https://lms.satinfinserv.com/LMS/rupyo/api/pushLoanApplications',
            'url': 'https://lmsuat.satincreditcare.com/LMS/rupyo/api/pushLoanApplications',
            'headers': {
                'Authorization': '',
                'Content-Type': 'application/json',
                'x-lms-access-key-id': 'RUPYO_API',
                'x-lms-secret-access-key': '5yvDxn4(~MZ&C9he',
                'vendorName': 'RUPYO'
            },
            'body': bodyObj
        };*/
        let options = {
            'method': 'POST',
            'url': 'https://lms.satinfinserv.com/LMS/rupyo/api/pushLoanApplications',
            //'url': 'https://lmsuat.satincreditcare.com/LMS/rupyo/api/pushLoanApplications',
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
        //   printLogger(2, `NBFC loan api request options Pars:- ${JSON.parse(options)}`, 'scheduler');
        // console.log("options", JSON.stringify(options));
        let messageResponce = `Loan Request of requestID:-'${JSON.stringify(listResult.request_id)}`;

        sendEmail('pmandloi@flair-solution.com', 'njhawar@flair-solution.com', `<div>[${JSON.stringify(options)}] :-</div>`, messageResponce);

        //let data;

        // Call NBFC loan api


        let data = new Promise((resolve, reject) => {
            request(options, async (error, response) => {
                if (error) {
                    printLogger(0, " ********* sendPushNotification ************** ", 'scheduler');
                    printLogger(0, `error:-  ${error}`, 'scheduler');
                    // console.log("error", error);
                }
                else {
                    let Loan_status_tracker = [];
                    printLogger(0, " ********* loadRequestToNBFC ************** ", 'scheduler');

                    printLogger(2, `response.body:-  ${response.body}`, 'scheduler');



                    // result = response.body;
                   // console.log("response.body", response.body);
                    // console.log("listResult.loan_status_tracker", listResult.loan_status_tracker);

                    let JsonPars = JSON.parse(response.body);
                    let _status = 11;

                    let messageResponce = `Loan Request of requestID:-'${JsonPars}`;

                    sendEmail('pmandloi@flair-solution.com', 'njhawar@flair-solution.com', `<div>[${JSON.stringify(options)}] :-</div>`, messageResponce);

                    //console.log("JsonPars", JsonPars);
                    printLogger(2, `JsonPars:-  ${JsonPars}`, 'scheduler');

                    // console.log("loan_id", JsonPars.Loans[0].loan_id);
                    //console.log("status", JsonPars.Loans[0].status);

                    let loan_id = JsonPars.Loans[0].loan_id;

                    let responceStatus = JsonPars.Loans[0].status;

                    // status
                    if (responceStatus == "PENDING") {
                        _status = 12;
                    }
                    else if (responceStatus == "ACTIVE") {
                        _status = 13;
                    }
                    else if (responceStatus == "REJECTED") {
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

                    data = {
                        "loan_id": loan_id,
                        "status": _status,
                        "transaction_message": response.body,
                        "imps_receipt_number": Loan_status_tracker,
                    }
                    // console.log("data in", data);
                    // console.log("response",response);

                    // let result = await transactionModel.updateTransactionNew(reqBody._id, data);
                    //  console.log("result",result);
                    // sendEmail('pmandloi@flair-solution.com', 'njhawar@flair-solution.com', `<div>[${JSON.stringify(data)}] :-</div>`, "Loan Request of requestID:-" `${listResult.request_id}`);

                    printLogger(2, `NBFC loan api request data:- ${JSON.stringify(data)}`, 'scheduler');
                    resolve(data);
                    return data;
                }
            });
        });
        return await data;
    }
    catch (error) {

        printLogger(0, `loadRequestToNBFC:- ${error}`, 'scheduler');
       // console.log(error);
        return false;
    }
};