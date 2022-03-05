// Init code
const { validationResult } = require('express-validator');
const Excel = require('exceljs');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

const { response } = require('../core/responseformat');
const { message, printLogger, enumValue, getStatusString, getMonthName, errData } = require('../core/utility');

const employeesModel = require('../models/employees.model');
const employerModel = require('../models/employer.model');
const transactionModel = require('../models/transaction.model');
const settlementModel = require('../models/settlement.model');
const { transactionChargeSetting } = require('../core/commonFunctions');
const { transactionChargeSettingTesting } = require('../core/commonFunctions');

// Employee status report in employee list
exports.employeeStatusReport = async (req, res, next) => {
    try {
        const errors = validationResult(req);

        // If some errors
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'report');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let reqQuery = req.query;

            if (req.query.company_id) { reqQuery.company_id = (req.query.company_id).toString() }

            let _milis = new Date();
            let milis = _milis.getTime();
            let totalDays = moment().utc().endOf('month').format("D");

            // Make directory
            let dir = path.join('./public/excels/employee_status_report');

            if (!fs.existsSync(dir)) { fs.mkdirSync(dir); }

            // Employee payout 
            let employeesResult = await employeesModel.companyWiseEmployeeReport(reqQuery);

            if (employeesResult.length > 0) {

                for (let i = 0; i < employeesResult.length; i++) {

                    let netPayPerDay = 0;

                    netPayPerMonth = parseFloat(employeesResult[i].net_salary);
                    netPayPerDay = parseFloat(netPayPerMonth) / parseFloat(totalDays);

                    let encBankDetails = {
                        bank_name: employeesResult[i].bank_name,
                        account_number: employeesResult[i].account_number,
                        ifsc_code: employeesResult[i].ifsc_code,
                        pan_card: employeesResult[i].pan_card,
                        name_in_bank: employeesResult[i].name_in_bank,
                        bank_account_type: employeesResult[i].bank_account_type,
                        branch_name: employeesResult[i].branch_name
                    };

                    // Bank details decryption file call
                    let decryptionDetail = decryptData(encBankDetails);

                    employeesResult[i].bank_name = decryptionDetail.bank_name,
                        employeesResult[i].account_number = decryptionDetail.account_number,
                        employeesResult[i].ifsc_code = decryptionDetail.ifsc_code,
                        employeesResult[i].pan_card = decryptionDetail.pan_card,
                        employeesResult[i].name_in_bank = decryptionDetail.name_in_bank,
                        employeesResult[i].bank_account_type = decryptionDetail.bank_account_type,
                        employeesResult[i].branch_name = decryptionDetail.branch_name,
                        employeesResult[i].serial_number = i + 1,
                        employeesResult[i].employee_name = employeesResult[i].first_name + " " + employeesResult[i].last_name,
                        employeesResult[i].net_pay_per_day = parseFloat(netPayPerDay.toFixed(2)) || 0,

                        // Get employee status string
                        employeesResult[i].status = getStatusString(employeesResult[i].status)
                }


                // Excel file data store
                let workbook = new Excel.Workbook()
                let worksheet = workbook.addWorksheet('New Sheet');

                // Columns set
                worksheet.columns = [
                    { header: 'SR No.', key: 'serial_number' },
                    { header: "Employee's Name", key: 'employee_name' },
                    { header: 'Employee ID', key: 'employee_id' },
                    { header: 'Status', key: 'status' },
                    { header: 'PF A/C No.', key: '' },
                    { header: 'ESI No.', key: '' },
                    { header: 'UAN', key: '' },
                    { header: 'Aadhar Card', key: 'aadhar_card' },
                    { header: 'PAN NO.', key: 'pan_card' },
                    { header: 'Bank Account No.', key: 'account_number' },
                    { header: 'Bank Name', key: 'bank_name' },
                    { header: 'IFSC/MICR', key: 'ifsc_code' },
                    { header: 'Name In Bank', key: 'name_in_bank' },
                    { header: 'Bank Account Type', key: 'bank_account_type' },
                    { header: 'Branch Name', key: 'branch_name' },
                    { header: 'Gender', key: 'gender' },
                    { header: 'Cibil Score', key: 'cibil_score' },
                    { header: 'DOB', key: 'dob' },
                    { header: 'Father Mother Name', key: 'father_mother_name' },
                    { header: 'Mobile Number', key: 'mobile_number' },
                    { header: 'Basic Pay', key: 'basic_pay' },
                    { header: 'Total Additions', key: 'additional_pay' },
                    { header: 'Total Deductions', key: 'net_deductions' },
                    { header: 'Net Pay', key: 'net_salary' }
                ]

                // formatting the header
                worksheet.columns.forEach(column => {
                    column.width = column.header.length < 12 ? 12 : column.header.length
                })

                worksheet.getRow(1).font = { bold: true };


                /**  ROW FORMATTING  */
                // Add additional row (1)
                worksheet.insertRow(1);

                // Merged cell 
                worksheet.mergeCells('A1:X1');

                let companyName = reqQuery.company_id.length > 0 ? employeesResult[0].company_name : "All employers";

                // Get cell value
                worksheet.getCell('A1').value = `Company Name : ${companyName}`;
                worksheet.getCell('A1').font = { bold: false };


                // Add additional row (2)
                worksheet.insertRow(2);

                // Merged cell 
                worksheet.mergeCells('A2:X2');

                // Get cell value
                worksheet.getCell('A2').value = `Month Year : ${moment().format('MMMM')}-${moment().format('YYYY')}`;
                worksheet.getCell('A2').font = { bold: false };

                let rowIndex = 1
                // let earnedAmount = 0;
                // let payoutCredited = 0;

                // Insert the data into excel
                employeesResult.forEach((element, index) => {
                    rowIndex++

                    worksheet.addRow({
                        serial_number: element.serial_number,
                        employee_name: element.employee_name,
                        employee_id: element.employee_id,
                        status: element.status,
                        aadhar_card: element.aadhar_card,
                        pan_card: element.pan_card,
                        account_number: element.account_number,
                        bank_name: element.bank_name,
                        ifsc_code: element.ifsc_code,
                        name_in_bank: element.name_in_bank,
                        bank_account_type: element.bank_account_type,
                        branch_name: element.branch_name,
                        gender: element.gender,
                        cibil_score: element.cibil_score,
                        dob: element.dob,
                        father_mother_name: element.father_mother_name,
                        mobile_number: element.mobile_number,
                        basic_pay: parseInt(element.basic_pay) || 0,
                        additional_pay: parseInt(element.additional_pay) || 0,
                        net_deductions: parseInt(element.net_deductions) || 0,
                        net_salary: parseInt(element.net_salary) || 0
                    })
                })

                // Add additional row (Last row for total)
                worksheet.insertRow(rowIndex + 3);

                // Merged cell 
                worksheet.mergeCells(`A${rowIndex + 3}:X${rowIndex + 3}`);

                // Get cell value
                worksheet.getCell(`M${rowIndex + 3}`).value = `Total`;
                worksheet.getCell(`M${rowIndex + 3}`).font = { bold: true };

                // Formatting borders
                // loop through all of the rows and set the outline style.
                worksheet.eachRow({ includeEmpty: false },
                    function (row, rowNumber) {
                        worksheet.getCell(`A${rowNumber}`).border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'none' }
                        }

                        const insideColumns = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P','Q','R','S','T','U','V','W','X']
                        insideColumns.forEach((v) => {
                            worksheet.getCell(`${v}${rowNumber}`).border = {
                                top: { style: 'thin' },
                                bottom: { style: 'thin' },
                                left: { style: 'none' },
                                right: { style: 'none' }
                            }
                        })

                        worksheet.getCell(`X${rowNumber}`).border = {
                            top: { style: 'thin' },
                            left: { style: 'none' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        }
                    })

                //Saving the excel file
                await workbook.xlsx.writeFile(path.join('./public', 'excels', 'employee_status_report', `Export Employee - ${milis}.xlsx`));
                res.writeHead(200, {
                    "Content-Type": "application/octet-stream",
                    "Content-Disposition": `attachment; filename=Export Employee - ${milis}.xlsx`
                });

                let filePath = path.join(__dirname, '../', './public', 'excels', 'employee_status_report', `Export Employee - ${milis}.xlsx`);

                fs.createReadStream(filePath).pipe(res);
                return;
            }
            else {

                // Excel file data store
                let workbook = new Excel.Workbook()
                let worksheet = workbook.addWorksheet('New Sheet');

                //Saving the excel file
                await workbook.xlsx.writeFile(path.join('./public', 'excels', 'employee_status_report', `Export Employee - ${milis}.xlsx`));
                res.writeHead(200, {
                    "Content-Type": "application/octet-stream",
                    "Content-Disposition": `attachment; filename=Export Employee - ${milis}.xlsx`
                });

                let filePath = path.join(__dirname, '../', './public', 'excels', 'employee_status_report', `Export Employee - ${milis}.xlsx`);

                fs.createReadStream(filePath).pipe(res);
                return;
            }
        }
    }
    catch (error) {

        printLogger(0, error, 'report');
        next(error)
    }
};


