const { validationResult } = require('express-validator');
const moment = require('moment');

const monthlyTransactionModel = require('../models/monthlyTransaction.model');

const { message, printLogger } = require('../core/utility');


// Save monthly transaction data
exports.saveMonthlyTransaction = async (transactionData) => {
    try {
        let employeeId = transactionData.user_id;
        let year = moment(transactionData.date_time).format('YYYY');
        let month = moment(transactionData.date_time).format('MM');
        let numberOfPayout = 1;

        // Find monthly transaction collection by year, month and employee id
        let checkData = {
            "year": year,
            "month": month,
            "employee_id": employeeId
        }

        let findResult = await monthlyTransactionModel.findMonthlyTransactionByYearMonth(checkData)

        if (findResult === null || findResult === undefined) {

            /*  Create monthly transaction data */

            let monthlyData = {
                "employee_id": employeeId,
                "company_id": transactionData.company_id,
                "first_name": transactionData.first_name,
                "last_name": transactionData.last_name,
                "company_name": transactionData.company_name,
                "request_id": transactionData.request_id,
                "year": year,
                "month": month,
                "payout_credited": transactionData.amount,
                "number_of_payout": numberOfPayout
            }

            let saveResult = await monthlyTransactionModel.createMonthlyTransaction(monthlyData)
            printLogger(2, saveResult, 'transaction');
        }
        else {

            /* Update monthly transaction data */

            let data = {
                "monthlyTransactionId": findResult._id,
                "amount": findResult.payout_credited + transactionData.amount,
                "numberOfPayout": findResult.number_of_payout + 1
            }

            let updateResult = await monthlyTransactionModel.updateMonthlyTransaction(data)
            printLogger(2, updateResult, 'transaction');
        }
    }
    catch (error) {

        printLogger(0, error, 'transaction');
    }
};