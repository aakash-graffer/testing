const Excel = require('exceljs');
const path = require('path');
const moment = require('moment');

const transactionModel = require('../models/transaction.model');
const settlementModel = require('../models/settlement.model');
const employerModel= require('../models/employer.model');
const monthlyTransactionModel = require('../models/monthlyTransaction.model');
const employeesModel = require('../models/employees.model')
const { response } = require('../core/responseformat');
const { message, printLogger, enumValue, errData } = require('../core/utility');
const {transactionChargeSetting} = require('../core/commonFunctions');


// Ledger payout
exports.payout = async (req, res, next) => {
    try {

        let reqBody = req.body;
        let result = await transactionModel.transactionLedger(reqBody);
        //console.log("result",result);
        if (result === null || result === undefined) {
            throw errData(200, message.noDataFound(), null);
        }
        else {
            // Set default field for employerPayTransactionCharge and transactionDeductionPercent
            let employerPayTransactionCharge = false;
            let transactionDeductionPercent = global.env.TRANSACTION_DEDUCTION_PERCENT;
            if (reqBody.company_id) {
                let query = { "company_id": reqBody.company_id }

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

            //console.log(result);
            for (i = 0; i < result.result.length; i++) {
                let employerTransactionFees = 0;
                let paidoutAmount = result.result[i].amount;
                // Calculate transaction charge fees (employees and employers) and paidout amount
              //  console.log("employerPayTransactionCharge",employerPayTransactionCharge);
                if (employerPayTransactionCharge === true) {
                    employerTransactionFees = (result.result[i].amount * transactionFeesDeductionPercent) / 100;
                }
                else {
                    employeeTransactionFees = (result.result[i].amount * transactionFeesDeductionPercent) / 100;
                    paidoutAmount = result.result[i].amount - employeeTransactionFees;
                }
               // console.log("employerPayTransactionCharge",paidoutAmount);
                result.result[i].total_amount_paid = paidoutAmount;
                

            }
            printLogger(2, result, 'transaction');
            return response(res, 200, true, message.dataFound(), result);
        }
    }
    catch (error) {
        printLogger(0, error, 'transaction');
        next(error);
    }
};


// Ledger settlement
exports.settlementLedger = async (req, res, next) => {
    try {

        let reqBody = req.body;

        if (req.userData.role_id === enumValue.employerRoleId) {
            reqBody.company_id = req.userData.company_id
        }

        if (req.userData.role_id === enumValue.rupyoAdminRoleId || req.userData.role_id === enumValue.superAdminRoleId) {
            if (reqBody.company_id) {
                reqBody.company_id = reqBody.company_id
            }
        }

        let result = await settlementModel.settlementLedger(reqBody);

        if (result === null || result === undefined) {
            throw errData(200, message.noDataFound(), null);
        }
        else {

            printLogger(2, result, 'transaction');
            return response(res, 200, true, message.dataFound(), result);
        }
    }
    catch (error) {
        printLogger(0, error, 'transaction');
        next(error)
    }
};



// Ledger employee payout
exports.employeePayoutLedger = async (req, res, next) => {
    try {

        let reqBody = req.body;
        let result = await monthlyTransactionModel.employeeTransactionLedger(reqBody);
        if (result[0] === null || result === undefined) {

            // let dataResult = [{
            //     "value": '',
            //     "msg": message.unableExportCsv('Ledger'),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(0, dataResult, 'transaction');
            // return response(res, 200, false, message.unableExportCsv('Employee payout Ledger'), dataResult);
            throw errData(200, message.unableExportCsv('Employee payout ledger'), null);
        }
        else {
            if (result.length > 0) {

                // Excel file data store
                let workbook = new Excel.Workbook()
                let worksheet = workbook.addWorksheet('New Sheet', {
                    headerFooter: { firstHeader: "Employee Wise ledger" }
                });


                let milis = new Date();
                milis = milis.getTime();

                worksheet.columns = [
                    { header: 'Date of payout', key: 'date_time', width: 50 },
                    { header: 'Rupyo payout number', key: 'payout_number', width: 40 },
                    { header: 'Request id', key: 'request_id', width: 40 },
                    { header: 'Employee name', key: 'name', width: 100 },
                    { header: 'Total rupyo amount paid out', key: 'paid_amount', width: 100 },
                    { header: 'Pay cycle due date', key: 'salary_cycle', width: 50 },
                ]

                worksheet.getCell('A1').value = 'Company name :';
                worksheet.getCell('B1').value = result[0].employer;
                worksheet.getCell('C1').value = '';
                worksheet.getCell('D1').value = '';
                worksheet.getCell('E1').value = '';
                worksheet.getCell('F1').value = '';
                worksheet.getCell('A2').value = 'Recivable Ledger';
                worksheet.getCell('B2').value = '';
                worksheet.getCell('C2').value = '';
                worksheet.getCell('D2').value = '';
                worksheet.getCell('E2').value = '';
                worksheet.getCell('F2').value = '';
                worksheet.getCell('A3').value = 'Current Date';
                worksheet.getCell('B3').value = new Date();
                worksheet.getCell('C3').value = '';
                worksheet.getCell('D3').value = '';
                worksheet.getCell('E3').value = 'Total dues till date';
                worksheet.getCell('F3').value = '';
                worksheet.getCell('A4').value = 'Date of payout';
                worksheet.getCell('B4').value = 'Rupyo payout number';
                worksheet.getCell('C4').value = 'Request id';
                worksheet.getCell('D4').value = 'Employee name';
                worksheet.getCell('E4').value = 'Total rupyo amount paid out';
                worksheet.getCell('F4').value = 'Pay cycle due date';

                // formatting the header
                worksheet.columns.forEach(column => {
                    column.width = column.header.length < 12 ? 12 : column.header.length
                })

                worksheet.getRow(1).font = {
                    bold: true
                }

                worksheet.getRow(2).font = {
                    bold: true
                }

                worksheet.getRow(3).font = {
                    bold: true
                }

                worksheet.getRow(4).font = {
                    bold: true
                }

                // Insert the data into excel
                result.forEach((e, index) => {

                    const rowIndex = index + 2;

                    worksheet.addRow({
                        date_time: moment(e.updated_at).format('YYYY-MM-DD HH:MM:SS a'),
                        payout_number: e.request_id,
                        name: e.first_name + " " + e.middle_name + " " + e.last_name,
                        paid_amount: "₹" + " " + e.total_amount_paid,
                        salary_cycle: e.salary_cycle,
                        request_id: e.request_id
                    })
                })


                // Formatting borders
                // loop through all of the rows and set the outline style.
                worksheet.eachRow({
                    includeEmpty: false
                }, (row, rowNumber) => {
                    worksheet.getCell(`A${rowNumber}`).border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'none' }
                    }

                    const insideColumns = ['B', 'C', 'D', 'E']
                    insideColumns.forEach((v) => {
                        worksheet.getCell(`${v}${rowNumber}`).border = {
                            top: { style: 'thin' },
                            bottom: { style: 'thin' },
                            left: { style: 'none' },
                            right: { style: 'none' },

                        }
                    })

                    worksheet.getCell(`F${rowNumber}`).border = {
                        top: { style: 'thin' },
                        left: { style: 'none' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    }
                })


                const fileName = 'DataSheet' + moment().format('MM-DD-YYYY_hh:mm:ss').toString() + '.xlsx';

                //Saving the excel file
                workbook.xlsx.writeFile(path.join('./public', 'excels', 'employee_ledger_csv', `DataSheet-${milis}.xlsx`));

                let tempFilePath = `DataSheet-${milis}.xlsx`;
                printLogger(2, result, 'transaction');
                return response(res, 200, true, message.exportCsv('Employee payout Ledger'), tempFilePath);
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
        // return response(res, 500, false, message.error(error), error);
        next(error)
    }
};


// Ledger employer payout
exports.employerPayoutLedger = async (req, res, next) => {
    try {

        let reqBody = req.body;
        let employerResult = [];
        let companyResult = await transactionModel.employerPayoutLedger(reqBody);

        if (companyResult[0] === null || companyResult[0] === undefined) {

            // let dataResult = [{
            //     "value": '',
            //     "msg": message.unableExportCsv('Ledger'),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(0, dataResult, 'transaction');
            // return response(res, 200, false, message.unableExportCsv('Employer payout Ledger'), dataResult);
            throw errData(200, message.unableExportCsv('Employer payout ledger'), null);
        }
        else {

            for (i = 0; i < companyResult.length; i++) {
                let data = { "company_id": String(companyResult[i].company_id) };

                // Number of employee, total amount paid all details get
                let employeeCountResult = await employeesModel.companyEmployeesStatus(data);
                let number_of_employees = employeeCountResult[0].employee_count[0] === undefined || employeeCountResult[0].employee_count[0] === null ? 0 : employeeCountResult[0].employee_count[0].company_id;
                let active_employee_count = employeeCountResult[0].active_employee[0] === undefined || employeeCountResult[0].active_employee[0] === null ? 0 : employeeCountResult[0].active_employee[0].company_id;
                let paid_employee = employeeCountResult[0].number_of_payout[0] === undefined || employeeCountResult[0].number_of_payout[0] === null ? 0 : employeeCountResult[0].number_of_payout[0].payout_credited;
                let total_amount_paid = employeeCountResult[0].total_amount_paid[0] === undefined || employeeCountResult[0].total_amount_paid[0] === null ? 0 : employeeCountResult[0].total_amount_paid[0].payout_credited;

                employerResult.push({
                    employer: companyResult[i].company_name,
                    number_of_employee: number_of_employees,
                    number_of_active_employee: active_employee_count,
                    number_of_rupyo_payout: paid_employee,
                    total_amount_paid: total_amount_paid
                })

            }
            if (employerResult.length > 0) {

                // Excel file data store
                let workbook = new Excel.Workbook()
                let worksheet = workbook.addWorksheet('New Sheet',
                    {
                        headerFooter: { firstHeader: "Recivable ledger" }
                    }
                );

                // Set footer (default centered), employeeCountResult: "Page 2 of 16"
                worksheet.headerFooter.oddFooter = "Page &C of &B";

                let milis = new Date();
                milis = milis.getTime();

                worksheet.columns = [
                    { header: 'Company name', key: 'company_name', width: 100 },
                    { header: 'Total number of employees', key: 'number_of_employee', width: 40 },
                    { header: 'Number of active employees', key: 'number_of_active_employee', width: 100 },
                    { header: 'Number of rupyo payout', key: 'number_of_rupyo_payout', width: 100 },
                    { header: 'Total rupyo amount paid out', key: 'total_amount_paid', width: 50 }
                ]


                worksheet.getCell('A1').value = 'Company Wise Ledger:';
                worksheet.getCell('B1').value = '';
                worksheet.getCell('C1').value = '';
                worksheet.getCell('D1').value = '';
                worksheet.getCell('E1').value = '';
                worksheet.getCell('A2').value = 'Recivable Ledger';
                worksheet.getCell('B2').value = '';
                worksheet.getCell('C2').value = '';
                worksheet.getCell('D2').value = '';
                worksheet.getCell('E2').value = '';
                worksheet.getCell('A3').value = 'Current Date';
                worksheet.getCell('B3').value = new Date();
                worksheet.getCell('C3').value = '';
                worksheet.getCell('D3').value = '';
                worksheet.getCell('E3').value = '';
                worksheet.getCell('A4').value = 'Company name';
                worksheet.getCell('B4').value = 'Total number of employees';
                worksheet.getCell('C4').value = 'Number of active employees';
                worksheet.getCell('D4').value = 'Number of rupyo payout';
                worksheet.getCell('E4').value = 'Total rupyo amount paid out';

                // formatting the header
                worksheet.columns.forEach(column => {
                    column.width = column.header.length < 12 ? 12 : column.header.length
                })

                worksheet.getRow(1).font = {
                    bold: true
                }

                worksheet.getRow(2).font = {
                    bold: true
                }

                worksheet.getRow(3).font = {
                    bold: true
                }

                worksheet.getRow(4).font = {
                    bold: true
                }

                // Insert the data into excel
                employerResult.forEach((e, index) => {

                    const rowIndex = index + 2

                    worksheet.addRow({
                        company_name: e.employer,
                        number_of_employee: e.number_of_employee,
                        number_of_active_employee: e.number_of_active_employee,
                        number_of_rupyo_payout: e.number_of_rupyo_payout,
                        total_amount_paid: "₹" + "  " + e.total_amount_paid

                    })
                })
                worksheet.getCell(worksheet.addRow('total')).value = 'Total rupyo amount paid out';


                // Formatting borders
                // loop through all of the rows and set the outline style.
                worksheet.eachRow({
                    includeEmpty: false
                }, (row, rowNumber) => {
                    worksheet.getCell(`A${rowNumber}`).border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'none' }
                    }

                    const insideColumns = ['B', 'C', 'D', 'E']
                    insideColumns.forEach((v) => {
                        worksheet.getCell(`${v}${rowNumber}`).border = {
                            top: { style: 'thin' },
                            bottom: { style: 'thin' },
                            left: { style: 'none' },
                            right: { style: 'none' },

                        }
                    })

                    worksheet.getCell(`F${rowNumber}`).border = {
                        top: { style: 'thin' },
                        left: { style: 'none' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    }
                })

                //Saving the excel file
                workbook.xlsx.writeFile(path.join('./public', 'excels', 'employer_ledger_csv', `DataSheet-${milis}.xlsx`));

                let tempFilePath = `DataSheet-${milis}.xlsx`;
                printLogger(2, employerResult, 'transaction');
                return response(res, 200, true, message.exportCsv('Employee payout Ledger'), employerResult);
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
        // return response(res, 500, false, message.error(error), error);
        next(error)
    }
};