// Ticket number 64/72
// Rupyo admin All Employers settlement report
exports.employerSettleMentReport = async (req, res, next) => {
    try {

        let data = { "role_id": req.userData.role_id };
        let reqBody = req.body;

        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'report');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }

        if (req.userData.role_id === enumValue.employerRoleId) {
            reqBody.company_id = [req.userData.company_id]
        }

        // File date
        let milis = new Date();
        milis = milis.getTime();

        // Make directory
        let dir = path.join('./public/excels/employer_settlement');

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        // Get settlement data
        let settlementResult = await settlementModel.settlementFilter(reqBody);

        // Number of employers
        let number_of_employers = settlementResult[0] === undefined || settlementResult[0] === null ? [] : settlementResult[0].company;
        let done = 0;

        if (number_of_employers.length > 0) {

            // Generate excel file
            let workbook = new Excel.Workbook()
            let worksheet = workbook.addWorksheet('New Sheet');

            // Columns set
            worksheet.columns = [
                { header: 'Settlement id', key: 'settlement_id' },
                { header: 'Company name', key: 'company_name' },
                { header: 'Company id', key: 'company_id' },
                { header: 'Year', key: 'year', width: 50 },
                { header: 'Month', key: 'month', width: 50 },
                { header: 'Requested amount', key: 'requested_amount' },
                { header: 'Paid amount', key: 'paid_amount', width: 80 },
                { header: 'Transaction charge', key: 'payout_transaction_charge', width: 80 },
                { header: 'Remaining amount', key: 'remaining_amount', width: 80 },
                { header: 'Status', key: 'status' },
            ]

            // formatting the header
            worksheet.columns.forEach(column => {
                column.width = 18
            })

            worksheet.getRow(1).font = {
                bold: true
            }


            /**  ROW FORMATTING  */
            // Add additional row (1)
            worksheet.insertRow(1);

            // Merged cell 
            worksheet.mergeCells('A1:J1');

            // Get cell value
            worksheet.getCell('A1').value = `EMPLOYER SETTLEMENT REPORT`;
            worksheet.getCell('A1').font = { bold: false };


            // Add additional row (2)
            worksheet.insertRow(2);

            // Merged cell 
            worksheet.mergeCells('A2:J2');

            // Get cell value
            worksheet.getCell('A2').value = `Current Date : ${moment().format('DD')}-${moment().format('MMMM')}-${moment().format('YYYY')}`;
            worksheet.getCell('A2').font = { bold: false };

            let rowIndex = 1

            // Insert the data into excel
            number_of_employers.forEach((element, index) => {
                done++;
                const rowIndex = index + 2

                let monthName = getMonthName(element.month);

                let payoutTransactionCharge = element.payout_transaction_charge === null || element.payout_transaction_charge === undefined ? 0 : element.payout_transaction_charge;
                let remainingAmount = element.remaining_amount === null || element.remaining_amount === undefined ? 0 : element.remaining_amount;

                let paidAmount = element.paid_amount === null || element.paid_amount === undefined ? 0 : element.paid_amount;

                // if (element.status != enumValue.generatedStatus) {
                //     paidAmount = element.requested_amount - element.remaining_amount;
                // }


                worksheet.addRow({
                    settlement_id: element.settlement_id,
                    company_name: element.company_name,
                    company_id: String(element.company_id),
                    year: element.year,
                    month: monthName, // element.month,
                    requested_amount: element.requested_amount === null || element.requested_amount === undefined ? `₹ 0` : `₹  ${element.requested_amount}`,
                    paid_amount: `₹ ${paidAmount}`,
                    remaining_amount: `₹ ${remainingAmount}`,
                    payout_transaction_charge: `₹ ${payoutTransactionCharge}`,
                    status: element.status === enumValue.generatedStatus ? "Generated" : element.status === enumValue.paidStatus ? "Paid" : element.status === enumValue.partialPaidStatus ? "Partially Paid" : "",
                })
            })

            // Formatting worksheet
            worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
                worksheet.getCell(`A${rowNumber}`).border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'none' }
                }

                const insideColumns = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
                insideColumns.forEach((v) => {
                    worksheet.getCell(`${v}${rowNumber}`).border = {
                        top: { style: 'thin' },
                        bottom: { style: 'thin' },
                        left: { style: 'none' },
                        right: { style: 'none' }
                    }
                })

                worksheet.getCell(`J${rowNumber}`).border = {
                    top: { style: 'thin' },
                    left: { style: 'none' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                }
            })

            //Saving the excel file
            await workbook.xlsx.writeFile(path.join('./public', 'excels', 'employer_settlement', `Employer settlement - ${milis}.xlsx`));
            res.writeHead(200, {
                "Content-Type": "application/octet-stream",
                "Content-Disposition": `attachment; filename=Employer settlement - ${milis}.xlsx`
            });

            let filePath = path.join(__dirname, '../', './public', 'excels', 'employer_settlement', `Employer settlement - ${milis}.xlsx`);

            fs.createReadStream(filePath).pipe(res);
            return;
        }
        else {

            // Excel file data store
            let workbook = new Excel.Workbook()
            let worksheet = workbook.addWorksheet('New Sheet');

            //Saving the excel file
            await workbook.xlsx.writeFile(path.join('./public', 'excels', 'employer_settlement', `Employer settlement - ${milis}.xlsx`));
            res.writeHead(200, {
                "Content-Type": "application/octet-stream",
                "Content-Disposition": `attachment; filename=Employer settlement - ${milis}.xlsx`
            });

            let filePath = path.join(__dirname, '../', './public', 'excels', 'employer_settlement', `Employer settlement - ${milis}.xlsx`);

            fs.createReadStream(filePath).pipe(res);
            return;
        }
        // if (done === number_of_employers.length) {

        //     printLogger(2, number_of_employers, "report");
        //     return response(res, 200, true, message.dataFound(), number_of_employers);
        // }
        // else {

        //     let dataResult = [{
        //         "value": '',
        //         "msg": message.noInsertSuccessfully('Reports'),
        //         "param": "",
        //         "location": ""
        //     }]
        //     printLogger(0, dataResult, 'report');
        //     return response(res, 403, false, message.noInsertSuccessfully('Reports'), dataResult);
        // }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'report');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Ticket number 65/71
