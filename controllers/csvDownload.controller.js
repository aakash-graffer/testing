
// Init code

const Excel = require('exceljs');
const path = require('path');
const { printLogger, errData, message, enumValue } = require('../core/utility');

const csvDownloadModel = require('../models/csvDownload.model');
const { response } = require('../core/responseformat');


// Rupyo admin csv download
exports.rupyoAdminCsv = async (req, res, next) => {
    try {
        let reqBody = req.body;
        let rupyoAdminList = await csvDownloadModel.rupyoAdminCsv(reqBody);

        if (rupyoAdminList[0] === null || rupyoAdminList[0] === undefined) {
            // let dataResult = [{
            //     "value": '',
            //     "msg": message.unableExportCsv('Rupyo admin'),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(0, dataResult, 'rupyo_admin');
            // return response(res, 200, false, message.unableExportCsv('Rupyo admin'), dataResult);
            throw errData(200, message.unableExportCsv('Rupyo admin'), null);
        }
        else {
            if (rupyoAdminList.length > 0) {

                // Excel file data store
                let workbook = new Excel.Workbook()
                let worksheet = workbook.addWorksheet('New Sheet');

                let milis = new Date();
                milis = milis.getTime();

                // Columns set
                worksheet.columns = [
                    { header: 'Rupyo admin id', key: '_id' },
                    { header: 'First name', key: 'first_name' },
                    { header: 'Last name', key: 'last_name' },
                    { header: 'Email', key: 'email' },
                    { header: 'Status', key: 'status' },
                    { header: 'Mobile number', key: 'mobile_number' }
                ]

                // formatting the header
                worksheet.columns.forEach(column => {
                    column.width = column.header.length < 12 ? 12 : column.header.length
                })

                worksheet.getRow(1).font = {
                    bold: true
                }

                // Insert the data into excel
                rupyoAdminList.forEach((e, index) => {

                    const rowIndex = index + 2

                    worksheet.addRow({
                        _id: String(e._id),
                        first_name: e.first_name,
                        last_name: e.last_name,
                        email: e.email,
                        mobile_number: e.mobile_number,
                        status: e.status,
                        pause_employee: e.pause_employee
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
                            right: { style: 'none' }
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
                workbook.xlsx.writeFile(path.join('./public', 'excels', 'rupyo_admin_csv', `DataSheet-${milis}.xlsx`));
                let tempFilePath = path.join('./public', 'excels', 'rupyo_admin_csv', `DataSheet-${milis}.xlsx`);

                printLogger(2, rupyoAdminList, 'rupyo_admin');
                return response(res, 200, true, message.exportCsv('Rupyo admin'), tempFilePath);
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
        printLogger(0, `Error:- ${error}`, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Employer Csv download
exports.employerCsv = async (req, res, next) => {
    try {
        let reqBody = req.body;

        let employersList = await csvDownloadModel.employerCsv(reqBody);

        if (employersList[0] === null || employersList[0] === undefined) {

            // let dataResult = [{
            //     "value": '',
            //     "msg": message.unableExportCsv('Employer'),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(0, dataResult, 'employer');
            // return response(res, 200, false, message.unableExportCsv('Employer'), dataResult);
            throw errData(200, message.unableExportCsv('Employer'), null);
        }
        else {
            if (employersList.length > 0) {

                // Excel file data store
                let workbook = new Excel.Workbook()
                let worksheet = workbook.addWorksheet('New Sheet');

                let milis = new Date();
                milis = milis.getTime();

                // Columns set
                worksheet.columns = [
                    { header: 'Employer id', key: '_id' },
                    { header: 'First name', key: 'first_name' },
                    { header: 'Middle  name', key: 'middle_name' },
                    { header: 'Last name', key: 'last_name' },
                    { header: 'Email', key: 'email' },
                    { header: 'Status', key: 'status' },
                    { header: 'Employer status', key: 'employer_status' },
                    { header: 'Mobile number', key: 'mobile_number' },
                    { header: 'Company id', key: 'company_id' },
                    { header: 'Company name', key: 'company_name' },
                    { header: 'Rupyo company code', key: 'rupyo_company_code' },
                    { header: 'Rupyo credit limit', key: 'rupyo_credit_limit' },
                    { header: 'Company size', key: 'company_size' },
                    { header: 'Employee id generation method', key: 'employee_id_generation_method' },
                    { header: 'Address_1', key: 'address_1' },
                    { header: 'Address 2', key: 'address_2' },
                    { header: 'City', key: 'city' },
                    { header: 'State', key: 'state' },
                    { header: 'Pin code', key: 'pincode' },
                    { header: 'Country', key: 'country' }
                ]

                // formatting the header
                worksheet.columns.forEach(column => {
                    column.width = column.header.length < 12 ? 12 : column.header.length
                })

                worksheet.getRow(1).font = {
                    bold: true
                }

                // Insert the data into excel
                employersList.forEach((e, index) => {

                    const rowIndex = index + 2

                    worksheet.addRow({
                        _id: String(e._id),
                        first_name: e.first_name,
                        middle_name: e.middle_name,
                        last_name: e.last_name,
                        email: e.email,
                        mobile_number: e.mobile_number,
                        status: e.status,
                        employer_status: e.employer_status,
                        company_id: String(e.company_id),
                        company_name: e.company_name,
                        rupyo_company_code: e.rupyo_company_code,
                        rupyo_credit_limit: e.rupyo_credit_limit,
                        company_size: e.company_size,
                        employee_id_generation_method: e.employee_id_generation_method,
                        address_1: e.address.address_1,
                        address_2: e.address.address_2,
                        city: e.address.city,
                        country: e.address.country,
                        state: e.address.state,
                        pincode: e.address.pincode
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
                            right: { style: 'none' }
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
                workbook.xlsx.writeFile(path.join('./public', 'excels', 'employers_csv', `DataSheet-${milis}.xlsx`));
                let tempFilePath = `DataSheet-${milis}.xlsx`;

                printLogger(2, employersList, 'employer');
                return response(res, 200, true, message.exportCsv('Employer'), tempFilePath);
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
        printLogger(0, `Error:- ${error}`, 'employer');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Employee Csv download
exports.employeeCsv = async (req, res, next) => {
    try {
        let reqBody = req.body;
        let companyId = req.userData.role_id === enumValue.employerRoleId ? String(req.userData.company_id) : req.body.company_id;

        let employeesList = await csvDownloadModel.employeeCsv(reqBody, companyId);

        if (employeesList[0] === null || employeesList[0] === undefined) {

            // let dataResult = [{
            //     "value": '',
            //     "msg": message.unableExportCsv('Employee'),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(0, dataResult, 'employee');
            // return response(res, 200, false, message.unableExportCsv('Employee'), dataResult);
            throw errData(200, message.unableExportCsv('Employee'), null);
        }
        else {
            if (employeesList.length > 0) {

                // Excel file data store
                let workbook = new Excel.Workbook()
                let worksheet = workbook.addWorksheet('New Sheet');

                let milis = new Date();
                milis = milis.getTime();

                // Columns set
                worksheet.columns = [
                    { header: 'Employee id', key: '_id' },
                    { header: 'Role id', key: 'role_id' },
                    { header: 'First name', key: 'first_name' },
                    { header: 'Middle  name', key: 'middle_name' },
                    { header: 'Last name', key: 'last_name' },
                    { header: 'Email', key: 'email' },
                    { header: 'Status', key: 'status' },
                    { header: 'Mobile number', key: 'mobile_number' },
                    { header: 'Company id', key: 'company_id' },
                    { header: 'Work shift id', key: 'work_shift_id' },
                    { header: 'Company name', key: 'company_name' },
                    { header: 'employee_type', key: 'employee_type' },
                    { header: 'Rupyo credit limit', key: 'rupyo_credit_limit' },
                    { header: 'verification_status', key: 'verification_status' },
                    { header: 'salary_cycle', key: 'salary_cycle' },
                    { header: 'Address_1', key: 'address_1' },
                    { header: 'Address 2', key: 'address_2' },
                    { header: 'City', key: 'city' },
                    { header: 'State', key: 'state' },
                    { header: 'Pin code', key: 'pincode' },
                    { header: 'Country', key: 'country' },
                    { header: 'opening_balance', key: 'opening_balance' },
                    { header: 'net_deductions', key: 'net_deductions' },
                    { header: 'net_salary', key: 'net_salary' },
                    { header: 'selfie', key: 'selfie' },
                    { header: 'credit_limit_percent', key: 'credit_limit_percent' },
                    { header: 'credit_limit_type', key: 'credit_limit_type' },
                    { header: 'net_pay_per_day', key: 'net_pay_per_day' },
                    { header: 'firebase_device_token', key: 'firebase_device_token' },
                    { header: 'payout_till_now', key: 'payout_till_now' },
                    { header: 'present_total', key: 'present_total' },
                    { header: 'absent_total', key: 'absent_total' },
                    { header: 'half_total', key: 'half_total' },
                    { header: 'leave_total', key: 'leave_total' }
                ]

                // formatting the header
                worksheet.columns.forEach(column => {
                    column.width = column.header.length < 12 ? 12 : column.header.length
                })

                worksheet.getRow(1).font = {
                    bold: true
                }

                // Insert the data into excel
                employeesList.forEach((e, index) => {

                    const rowIndex = index + 2

                    worksheet.addRow({
                        _id: String(e._id),
                        role_id: e.role_id,
                        first_name: e.first_name,
                        middle_name: e.middle_name,
                        last_name: e.last_name,
                        email: e.email,
                        mobile_number: e.mobile_number,
                        status: e.status,
                        company_id: String(e.company_id),
                        company_name: e.company_name[0],
                        employee_type: e.employee_type,
                        rupyo_credit_limit: e.rupyo_credit_limit,
                        verification_status: e.verification_status,
                        salary_cycle: e.salary_cycle,
                        address_1: e.address.address_1,
                        address_2: e.address.address_2,
                        city: e.address.city,
                        country: e.address.country,
                        state: e.address.state,
                        pincode: e.address.pincode,
                        opening_balance: e.opening_balance,
                        net_deductions: e.net_deductions,
                        net_salary: e.net_salary,
                        firebase_device_token: e.firebase_device_token,
                        selfie: e.selfie,
                        credit_limit_percent: e.credit_limit_percent,
                        credit_limit_type: e.credit_limit_type,
                        net_pay_per_day: e.net_pay_per_day,
                        payout_till_now: e.payout_till_now,
                        present_total: e.present_total,
                        absent_total: e.absent_total,
                        half_total: e.half_total,
                        leave_total: e.leave_total
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
                            right: { style: 'none' }
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
                workbook.xlsx.writeFile(path.join('./public', 'excels', 'employees_csv', `DataSheet-${milis}.xlsx`));

                let tempFilePath = `DataSheet-${milis}.xlsx`;
                printLogger(2, employeesList, 'employee');
                return response(res, 200, true, message.exportCsv('Employee'), tempFilePath);
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
        printLogger(0, `Error:- ${error}`, 'employee');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Transactins Csv download
exports.transactionsCsv = async (req, res, next) => {
    try {
        let reqBody = req.body;
        let companyId = req.userData.role_id === enumValue.employerRoleId ? req.userData.company_id : reqBody.company_id;

        let transactionsList = await csvDownloadModel.transactionsCsv(reqBody, companyId);

        if (transactionsList[0] === null || transactionsList[0] === undefined) {

            // let dataResult = [{
            //     "value": '',
            //     "msg": message.unableExportCsv('Transactions'),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(0, dataResult, 'transaction');
            // return response(res, 200, false, message.unableExportCsv('Transactions'), dataResult);
            throw errData(200, message.unableExportCsv('Transactions'), null);
        }
        else {
            if (transactionsList.length > 0) {

                // Excel file data store
                let workbook = new Excel.Workbook()
                let worksheet = workbook.addWorksheet('New Sheet');

                let milis = new Date();
                milis = milis.getTime();

                // Columns set
                worksheet.columns = [
                    { header: 'Id', key: '_id' },
                    { header: 'User id', key: 'user_id' },
                    { header: 'Credit limit', key: 'credit_limit' },
                    { header: 'Employee status', key: 'employee_status' },
                    { header: 'Net salary', key: 'net_salary' },
                    { header: 'Reamaning credit limit', key: 'reamaning_credit_limit' },
                    { header: 'First name', key: 'first_name' },
                    { header: 'Last name', key: 'last_name' },
                    { header: 'Company id', key: 'company_id' },
                    { header: 'Work shift id', key: 'work_shift_id' },
                    { header: 'Company name', key: 'company_name' },
                    { header: 'Amount', key: 'amount' },
                    { header: 'Status', key: 'status' },
                    { header: 'Request id', key: 'request_id' },
                    { header: 'Created at', key: 'created_at' },
                    { header: 'Date time', key: 'date_time' }]

                // formatting the header
                worksheet.columns.forEach(column => {
                    column.width = column.header.length < 12 ? 12 : column.header.length
                })

                worksheet.getRow(1).font = {
                    bold: true
                }

                // Insert the data into excel
                transactionsList.forEach((e, index) => {

                    const rowIndex = index + 2

                    worksheet.addRow({
                        _id: String(e._id),
                        user_id: e.user_id,
                        credit_limit: e.credit_limit,
                        employee_status: e.employee_status,
                        net_salary: e.net_salary,
                        reamaning_credit_limit: e.reamaning_credit_limit,
                        first_name: e.first_name,
                        last_name: e.last_name,
                        company_id: e.company_id,
                        company_name: e.company_name,
                        amount: e.amount,
                        rupyo_credit_limit: e.rupyo_credit_limit,
                        status: e.status,
                        request_id: e.request_id,
                        created_at: e.created_at,
                        date_time: e.date_time

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
                            right: { style: 'none' }
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
                workbook.xlsx.writeFile(path.join('./public', 'excels', 'transactions_csv', `DataSheet-${milis}.xlsx`));

                let tempFilePath = `DataSheet-${milis}.xlsx`;
                printLogger(2, transactionsList, 'transaction');
                return response(res, 200, true, message.exportCsv('Transactions'), tempFilePath);
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
        printLogger(0, `Error:- ${error}`, 'transaction');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Attendance Csv download
exports.attendanceCsv = async (req, res, next) => {
    try {
        let reqBody = req.body;
        let companyId = req.userData.role_id === enumValue.employerRoleId ? req.userData.company_id : req.body.company_id;

        let attendanceList = await csvDownloadModel.attendanceCsv(reqBody, companyId);

        if (attendanceList[0] === null || attendanceList[0] === undefined) {

            // let dataResult = [{
            //     "value": '',
            //     "msg": message.unableExportCsv('Attendance'),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(0, dataResult, 'attendance');
            // return response(res, 200, false, message.unableExportCsv('Attendance'), dataResult);
            throw errData(200, message.unableExportCsv('Attendance'), null);
        }
        else {
            if (attendanceList.length > 0) {

                // Excel file data store
                let workbook = new Excel.Workbook()
                let worksheet = workbook.addWorksheet('New Sheet');

                let milis = new Date();
                milis = milis.getTime();

                // Columns set
                worksheet.columns = [
                    { header: 'Id', key: '_id' },
                    { header: 'employee_id', key: 'employee_id' },
                    { header: 'status', key: 'status' },
                    { header: 'First name', key: 'first_name' },
                    { header: 'Middle name', key: 'middle_name' },
                    { header: 'Last name', key: 'last_name' },
                    { header: 'Company id', key: 'company_id' },
                    { header: 'Work shift id', key: 'work_shift_id' },
                    { header: 'Company name', key: 'company_name' },
                    { header: 'punch_in', key: 'punch_in' },
                    { header: 'punch_out', key: 'punch_out' },
                    { header: 'work_shift_id', key: 'work_shift_id' },
                    { header: 'hours', key: 'hours' },
                    { header: 'minutes', key: 'minutes' },
                    { header: 'created_at', key: 'created_at' },
                ]

                // formatting the header
                worksheet.columns.forEach(column => {
                    column.width = column.header.length < 12 ? 12 : column.header.length
                })

                worksheet.getRow(1).font = {
                    bold: true
                }

                // Insert the data into excel
                attendanceList.forEach((e, index) => {

                    const rowIndex = index + 2
                    let hour = e.actual_working_hour === null || e.actual_working_hour === undefined ? '' : e.actual_working_hour.hours;
                    let minute = e.actual_working_hour === null || e.actual_working_hour === undefined ? '' : e.actual_working_hour.minutes;

                    worksheet.addRow({
                        _id: String(e._id),
                        employee_id: e.employee_id,
                        status: e.status,
                        first_name: e.first_name,
                        middle_name: e.middle_name,
                        last_name: e.last_name,
                        company_id: e.company_id,
                        company_name: e.company_name,
                        punch_in: e.punch_in,
                        punch_out: e.punch_out,
                        work_shift_id: e.work_shift_id,
                        hours: hour,
                        minutes: minute,
                        created_at: e.created_at

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
                            right: { style: 'none' }
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
                workbook.xlsx.writeFile(path.join('./public', 'excels', 'attendance_csv', `DataSheet-${milis}.xlsx`));

                let tempFilePath = `DataSheet-${milis}.xlsx`;
                printLogger(2, attendanceList, 'attendance');
                return response(res, 200, true, message.exportCsv('Attendance'), tempFilePath);
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
        printLogger(0, `Error:- ${error}`, 'attendance');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};
