// Init code
const { validationResult } = require('express-validator');
const moment = require('moment');

const notificationsController = require('../controllers/notifications.controller');
const transactionModel = require('../models/transaction.model');
const settlementModel = require('../models/settlement.model');
const { response } = require('../core/responseformat');
const tokenMethod = require("../core/getOpenIdToken");
const { message, printLogger, randomString, notification, enumValue, errData } = require('../core/utility');
const employerModel = require('../models/employer.model');


// Generate settlement report by employer
exports.generateSettlement = async (req, res, next) => {
    try {

        let reqBody = req.body;

        // Check validation errors
        const errors = validationResult(req)
        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), 'transaction');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            reqBody.year = parseInt(reqBody.year);
            reqBody.month = parseInt(reqBody.month);

            // Check settlement generated or not for given month and year
            let checkResult = await settlementModel.findSettlementByCompanyId(reqBody);

            if (checkResult === null || checkResult === undefined) {

                // Get given month, year credited amount
                let result = await transactionModel.employeeCreditedAmount(reqBody);

                if (result < 1) {

                    let dataResult = [{
                        "value": "",
                        "msg": message.payoutNotCredited(),
                        "param": "",
                        "location": ""
                    }]
                    printLogger(0, dataResult, 'transaction');
                    // return response(res, 200, false, message.payoutNotCredited(), dataResult);
                    throw errData(200, message.payoutNotCredited(), null);
                }
                else {

                    // Get company details
                    let employerResult = await employerModel.findCompany({ "company_id": reqBody.company_id });

                    // If employer result is null or undefined
                    if (employerResult === null || employerResult === undefined) {

                        let dataResult = [{
                            "value": "",
                            "msg": message.unauthorizedUser(),
                            "param": "",
                            "location": ""
                        }]
                        printLogger(0, dataResult, 'transaction');
                        // return response(res, 200, false, message.unauthorizedUser(), dataResult);
                        throw errData(200, message.unauthorizedUser(), null);
                    }

                    let payoutTransactionCharge = 0;

                    let employerPayTransactionCharge = false;
                    let transactionDeductionPercent = global.env.TRANSACTION_DEDUCTION_PERCENT;

                    let currentDate = new Date(reqBody.year, reqBody.month, 01);

                    // Get respective month employer_pay_transaction_charge value
                    if (employerResult.transaction_charge_setting && employerResult.transaction_charge_setting.length > 0) {

                        let transactionChargeArray = employerResult.transaction_charge_setting;

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

                    // Get respective month setting
                    if (employerPayTransactionCharge === true) {

                        // If employer_pay_transaction_charge is TRUE then we will calculate 2.5% transaction charge of requested amount
                        let _requestedAmount = parseFloat(result[0].requestedAmount.toFixed(2));
                        payoutTransactionCharge = ((_requestedAmount * transactionDeductionPercent) / 100);
                    }


                    // Genereate random string for settlement id 
                    let _randomString = randomString(12);

                    // 14 digit settlement id
                    let settlementId = `RP${_randomString}`;

                    let data = {
                        "settlement_id": settlementId,
                        "company_id": reqBody.company_id,
                        "year": reqBody.year,
                        "month": reqBody.month,
                        "requested_amount": parseFloat(result[0].requestedAmount.toFixed(2)),
                        "remaining_amount": parseFloat(result[0].requestedAmount.toFixed(2)) + parseFloat(payoutTransactionCharge.toFixed(2)),
                        "payout_transaction_charge": parseFloat(payoutTransactionCharge.toFixed(2)),
                        "status": enumValue.generatedStatus
                    }

                    let settlementResult = await settlementModel.generateSettlement(data);

                    if (settlementResult === null || settlementResult === undefined) {

                        // let dataResult = [{
                        //     "value": "",
                        //     "msg": message.dataCouldNotBeInserted('Settlement'),
                        //     "param": "",
                        //     "location": ""
                        // }]
                        // printLogger(0, dataResult, 'transaction');
                        // return response(res, 200, false, message.dataCouldNotBeInserted('Settlement'), dataResult);
                        throw errData(200, message.dataCouldNotBeInserted('Settlement'), null);
                    }
                    else {

                        // Get employer details
                        let result = await employerModel.employerProfile(reqBody);
                        let employerResult = result[0]

                        let notificationMessageParams = {
                            "employer_name": employerResult.first_name + " " + employerResult.last_name,
                            "company_name": employerResult.company_name,
                            "company_code": employerResult.rupyo_company_code,
                            "amount": settlementResult.requested_amount,
                            "year": settlementResult.year,
                            "month": settlementResult.month,
                            "date": moment().format("LL"),
                            "time": moment().utcOffset("+05:30").format('hh:mm:ss A')
                        }

                        let notificationMessage = notification.settlementGenerated(notificationMessageParams);

                        // Save notification for employer
                        let notificationsData = {
                            "user_id": employerResult._id,
                            "company_id": reqBody.company_id,
                            "message": notificationMessage,
                            "resource_type": enumValue.settlementResourceType,
                            "request_id": settlementId,
                            "status": enumValue.pendingStatus,
                            "for_notifications": enumValue.employerRoleId,
                            "created_by": req.userData._id

                        };
                        notificationsController.saveNotification(notificationsData);

                        // Settlement successfully generated
                        printLogger(2, settlementResult, 'transaction');
                        return response(res, 200, true, message.saveSuccessfully('Settlement'), settlementResult);
                    }
                }
            }

            // Settlement already generated
            else {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.settlementGenerated(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'transaction');
                // return response(res, 200, false, message.settlementGenerated(), dataResult);
                throw errData(200, message.settlementGenerated(), null);
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
        printLogger(0, error, 'transaction');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Settlement report list
exports.settlementList = async (req, res, next) => {
    try {

        let reqBody = req.body;
        let reqFilter = req.userData;

        let result = await settlementModel.settlementList(reqFilter, reqBody);

        if (result === null || result === undefined) {
            throw errData(200, message.noDataFound(), null);
        }
        else {

            printLogger(0, result, 'transaction');
            return response(res, 200, true, message.dataFound(), result);
        }
    }
    catch (error) {
        printLogger(0, error, 'transaction');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Update settlement request
exports.updateSettlement = async (req, res, next) => {
    try {
        let reqBody = req.body;

        let findResult = await settlementModel.findSettlement(reqBody);
       // console.log("result", findResult);
        // Settlement data not found
        if (findResult === null || findResult === undefined) {

            let dataResult = [{
                "value": "",
                "msg": message.noDataFound(),
                "param": "",
                "location": ""
            }]
            printLogger(0, dataResult, 'transaction');
            throw errData(200, message.noDataFound(), null);
        }
        else {

            let status = enumValue.partialPaidStatus;
            let requestedAmount = findResult.requested_amount;
            let paidAmount = 0;

            // If user not upload receipt
            if (reqBody.receipt_id === "") {
                throw errData(200, message.uploadReceipt(), null);
            }
            else {

                // Check non zero amount
                if (reqBody.paid_amount > 0) {
                    let paymentDetails = findResult.payment_details;

                    // Calculate paid amount till now
                    paymentDetails.forEach(el => {

                        paidAmount = parseFloat(paidAmount) + parseFloat(el.paid_amount);
                    })

                    paidAmount = parseFloat(paidAmount.toFixed(2)) + parseFloat(reqBody.paid_amount.toFixed(2));

                    // Check paid amount is not greater than remaining amount
                  //  if (reqBody.paid_amount <= parseFloat(findResult.remaining_amount.toFixed(2))) {

                        // Change settlement status is paid if paidAmount greater than equal remaining_amount
                        //if (paidAmount >= parseFloat(findResult.remaining_amount.toFixed(2)) ) {
                        if (paidAmount >= (parseFloat(findResult.requested_amount.toFixed(2)) + parseFloat(findResult.payout_transaction_charge.toFixed(2))) ) {
                            status = enumValue.paidStatus;
                        }
                        else {
                            status = enumValue.partialPaidStatus;
                        }

                        let paymentData = {
                            "imps_number": reqBody.imps_number,
                            "paid_amount": reqBody.paid_amount,
                            "receipt_id": reqBody.receipt_id,
                            "date_time": moment().utc()
                        }
                        paymentDetails.push(paymentData);

                        let data = {
                            "remaining_amount": parseFloat(findResult.remaining_amount) - parseFloat(reqBody.paid_amount),
                            "settlement_id": reqBody.settlement_id,
                            "payment_details": paymentDetails,  // array
                            "status": status,
                            "employer_id": req.userData._id
                        }

                        let updateResult = await settlementModel.updateSettlement(data);

                        if (updateResult.nModified < 1) {
                            throw errData(200, message.unableToUpdate('settlement'), null);
                        }
                        else {

                            // Send settlement notification to rupyo admin
                            // Get employer details
                            let result = await employerModel.employerProfile(req.userData);
                            let employerResult = result[0]

                            let notificationMessageParams = {
                                "company_code": employerResult.rupyo_company_code,
                                "company_name": employerResult.company_name,
                                "amount": reqBody.paid_amount,
                                "settlement_id": findResult.settlement_id,
                                "date": moment().format("LL"),
                                "time": moment().utcOffset("+05:30").format('hh:mm:ss A')
                            }

                            let notificationMessage = notification.settlementPaid(notificationMessageParams);

                            // Save notification for employer
                            let notificationsData = {
                                "user_id": req.userData._id,
                                "company_id": findResult.company_id,
                                "message": notificationMessage,
                                "resource_type": enumValue.settlementResourceType,
                                "request_id": findResult.settlement_id,
                                "status": enumValue.pendingStatus,
                                "for_notifications": enumValue.rupyoAdminRoleId,
                                "created_by": req.userData._id

                            };
                            notificationsController.saveNotification(notificationsData);

                            // Settlement details updated
                            printLogger(0, updateResult, 'transaction');
                            return response(res, 200, true, message.updateSuccessfully('Settlement'), "");
                        }
                    /*}
                    else {
                        throw errData(200, message.settlementAmountGreater(), null);
                    }*/
                }

                // Amount should be greater then zero
                else {
                    throw errData(200, message.amountShouldBeGreaterThanZero(), null);
                }
            }
        }
    }
    catch (error) {
        printLogger(0, error, 'transaction');
        next(error)
    }
};


// Employer settlement details (by settlement id)
exports.settlementDetails = async (req, res, next) => {
    try {

        let reqBody = req.body;
        let settlementId = reqBody.settlement_id;

        let result = await settlementModel.settlementDetails(settlementId);
        let settlementDetailsResult = result[0]

        if (result.length <= 0) {

            // let dataResult = [{
            //     "value": '',
            //     "msg": message.noDataFound('Transaction'),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(0, dataResult, 'transaction');
            // return response(res, 200, false, message.noDataFound('Transaction'), dataResult);
            throw errData(200, message.noDataFound('Transaction'), null);
        }
        else {

            // Transaction details imps receipt link
            for (j = 0; j < settlementDetailsResult.payment_details.length; j++) {

                if (settlementDetailsResult.payment_details[j].receipt_id) {

                    let receiptIdUrl = await tokenMethod.getCloudFrontURL(settlementDetailsResult.payment_details[j].receipt_id);
                    settlementDetailsResult.payment_details[j].receipt_id = receiptIdUrl;

                    printLogger(2, `receiptIdUrl:- ${receiptIdUrl}`, 'transaction');
                }
                else {
                    settlementDetailsResult.payment_details[j].receipt_id = "";
                }
            }

            printLogger(2, settlementDetailsResult, 'transaction');
            return response(res, 200, true, message.dataFound('Transaction'), settlementDetailsResult);
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