// All Employees that have taken Payout from Rupyo
exports.employeePayOutReport = async (req, res, next) => {
    try {

        let data = { "role_id": req.userData.role_id }

        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'report');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            // if (data.role_id == enumValue.rupyoAdminRoleId ||data.role_id == enumValue.employerRoleId) {

            let reqBody = req.body;

            if (req.userData.role_id === enumValue.employerRoleId) {
                reqBody.company_id = [req.userData.company_id]
            }

            // file date
            let milis = new Date();
            milis = milis.getTime();

            // Make directory
            let dir = path.join('./public/excels/employee_payout_report');

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }

            // Employee payout 
            let transactionResult = await transactionModel.employeePayoutReport(reqBody);

            if (transactionResult.length > 0) {

                // Excel file data store
                let workbook = new Excel.Workbook()
                let worksheet = workbook.addWorksheet('New Sheet');

                // Columns set
                worksheet.columns = [
                    { header: 'Date', key: 'updated_at' },
                    { header: 'Requset Id', key: 'request_id' },
                    { header: 'Employee name', key: 'employee_name' },
                    { header: 'Company name', key: 'company_name' },
                    { header: 'Credit limit', key: 'credit_limit' },
                    { header: 'Payout amount', key: 'amount' },
                    { header: 'Remaining amount', key: 'remaining_amount' }
                ]

                // formatting the header
                worksheet.columns.forEach(column => {
                    column.width = column.header.length < 12 ? 12 : column.header.length
                })

                worksheet.getRow(1).font = {
                    bold: true
                }


                /**  ROW FORMATTING  */
                // Add additional row (1)
                worksheet.insertRow(1);

                // Merged cell 
                worksheet.mergeCells('A1:G1');

                // Get cell value
                worksheet.getCell('A1').value = `EMPLOYEE PAYOUT REPORT`;
                worksheet.getCell('A1').font = { bold: false };


                // Add additional row (2)
                worksheet.insertRow(2);

                // Merged cell 
                worksheet.mergeCells('A2:G2');

                let companyName = reqBody.company_id.length > 0 ? transactionResult[0].company_name : "All employers";

                // Get cell value
                worksheet.getCell('A2').value = `Company Name : ${companyName}`;
                worksheet.getCell('A2').font = { bold: false };



                // Add additional row (3)
                worksheet.insertRow(3);

                // Merged cell 
                worksheet.mergeCells('A3:G3');

                // Get cell value
                worksheet.getCell('A3').value = `Current Date : ${moment().format('DD')}-${moment().format('MMMM')}-${moment().format('YYYY')}`;
                worksheet.getCell('A3').font = { bold: false };

                let rowIndex = 1

                // Insert the data into excel
                transactionResult.forEach((element, index) => {

                    let rowIndex = index + 2;

                    // Set paid amount
                    let paid_amount = element.amount === null || element.amount === undefined ? 0 : element.amount;

                    // Set update date
                    let updatedAt = element.updated_at;

                    if (element.status_tracker != undefined) {

                        let trackerLength = element.status_tracker.length;

                        updatedAt = element.status_tracker[trackerLength - 1].status_made;
                    }

                    // Set remaining credit limit
                    let remainingCreditLimit = element.rupyo_credit_limit;

                    if (element.status === enumValue.creditedStatus) {
                        remainingCreditLimit = element.rupyo_credit_limit - paid_amount;
                    }

                    // Set workshift value
                    worksheet.addRow({
                        employee_name: element.employee_name,
                        request_id: element.request_id,
                        company_name: element.company_name,
                        amount: paid_amount,
                        remaining_amount: remainingCreditLimit,
                        credit_limit: element.rupyo_credit_limit,
                        updated_at: moment(updatedAt).format('DD-MM-YYYY')
                    })
                })

                // Formatting borders
                // loop through all of the rows and set the outline style.
                worksheet.eachRow({ includeEmpty: false },
                    function (row, rowNumber) {
                        worksheet.getCell(`A${rowNumber}`).border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'none' }
                        }

                        const insideColumns = ['B', 'C', 'D', 'E', 'F']
                        insideColumns.forEach((v) => {
                            worksheet.getCell(`${v}${rowNumber}`).border = {
                                top: { style: 'thin' },
                                bottom: { style: 'thin' },
                                left: { style: 'none' },
                                right: { style: 'none' }
                            }
                        })

                        worksheet.getCell(`G${rowNumber}`).border = {
                            top: { style: 'thin' },
                            left: { style: 'none' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        }
                    })

                //Saving the excel file
                await workbook.xlsx.writeFile(path.join('./public', 'excels', 'employee_payout_report', `Employee payout report - ${milis}.xlsx`));
                res.writeHead(200, {
                    "Content-Type": "application/octet-stream",
                    "Content-Disposition": `attachment; filename=Employee payout report - ${milis}.xlsx`
                });

                let filePath = path.join(__dirname, '../', './public', 'excels', 'employee_payout_report', `Employee payout report - ${milis}.xlsx`);

                fs.createReadStream(filePath).pipe(res);
                return;
            }
            else {

                // Excel file data store
                let workbook = new Excel.Workbook()
                let worksheet = workbook.addWorksheet('New Sheet');

                //Saving the excel file
                await workbook.xlsx.writeFile(path.join('./public', 'excels', 'employee_payout_report', `Employee payout report - ${milis}.xlsx`));
                res.writeHead(200, {
                    "Content-Type": "application/octet-stream",
                    "Content-Disposition": `attachment; filename=Employee payout report - ${milis}.xlsx`
                });

                let filePath = path.join(__dirname, '../', './public', 'excels', 'employee_payout_report', `Employee payout report - ${milis}.xlsx`);

                fs.createReadStream(filePath).pipe(res);
                return;
            }

            // printLogger(2, transactionResult, "report");
            // return response(res, 200, true, message.dataFound(), transactionResult);
            // }
            // else {

            //     let dataResult = [{
            //         "value": '',
            //         "msg": message.notAuthorizeAcess(),
            //         "param": "",
            //         "location": ""
            //     }]
            //     printLogger(0, dataResult, 'report');
            //     return response(res, 403, false, message.notAuthorizeAcess(), dataResult);
            // }
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'report');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// All Employees that have taken Payout from Rupyo (Employer wise) report
exports.companyWisePayoutReport = async (req, res, next) => {
    try {
        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'report');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            // Set req.body
            let reqBody = req.query;

            if (req.query.company_id) {
                reqBody.company_id = [(req.query.company_id).toString()]
            }
            reqBody.status_filter = [enumValue.creditedStatus]

            // Get date in timestamps
            let _milis = new Date();
            let milis = _milis.getTime();

            // Make directory
            let dir = path.join('./public/excels/company_wise_payout_report');

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }

            // Set default field for employerPayTransactionCharge and transactionDeductionPercent
            let employerPayTransactionCharge = false;
            let transactionDeductionPercent = global.env.TRANSACTION_DEDUCTION_PERCENT;

            // Get company details
            if (reqBody.company_id) {

                let query = { "company_id": reqBody.company_id[0] }

                // Get company data
                let companyResult = await employerModel.findCompany(query);

                // Get respective month transaction charge setting
                let _transactionChargeSetting = transactionChargeSetting(companyResult);

                // Set respective month setting for employerPayTransactionCharge and transactionDeductionPercent
                employerPayTransactionCharge = _transactionChargeSetting.employer_pay_transaction_charge;
                transactionDeductionPercent = _transactionChargeSetting.transaction_deduction_percent;
            }

            // Set transactionFeesPayableBy and transactionFeesDeductionPercent
            let transactionFeesPayableBy = employerPayTransactionCharge === true ? "Employer" : "Employee";
            let transactionFeesDeductionPercent = transactionDeductionPercent;

            // Get employees payouts details 
            let transactionResult = await transactionModel.employeePayoutReport(reqBody);

            if (transactionResult.length > 0) {

                // Excel file data store
                let workbook = new Excel.Workbook()
                let worksheet = workbook.addWorksheet('New Sheet');

                // Set worksheet columns
                worksheet.columns = [
                    { header: 'Date Of Payout', key: 'updated_at' },
                    { header: 'Rupyo Payout Number', key: 'request_id' },
                    { header: 'Employee Name', key: 'employee_name' },
                    { header: 'Amount Requested', key: 'requested_amount' },
                    { header: 'Transaction Fees Paid By Employer', key: 'employer_transaction_fees' },
                    { header: 'Transaction Fees Paid By Employee', key: 'employee_transaction_fees' },
                    { header: 'Total Rupyo Amount Paid Out', key: 'paidout_amount' }
                ]

                // Formatting headers
                worksheet.columns.forEach(column => {
                    column.width = column.header.length < 12 ? 12 : column.header.length
                })

                // Make header bold
                worksheet.getRow(1).font = { bold: true }

                /**  ROW FORMATTING  */
                // Add additional row (1)
                worksheet.insertRow(1);

                // Merged cell 
                worksheet.mergeCells('A1:G1');

                // Set cell value
                worksheet.getCell('A1').value = `EMPLOYEE WISE LEDGER`;
                worksheet.getCell('A1').font = { bold: false };


                // Add additional row (2)
                worksheet.insertRow(2);

                // Merged cell 
                worksheet.mergeCells('A2:G2');

                let companyName = reqBody.company_id ? transactionResult[0].company_name : "All employers";

                // Set cell value
                worksheet.getCell('A2').value = `Company Name : ${companyName}`;
                worksheet.getCell('A2').font = { bold: false };


                // Add additional row (3)
                worksheet.insertRow(3);

                // Merged cell 
                worksheet.mergeCells('A3:G3');

                // Set cell value
                worksheet.getCell('A3').value = `Receivable Ledger`;
                worksheet.getCell('A3').font = { bold: false };


                // Add additional row (4)
                worksheet.insertRow(4);

                // Merged cell 
                worksheet.mergeCells('A4:G4');

                // Set cell value
                worksheet.getCell('A4').value = `Current Date : ${moment().format('DD-MM-YYYY')}`;
                worksheet.getCell('A4').font = { bold: false };


                // Add additional row (5)
                worksheet.insertRow(5);

                // Merged cell 
                worksheet.mergeCells('A5:G5');

                // Set cell value
                worksheet.getCell('A5').value = `Pay Due Date : `;
                worksheet.getCell('A5').font = { bold: false };


                // Add additional row (6)
                worksheet.insertRow(6);

                // Merged cell 
                worksheet.mergeCells('A6:G6');

                // Set cell value
                worksheet.getCell('A6').value = `Transaction Fees Payable By : ${transactionFeesPayableBy}`;
                worksheet.getCell('A6').font = { bold: false };


                // Add additional row (7)
                worksheet.insertRow(7);

                // Merged cell 
                worksheet.mergeCells('A7:G7');

                // Set cell value
                worksheet.getCell('A7').value = `Transaction Fees Deduction Percent : ${transactionFeesDeductionPercent}%`;
                worksheet.getCell('A7').font = { bold: false };


                // Add additional row (8)
                worksheet.insertRow(8);

                // Merged cell 
                worksheet.mergeCells('A8:G8');

                // Set cell value
                worksheet.getCell('A8').value = ``;


                let rowIndex = 1
                let totalAmount = 0;
                let totalEmployerTransactionFees = 0;
                let totalEmployeeTransactionFees = 0;
                let totalPaidoutAmount = 0;

                // Insert data into excel file from transactionResult
                transactionResult.forEach((element, index) => {

                    rowIndex++
                    totalAmount += element.amount;

                    let employerTransactionFees = 0;
                    let employeeTransactionFees = 0;
                    let paidoutAmount = element.amount;

                    // Calculate transaction charge fees (employees and employers) and paidout amount
                    if (employerPayTransactionCharge === true) {
                        employerTransactionFees = (element.amount * transactionFeesDeductionPercent) / 100;
                    }
                    else {
                        employeeTransactionFees = (element.amount * transactionFeesDeductionPercent) / 100;
                        paidoutAmount = element.amount - employeeTransactionFees;
                    }

                    totalEmployerTransactionFees += employerTransactionFees;
                    totalEmployeeTransactionFees += employeeTransactionFees;
                    totalPaidoutAmount += paidoutAmount

                    let updatedAt = element.updated_at;

                    if (element.status_tracker != undefined) {

                        let trackerLength = element.status_tracker.length;

                        updatedAt = element.status_tracker[trackerLength - 1].status_made;
                    }

                    // Set values for worksheet rows
                    worksheet.addRow({
                        updated_at: moment(updatedAt).format('DD-MM-YYYY'),
                        request_id: element.request_id,
                        employee_name: element.employee_name,
                        requested_amount: parseFloat(element.amount.toFixed(2)),
                        employer_transaction_fees: parseFloat(employerTransactionFees.toFixed(2)),
                        employee_transaction_fees: parseFloat(employeeTransactionFees.toFixed(2)),
                        paidout_amount: parseFloat(paidoutAmount.toFixed(2))
                    })
                })

                // Add additional row (Last row for total)
                worksheet.insertRow(rowIndex + 9);

                // Set cell value (Total calculated amount of columns)
                worksheet.getCell(`C${rowIndex + 9}`).value = `Total`;
                worksheet.getCell(`C${rowIndex + 9}`).font = { bold: true };

                worksheet.getCell(`D${rowIndex + 9}`).value = parseFloat(totalAmount.toFixed(2));
                worksheet.getCell(`D${rowIndex + 9}`).font = { bold: true };

                worksheet.getCell(`E${rowIndex + 9}`).value = parseFloat(totalEmployerTransactionFees.toFixed(2));
                worksheet.getCell(`E${rowIndex + 9}`).font = { bold: true };

                worksheet.getCell(`F${rowIndex + 9}`).value = parseFloat(totalEmployeeTransactionFees.toFixed(2));
                worksheet.getCell(`F${rowIndex + 9}`).font = { bold: true };

                worksheet.getCell(`G${rowIndex + 9}`).value = parseFloat(totalPaidoutAmount.toFixed(2));
                worksheet.getCell(`G${rowIndex + 9}`).font = { bold: true };


                // Formatting table borders 
                worksheet.eachRow({ includeEmpty: false },
                    function (row, rowNumber) {
                        worksheet.getCell(`A${rowNumber}`).border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'none' }
                        }

                        const insideColumns = ['B', 'C', 'D', 'E', 'F']
                        insideColumns.forEach((v) => {
                            worksheet.getCell(`${v}${rowNumber}`).border = {
                                top: { style: 'thin' },
                                bottom: { style: 'thin' },
                                left: { style: 'none' },
                                right: { style: 'none' }
                            }
                        })

                        worksheet.getCell(`G${rowNumber}`).border = {
                            top: { style: 'thin' },
                            left: { style: 'none' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        }
                    })

                //Saving the excel file
                await workbook.xlsx.writeFile(path.join('./public', 'excels', 'company_wise_payout_report', `Receivable Ledger - ${milis}.xlsx`));
                res.writeHead(200, {
                    "Content-Type": "application/octet-stream",
                    "Content-Disposition": `attachment; filename=Receivable Ledger - ${milis}.xlsx`
                });

                let filePath = path.join(__dirname, '../', './public', 'excels', 'company_wise_payout_report', `Receivable Ledger - ${milis}.xlsx`);

                fs.createReadStream(filePath).pipe(res);
                return;
            }
            else {

                // Excel file data store
                let workbook = new Excel.Workbook()
                let worksheet = workbook.addWorksheet('New Sheet');

                //Saving the excel file
                await workbook.xlsx.writeFile(path.join('./public', 'excels', 'company_wise_payout_report', `Receivable Ledger - ${milis}.xlsx`));
                res.writeHead(200, {
                    "Content-Type": "application/octet-stream",
                    "Content-Disposition": `attachment; filename=Receivable Ledger - ${milis}.xlsx`
                });

                let filePath = path.join(__dirname, '../', './public', 'excels', 'company_wise_payout_report', `Receivable Ledger - ${milis}.xlsx`);

                fs.createReadStream(filePath).pipe(res);
                return;
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
        printLogger(0, error, 'report');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// Employees report (Employer wise)
exports.companyWiseEmployeeReport = async (req, res, next) => {
    try {

        // console.log("req.query:- ", req.query)
        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'report');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let reqQuery = req.query;

            if (req.query.company_id) { reqQuery.company_id = (req.query.company_id).toString() }

            let _milis = new Date();
            let milis = _milis.getTime();
            let totalDays = moment().utc().endOf('month').format("D");

            // Make directory
            let dir = path.join('./public/excels/company_wise_employee_report');

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }

            // Employee payout 
            let employeesResult = await employeesModel.companyWiseEmployeeReport(reqQuery);

            if (employeesResult.length > 0) {

                for (let i = 0; i < employeesResult.length; i++) {

                    let netPayPerDay = 0;

                    netPayPerMonth = parseFloat(employeesResult[i].net_salary);
                    netPayPerDay = parseFloat(netPayPerMonth) / parseFloat(totalDays);

                    let encBankDetails = {
                        bank_name: employeesResult[i].bank_name,
                        account_number: employeesResult[i].account_number,
                        ifsc_code: employeesResult[i].ifsc_code,
                        pan_card: employeesResult[i].pan_card,
                        name_in_bank: employeesResult[i].name_in_bank,
                        bank_account_type: employeesResult[i].bank_account_type,
                        branch_name: employeesResult[i].branch_name
                    };

                    // Bank details decryption file call
                    let decryptionDetail = decryptData(encBankDetails);

                    employeesResult[i].bank_name = decryptionDetail.bank_name,
                        employeesResult[i].account_number = decryptionDetail.account_number,
                        employeesResult[i].ifsc_code = decryptionDetail.ifsc_code,
                        employeesResult[i].pan_card = decryptionDetail.pan_card,
                        employeesResult[i].name_in_bank = decryptionDetail.name_in_bank,
                        employeesResult[i].bank_account_type = decryptionDetail.bank_account_type,
                        employeesResult[i].branch_name = decryptionDetail.branch_name,
                        employeesResult[i].serial_number = i + 1,
                        employeesResult[i].employee_name = employeesResult[i].first_name + " " + employeesResult[i].last_name,
                        employeesResult[i].net_pay_per_day = parseFloat(netPayPerDay.toFixed(2)) || 0,

                        // Get employee status string
                        employeesResult[i].status = getStatusString(employeesResult[i].status)
                }


                // Excel file data store
                let workbook = new Excel.Workbook()
                let worksheet = workbook.addWorksheet('New Sheet');

                // Columns set
                worksheet.columns = [
                    { header: 'SR No.', key: 'serial_number' },
                    { header: "Employee's Name", key: 'employee_name' },
                    { header: 'Employee ID', key: 'employee_id' },
                    { header: 'Status', key: 'status' },
                    { header: 'PF A/C No.', key: '' },
                    { header: 'ESI No.', key: '' },
                    { header: 'UAN', key: '' },
                    { header: 'Aadhar Card', key: 'aadhar_card' },
                    { header: 'PAN NO.', key: 'pan_card' },
                    { header: 'Bank Account No.', key: 'account_number' },
                    { header: 'Bank Name', key: 'bank_name' },
                    { header: 'IFSC/MICR', key: 'ifsc_code' },
                    { header: 'Name In Bank', key: 'name_in_bank' },
                    { header: 'Bank Account Type', key: 'bank_account_type' },
                    { header: 'Branch Name', key: 'branch_name' },
                    { header: 'Gender', key: 'gender' },
                    { header: 'Cibil Score', key: 'cibil_score' },
                    { header: 'DOB', key: 'dob' },
                    { header: 'Father Mother Name', key: 'father_mother_name' },
                    { header: 'Mobile Number', key: 'mobile_number' },
                    { header: 'Basic Pay', key: 'basic_pay' },
                    { header: 'Total Additions', key: 'additional_pay' },
                    { header: 'Total Deductions', key: 'net_deductions' },
                    { header: 'Net Pay', key: 'net_salary' },
                    { header: 'Pay Cycle', key: 'salary_cycle' },
                    { header: 'Net Pay Per Day', key: 'net_pay_per_day' },
                    { header: 'Days Worked', key: 'days_worked_till_now' },
                    { header: 'Earned Net Pay', key: 'earned_amount' },
                    { header: 'Total Rupyo Payouts', key: 'payout_credited' },
                    { header: 'Pending Salary', key: 'panding_salary' }
                ]

                // formatting the header
                worksheet.columns.forEach(column => {
                    column.width = column.header.length < 12 ? 12 : column.header.length
                })

                worksheet.getRow(1).font = {
                    bold: true
                }


                /**  ROW FORMATTING  */
                // Add additional row (1)
                worksheet.insertRow(1);

                // Merged cell 
                worksheet.mergeCells('A1:AD1');

                let companyName = reqQuery.company_id.length > 0 ? employeesResult[0].company_name : "All employers";

                // Get cell value
                worksheet.getCell('A1').value = `Company Name : ${companyName}`;
                worksheet.getCell('A1').font = { bold: false };


                // Add additional row (2)
                worksheet.insertRow(2);

                // Merged cell 
                worksheet.mergeCells('A2:AD2');

                // Get cell value
                worksheet.getCell('A2').value = `Month Year : ${moment().format('MMMM')}-${moment().format('YYYY')}`;
                worksheet.getCell('A2').font = { bold: false };

                let rowIndex = 1
                let earnedAmount = 0;
                let payoutCredited = 0;

                // Insert the data into excel
                employeesResult.forEach((element, index) => {

                    rowIndex++
                    earnedAmount = earnedAmount + (element.earned_amount || 0)
                    payoutCredited = payoutCredited + (element.payout_credited || 0)

                    worksheet.addRow({
                        serial_number: element.serial_number,
                        employee_name: element.employee_name,
                        employee_id: element.employee_id,
                        status: element.status,
                        aadhar_card: element.aadhar_card,
                        pan_card: element.pan_card,
                        account_number: element.account_number,
                        bank_name: element.bank_name,
                        ifsc_code: element.ifsc_code,
                        name_in_bank: element.name_in_bank,
                        bank_account_type: element.bank_account_type,
                        branch_name: element.branch_name,
                        gender: element.gender,
                        cibil_score: element.cibil_score,
                        dob: element.dob,
                        father_mother_name: element.father_mother_name,
                        mobile_number: element.mobile_number,
                        basic_pay: parseInt(element.basic_pay) || 0,
                        additional_pay: parseInt(element.additional_pay) || 0,
                        net_deductions: parseInt(element.net_deductions) || 0,
                        net_salary: parseInt(element.net_salary) || 0,
                        salary_cycle: parseInt(element.salary_cycle) || 0,
                        net_pay_per_day: parseInt(element.net_pay_per_day) || 0,
                        days_worked_till_now: parseInt(element.days_worked_till_now) || 0,
                        earned_amount: parseInt(element.earned_amount) || 0,
                        payout_credited: parseInt(element.payout_credited) || 0,
                        // panding_salary: (parseInt(element.net_salary) - parseInt(element.payout_credited)) || 0
                        panding_salary: (parseInt(element.earned_amount) - parseInt(element.payout_credited)) || 0
                    })
                })

                // Add additional row (Last row for total)
                worksheet.insertRow(rowIndex + 3);

                // Merged cell 
                worksheet.mergeCells(`A${rowIndex + 3}:AA${rowIndex + 3}`);

                // Get cell value
                worksheet.getCell(`AA${rowIndex + 3}`).value = `Total`;
                worksheet.getCell(`AA${rowIndex + 3}`).font = { bold: true };

                worksheet.getCell(`AB${rowIndex + 3}`).value = earnedAmount;
                worksheet.getCell(`AB${rowIndex + 3}`).font = { bold: true };

                worksheet.getCell(`AC${rowIndex + 3}`).value = payoutCredited;
                worksheet.getCell(`AC${rowIndex + 3}`).font = { bold: true };


                // Formatting borders
                // loop through all of the rows and set the outline style.
                worksheet.eachRow({ includeEmpty: false },
                    function (row, rowNumber) {
                        worksheet.getCell(`A${rowNumber}`).border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'none' }
                        }

                        const insideColumns = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V','W','X','Y','Z','AA','AB','AC','AD']
                        insideColumns.forEach((v) => {
                            worksheet.getCell(`${v}${rowNumber}`).border = {
                                top: { style: 'thin' },
                                bottom: { style: 'thin' },
                                left: { style: 'none' },
                                right: { style: 'none' }
                            }
                        })

                        worksheet.getCell(`AD${rowNumber}`).border = {
                            top: { style: 'thin' },
                            left: { style: 'none' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        }
                    })

                //Saving the excel file
                await workbook.xlsx.writeFile(path.join('./public', 'excels', 'company_wise_employee_report', `Export Employee - ${milis}.xlsx`));
                res.writeHead(200, {
                    "Content-Type": "application/octet-stream",
                    "Content-Disposition": `attachment; filename=Export Employee - ${milis}.xlsx`
                });

                let filePath = path.join(__dirname, '../', './public', 'excels', 'company_wise_employee_report', `Export Employee - ${milis}.xlsx`);

                fs.createReadStream(filePath).pipe(res);
                return;
            }
            else {

                // Excel file data store
                let workbook = new Excel.Workbook()
                let worksheet = workbook.addWorksheet('New Sheet');

                //Saving the excel file
                await workbook.xlsx.writeFile(path.join('./public', 'excels', 'company_wise_employee_report', `Export Employee - ${milis}.xlsx`));
                res.writeHead(200, {
                    "Content-Type": "application/octet-stream",
                    "Content-Disposition": `attachment; filename=Export Employee - ${milis}.xlsx`
                });

                let filePath = path.join(__dirname, '../', './public', 'excels', 'company_wise_employee_report', `Export Employee - ${milis}.xlsx`);

                fs.createReadStream(filePath).pipe(res);
                return;
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
        printLogger(0, error, 'report');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};





// Pratik code ------------------------------
exports.companyWisePayoutReportTesting = async (req, res, next) => {
    //return console.log("hello");
    try {
        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'report');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            
            // Set req.body
            let reqBody = req.query;

            if (req.query.company_id) {
                reqBody.company_id = [(req.query.company_id).toString()]
            }
            reqBody.status_filter = [enumValue.creditedStatus]

            // Get date in timestamps
            let _milis = new Date();
            let milis = _milis.getTime();
            
            // Make directory
            let dir = path.join('./public/excels/company_wise_payout_report');

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
            
            // Set default field for employerPayTransactionCharge and transactionDeductionPercent
            let employerPayTransactionCharge = false;
            let transactionDeductionPercent = global.env.TRANSACTION_DEDUCTION_PERCENT;
            
            // Get company details
            if (reqBody.company_id) {
                
                let query = { "company_id": reqBody.company_id[0] };
                let month = req.query.month;
                let year = req.query.year;
                //console.log(year,'year');
                // Get company data
                let companyResult = await employerModel.findCompany(query);
                //return console.log(companyResult,"hello");
                // Get respective month transaction charge setting
                let _transactionChargeSetting = transactionChargeSettingTesting(companyResult,month,year);

                // Set respective month setting for employerPayTransactionCharge and transactionDeductionPercent
                employerPayTransactionCharge = _transactionChargeSetting.employer_pay_transaction_charge;
                transactionDeductionPercent = _transactionChargeSetting.transaction_deduction_percent;
            }

            // Set transactionFeesPayableBy and transactionFeesDeductionPercent
            let transactionFeesPayableBy = employerPayTransactionCharge === true ? "Employer" : "Employee";
            let transactionFeesDeductionPercent = transactionDeductionPercent;

            // Get employees payouts details 
            let transactionResult = await transactionModel.employeePayoutReport(reqBody);

            if (transactionResult.length > 0) {

                // Excel file data store
                let workbook = new Excel.Workbook()
                let worksheet = workbook.addWorksheet('New Sheet');

                // Set worksheet columns
                worksheet.columns = [
                    { header: 'Date Of Payout', key: 'updated_at' },
                    { header: 'Rupyo Payout Number', key: 'request_id' },
                    { header: 'Employee Name', key: 'employee_name' },
                    { header: 'Amount Requested', key: 'requested_amount' },
                    { header: 'Transaction Fees Paid By Employer', key: 'employer_transaction_fees' },
                    { header: 'Transaction Fees Paid By Employee', key: 'employee_transaction_fees' },
                    { header: 'Total Rupyo Amount Paid Out', key: 'paidout_amount' }
                ]

                // Formatting headers
                worksheet.columns.forEach(column => {
                    column.width = column.header.length < 12 ? 12 : column.header.length
                })

                // Make header bold
                worksheet.getRow(1).font = { bold: true }

                /**  ROW FORMATTING  */
                // Add additional row (1)
                worksheet.insertRow(1);

                // Merged cell 
                worksheet.mergeCells('A1:G1');

                // Set cell value
                worksheet.getCell('A1').value = `EMPLOYEE WISE LEDGER`;
                worksheet.getCell('A1').font = { bold: false };


                // Add additional row (2)
                worksheet.insertRow(2);

                // Merged cell 
                worksheet.mergeCells('A2:G2');

                let companyName = reqBody.company_id ? transactionResult[0].company_name : "All employers";

                // Set cell value
                worksheet.getCell('A2').value = `Company Name : ${companyName}`;
                worksheet.getCell('A2').font = { bold: false };


                // Add additional row (3)
                worksheet.insertRow(3);

                // Merged cell 
                worksheet.mergeCells('A3:G3');

                // Set cell value
                worksheet.getCell('A3').value = `Receivable Ledger`;
                worksheet.getCell('A3').font = { bold: false };


                // Add additional row (4)
                worksheet.insertRow(4);

                // Merged cell 
                worksheet.mergeCells('A4:G4');

                // Set cell value
                worksheet.getCell('A4').value = `Current Date : ${moment().format('DD-MM-YYYY')}`;
                worksheet.getCell('A4').font = { bold: false };


                // Add additional row (5)
                worksheet.insertRow(5);

                // Merged cell 
                worksheet.mergeCells('A5:G5');

                // Set cell value
                worksheet.getCell('A5').value = `Pay Due Date : `;
                worksheet.getCell('A5').font = { bold: false };


                // Add additional row (6)
                worksheet.insertRow(6);

                // Merged cell 
                worksheet.mergeCells('A6:G6');

                // Set cell value
                worksheet.getCell('A6').value = `Transaction Fees Payable By : ${transactionFeesPayableBy}`;
                worksheet.getCell('A6').font = { bold: false };


                // Add additional row (7)
                worksheet.insertRow(7);

                // Merged cell 
                worksheet.mergeCells('A7:G7');

                // Set cell value
                worksheet.getCell('A7').value = `Transaction Fees Deduction Percent : ${transactionFeesDeductionPercent}%`;
                worksheet.getCell('A7').font = { bold: false };


                // Add additional row (8)
                worksheet.insertRow(8);

                // Merged cell 
                worksheet.mergeCells('A8:G8');

                // Set cell value
                worksheet.getCell('A8').value = ``;


                let rowIndex = 1
                let totalAmount = 0;
                let totalEmployerTransactionFees = 0;
                let totalEmployeeTransactionFees = 0;
                let totalPaidoutAmount = 0;

                // Insert data into excel file from transactionResult
                transactionResult.forEach((element, index) => {

                    rowIndex++
                    totalAmount += element.amount;

                    let employerTransactionFees = 0;
                    let employeeTransactionFees = 0;
                    let paidoutAmount = element.amount;

                    // Calculate transaction charge fees (employees and employers) and paidout amount
                    if (employerPayTransactionCharge === true) {
                        employerTransactionFees = (element.amount * transactionFeesDeductionPercent) / 100;
                    }
                    else {
                        employeeTransactionFees = (element.amount * transactionFeesDeductionPercent) / 100;
                        paidoutAmount = element.amount - employeeTransactionFees;
                    }

                    totalEmployerTransactionFees += employerTransactionFees;
                    totalEmployeeTransactionFees += employeeTransactionFees;
                    totalPaidoutAmount += paidoutAmount

                    let updatedAt = element.updated_at;

                    if (element.status_tracker != undefined) {

                        let trackerLength = element.status_tracker.length;

                        updatedAt = element.status_tracker[trackerLength - 1].status_made;
                    }

                    // Set values for worksheet rows
                    worksheet.addRow({
                        updated_at: moment(updatedAt).format('DD-MM-YYYY'),
                        request_id: element.request_id,
                        employee_name: element.employee_name,
                        requested_amount: parseFloat(element.amount.toFixed(2)),
                        employer_transaction_fees: parseFloat(employerTransactionFees.toFixed(2)),
                        employee_transaction_fees: parseFloat(employeeTransactionFees.toFixed(2)),
                        paidout_amount: parseFloat(paidoutAmount.toFixed(2))
                    })
                })

                // Add additional row (Last row for total)
                worksheet.insertRow(rowIndex + 9);

                // Set cell value (Total calculated amount of columns)
                worksheet.getCell(`C${rowIndex + 9}`).value = `Total`;
                worksheet.getCell(`C${rowIndex + 9}`).font = { bold: true };

                worksheet.getCell(`D${rowIndex + 9}`).value = parseFloat(totalAmount.toFixed(2));
                worksheet.getCell(`D${rowIndex + 9}`).font = { bold: true };

                worksheet.getCell(`E${rowIndex + 9}`).value = parseFloat(totalEmployerTransactionFees.toFixed(2));
                worksheet.getCell(`E${rowIndex + 9}`).font = { bold: true };

                worksheet.getCell(`F${rowIndex + 9}`).value = parseFloat(totalEmployeeTransactionFees.toFixed(2));
                worksheet.getCell(`F${rowIndex + 9}`).font = { bold: true };

                worksheet.getCell(`G${rowIndex + 9}`).value = parseFloat(totalPaidoutAmount.toFixed(2));
                worksheet.getCell(`G${rowIndex + 9}`).font = { bold: true };


                // Formatting table borders 
                worksheet.eachRow({ includeEmpty: false },
                    function (row, rowNumber) {
                        worksheet.getCell(`A${rowNumber}`).border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'none' }
                        }

                        const insideColumns = ['B', 'C', 'D', 'E', 'F']
                        insideColumns.forEach((v) => {
                            worksheet.getCell(`${v}${rowNumber}`).border = {
                                top: { style: 'thin' },
                                bottom: { style: 'thin' },
                                left: { style: 'none' },
                                right: { style: 'none' }
                            }
                        })

                        worksheet.getCell(`G${rowNumber}`).border = {
                            top: { style: 'thin' },
                            left: { style: 'none' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        }
                    })

                //Saving the excel file
                await workbook.xlsx.writeFile(path.join('./public', 'excels', 'company_wise_payout_report', `Receivable Ledger - ${milis}.xlsx`));
                res.writeHead(200, {
                    "Content-Type": "application/octet-stream",
                    "Content-Disposition": `attachment; filename=Receivable Ledger - ${milis}.xlsx`
                });

                let filePath = path.join(__dirname, '../', './public', 'excels', 'company_wise_payout_report', `Receivable Ledger - ${milis}.xlsx`);

                fs.createReadStream(filePath).pipe(res);
                return;
            }
            else {

                // Excel file data store
                let workbook = new Excel.Workbook()
                let worksheet = workbook.addWorksheet('New Sheet');

                //Saving the excel file
                await workbook.xlsx.writeFile(path.join('./public', 'excels', 'company_wise_payout_report', `Receivable Ledger - ${milis}.xlsx`));
                res.writeHead(200, {
                    "Content-Type": "application/octet-stream",
                    "Content-Disposition": `attachment; filename=Receivable Ledger - ${milis}.xlsx`
                });

                let filePath = path.join(__dirname, '../', './public', 'excels', 'company_wise_payout_report', `Receivable Ledger - ${milis}.xlsx`);

                fs.createReadStream(filePath).pipe(res);
                return;
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
        printLogger(0, error, 'report');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};