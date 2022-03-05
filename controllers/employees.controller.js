const { validationResult } = require('express-validator');
const { ObjectId } = require('mongodb');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const csv = require('csvtojson');
const moment = require('moment');
const util = require('util');
let AWS = require('aws-sdk');
// const path = require('path');
// const fs = require('fs');

// const envSecret = require('../core/envSecret');
const { response } = require('../core/responseformat');
const { message, notification, printLogger, encryptData, decryptData, randomString, otpGenerate, validationCsvFile,
    verifyOtp, jwtTokenGenerate, shortJwtToken, enumValue, errData } = require('../core/utility');
const { showMonthlyAttendance, sendPushNotification, employeeProcessingAmount,
    findMonthlyTransactionByYearMonth, sendSMS, sendEmail, companyHolidays, employeeCreditLimitType, transactionChargeSetting } = require('../core/commonFunctions');

const employeesModel = require('../models/employees.model');
const attendanceModel = require('../models/attendance.model');
const employerModel = require('../models/employer.model');
const transactionModel = require('../models/transaction.model');
const globalSettingModel = require('../models/globalSetting.model');
const otpModel = require('../models/otp.model');
const monthlyTransactionModel = require('../models/monthlyTransaction.model');
const monthlyAttendanceModel = require('../models/monthlyAttendance.model');
const notificationModel = require('../models/notifications.model');
const workshiftModel = require('../models/workshift.model');
const tokenMethod = require("../core/getOpenIdToken");
const historyController = require('./histroy.controller');
const userModel = require('../models/user.model');
const { branch_name } = require('../core/validation');
const jwt_secret = global.env.JWT_SECRET;


// Employees signin
exports.signIn = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        let reqBody = req.body;
        // let todayPunchin = null;
        // let todayPunchout = null;
        // let year = moment().utc().format('YYYY');
        // let month = moment().utc().format('M');
        // let thisMonthAbsents = 0;
        // let thisMonthLeaves = 0;
        // let totalDays = parseInt(moment().utc().endOf('month').format("DD"));
        // let totalWorkedDays = 0;
        // let netSalary = 0;
        // let totalAmountWithdrawn = 0;
        // let amountAvailable = 0;
        // let rupyoCreditLimit = 0;
        // let timeRightNow = moment().utc();
        // let hoursSpentToday = 0;

        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), 'employee');
            throw errData(200, message.validationError(), errors.array());
            // return response(res, 200, false, message.validationError(), errors.array())
        }
        else {

            // Convert the type of number
            let _reqBody = {
                mobile_number: parseInt(reqBody.mobile_number)
            };

            let employeeResult = await employeesModel.signInAdvance(_reqBody);

            let result = employeeResult[0];

            if (result === null || result === undefined) {
                throw errData(200, message.userNotRegistered(), null);
            }
            else {

                let companyStatus = result.Company.status;

                if (companyStatus === enumValue.activeStatus || companyStatus === enumValue.pauseStatus) {

                    let _status = result.verification_status;

                    /**
                     * Check verification_status 
                     * Verification_status equal 0 please signin
                     * Verification_status equal 1 please pin verify
                     * Verification_status equal 2 please create pin
                     * Status equal 1 permission allow for login
                     * RoleId equal 3 Not existes roleid
                     */

                    // Check employee status is archive or not
                    if (result.status !== enumValue.archiveStatus && _status >= enumValue.pinStatus) {
                        //console.log("responseData", result.password);
                        // Match pin
                        const isMatch = bcryptjs.compareSync(reqBody.pin, result.password);
                        //console.log("isMatch", isMatch);
                        // Check password match or not
                        if (isMatch) {

                            // Jwt token generate and calling
                            let token = jwtTokenGenerate(result);

                            /* ******************* CALL SIGNINACTION METHOD ********************** */
                            result.reqBody = reqBody;
                            //console.log("responseData", reqBody);
                            let responseData = await signInAction(result);

                            responseData.auth_token = token;
                            /* ------------------------------------------------ */

                            // netSalary = result.net_salary;

                            // // Calculate employee rupyo credit limit
                            // if (result.credit_limit_type === enumValue.percentBaseType && result.credit_limit_percent > 0) {

                            //     result.rupyo_credit_limit = parseFloat((result.net_salary * result.credit_limit_percent) / 100);
                            // }

                            // rupyoCreditLimit = result.rupyo_credit_limit;

                            // let bankDetails = {
                            //     bank_name: result.bank_details.bank_name,
                            //     account_number: result.bank_details.account_number,
                            //     ifsc_code: result.bank_details.ifsc_code,
                            //     pan_card: result.pan_card
                            // };

                            // // Bank details decryption file call
                            // let decryptionDetail = decryptData(bankDetails);

                            // let saveData = {
                            //     "user_id": result._id,
                            //     "firebase_device_token": reqBody.firebase_device_token
                            // };

                            // // USER MODEL -> UPDATE FIREBASE DEVICE TOKEN
                            // let firebaseDeviceToken = userModel.updateFirebaseDeviceToken(saveData);

                            // let checkData = {
                            //     "employee_id": result._id,
                            //     "year": year,
                            //     "month": month,
                            //     'user_id': result._id,
                            //     'time_filter': enumValue._thisMonth,
                            //     'status': enumValue.pendingStatus,
                            //     "for_notifications": enumValue.employeeRoleId
                            // }

                            // // ATTENDANCE MODEL -> FIND TODAY ATTENDANCE
                            // let attendanceData = await findTodayAttedance(checkData);

                            // // MONTHLY ATTENDANCE MODEL -> SHOW MONTHLY ATTENDANCE
                            // let monthlyAttendanceResult = await showMonthlyAttendance(result);

                            // //  MONTHLY TRANSACTION MODEL -> FIND MONTHLY TRANSACTION
                            // let monthlyTransactionResult = await findMonthlyTransactionByYearMonth(checkData);


                            // // NOTIFICATION MODEL -> UNREAD NOTIFICATION COUNTS
                            // let unreadNotificationCount = await unreadNotificationCountAction(checkData);

                            // checkData.status = [enumValue.pendingStatus, enumValue.approvedStatus, enumValue.holdStatus];

                            // // TRANSCATION MODEL -> EMPLOYEE TRANSACTIONS LIST
                            // let processInAmount = await employeeProcessingAmount(checkData);

                            // // Company holidays
                            // let holidayResult = await companyHolidays(result.company_id);

                            // let selfie_url = null;
                            // //result.selfie = 'favicon.ico';

                            // if (result.selfie !== undefined || result.selfie !== null) {
                            //     selfie_url = await tokenMethod.getCloudFrontURL(result.selfie);
                            // }

                            // // Set response
                            // let responseData = {

                            //     "status": result.status,
                            //     "verification_status": result.verification_status,
                            //     "auth_token": token,
                            //     "user": {
                            //         "name": result.first_name + ' ' + result.middle_name + ' ' + result.last_name,
                            //         "email": result.email,
                            //         "selfie_url": selfie_url,
                            //         "company": result.company_name,
                            //         "mobile": result.mobile_number,
                            //         "aadhar_card": result.aadhar_card || ""
                            //     },
                            //     "punch": {
                            //         "in": moment(attendanceData.todayPunchin).utc() || null,
                            //         "out": moment(attendanceData.todayPunchout).utc() || null,
                            //         "last_swipe": result.last_swipe || "",
                            //     },
                            //     "bank_details": {
                            //         "account_number": decryptionDetail.account_number,
                            //         "bank_name": decryptionDetail.bank_name,
                            //         "ifsc_code": decryptionDetail.ifsc_code,
                            //         "pan_card": decryptionDetail.pan_card
                            //     },
                            //     "stats": {
                            //         "salary": {
                            //             "total_days_in_current_month": totalDays,
                            //             "total_days_worked_in_current_month": monthlyAttendanceResult.totalWorkedDays,
                            //             "salary_earned": parseFloat(monthlyAttendanceResult.totalEarnedAmount.toFixed(2)),
                            //             "credit_limit": rupyoCreditLimit,
                            //             "amount_in_process": processInAmount,
                            //             "amount_available": parseFloat(monthlyAttendanceResult.availableAmount.toFixed(2)),
                            //             "remaining_credit_limit": parseFloat(rupyoCreditLimit - monthlyTransactionResult.totalAmountWithdrawn.toFixed(2)),
                            //             "total_amount_withdrawn": parseFloat(monthlyTransactionResult.totalAmountWithdrawn.toFixed(2)),
                            //             "total_net_salary": parseInt(result.net_salary)
                            //         },
                            //         "attendance": {
                            //             "hours_spent_today": attendanceData.hoursSpentToday,
                            //             "absents_this_month": monthlyAttendanceResult.thisMonthAbsents,
                            //             "leaves_this_month": monthlyAttendanceResult.thisMonthLeaves,
                            //             "missed_punch_this_month": monthlyAttendanceResult.thisMonthMissedPunch,
                            //         }
                            //     },
                            //     "unreadNotificationCount": unreadNotificationCount,
                            //     "holidayResult": holidayResult
                            // }
                            if (responseData === false) {
                                throw errData(500, message.error(), null);
                            }
                            else {
                                printLogger(2, responseData, 'employee');
                                return response(res, 200, true, message.loggedIn(), responseData);
                            }
                        }
                        else {
                            throw errData(200, message.invalidPassword(), null);
                        }
                    }
                    else {
                        throw errData(200, message.notActive(), null);
                    }
                }
                else {
                    throw errData(200, message.yourCompanyNotActive(), null);
                }
            }
        }
    }
    catch (error) {
        printLogger(0, error, 'employee');
        next(error)
    }
};


// Employee auto sign in
exports.autoSignIn = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        // let year = moment().utc().format('YYYY');
        // let month = moment().utc().format('M');
        // let totalDays = parseInt(moment().utc().endOf('month').format("DD"));
        // let rupyoCreditLimit = 0;

        let reqData = { "_id": req.userData._id };
        let reqBody = req.body;

        let employeeResult = await employeesModel.signInAdvance(reqData);
        let result = employeeResult[0];

        if (result === null || result === undefined) {

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

            if (result.Company.status === enumValue.activeStatus || result.Company.status === enumValue.pauseStatus) {


                /* ******************* CALL SIGNINACTION METHOD ********************** */

                result.reqBody = reqBody;
                let responseData = await signInAction(result);

                /* ------------------------------------------------ */

                // let bankDetails = {
                //     bank_name: result.bank_details.bank_name,
                //     account_number: result.bank_details.account_number,
                //     ifsc_code: result.bank_details.ifsc_code,
                //     pan_card: result.pan_card
                // };

                // // Bank details decryption file call
                // let decryptionDetail = decryptData(bankDetails);

                // // Calculate employee rupyo credit limit
                // if (result.credit_limit_type === enumValue.percentBaseType && result.credit_limit_percent > 0) {

                //     result.rupyo_credit_limit = parseFloat((result.net_salary * result.credit_limit_percent) / 100);
                // }

                // rupyoCreditLimit = result.rupyo_credit_limit;

                // checkData = {
                //     "employee_id": result._id,
                //     "year": year,
                //     "month": month,
                //     'user_id': result._id,
                //     'time_filter': enumValue._thisMonth,
                //     'status': enumValue.pendingStatus,
                //     "for_notifications": enumValue.employeeRoleId
                // }

                // let saveData = {
                //     "user_id": result._id,
                //     "firebase_device_token": reqBody.firebase_device_token
                // };

                // // USER MODEL -> UPDATE FIREBASE DEVICE TOKEN
                // let firebaseDeviceToken = userModel.updateFirebaseDeviceToken(saveData);

                // // ATTENDANCE MODEL -> FIND TODAY ATTENDANCE
                // let attendanceData = await findTodayAttedance(checkData);
                // printLogger(4, `emp_attendanceData :== ${attendanceData}`, 'attendance');


                // // MONTHLY ATTENDANCE MODEL -> SHOW MONTHLY ATTENDANCE
                // let monthlyAttendanceResult = await showMonthlyAttendance(result);

                // //  MONTHLY TRANSACTION MODEL -> FIND MONTHLY TRANSACTION
                // let monthlyTransactionResult = await findMonthlyTransactionByYearMonth(checkData);


                // // NOTIFICATION MODEL -> UNREAD NOTIFICATION COUNTS
                // let unreadNotificationCount = await unreadNotificationCountAction(checkData);


                // checkData.status = [enumValue.pendingStatus, enumValue.approvedStatus, enumValue.holdStatus];

                // // TRANSCATION MODEL -> EMPLOYEE TRANSACTIONS LIST
                // let processInAmount = await employeeProcessingAmount(checkData);

                // // Company holidays
                // let holidayResult = await companyHolidays(result.company_id);

                // let selfie_url = null;

                // if (result.selfie !== undefined || result.selfie !== null) {
                //     selfie_url = await tokenMethod.getCloudFrontURL(result.selfie);
                // }

                // // Set response
                // let responseData = {

                //     "status": result.status,
                //     "verification_status": result.verification_status,
                //     "user": {
                //         "name": result.first_name + ' ' + result.middle_name + ' ' + result.last_name,
                //         "email": result.email,
                //         "selfie_url": selfie_url,
                //         "company": result.company_name,
                //         "mobile": result.mobile_number,
                //         "aadhar_card": result.aadhar_card || ""
                //     },
                //     "punch": {
                //         "in": moment(attendanceData.todayPunchin).utc() || null,
                //         "out": moment(attendanceData.todayPunchout).utc() || null,
                //         "last_swipe": result.last_swipe || "",
                //     },
                //     "bank_details": {
                //         "account_number": decryptionDetail.account_number,
                //         "bank_name": decryptionDetail.bank_name,
                //         "ifsc_code": decryptionDetail.ifsc_code,
                //         "pan_card": decryptionDetail.pan_card
                //     },
                //     "stats": {
                //         "salary": {
                //             "total_days_in_current_month": totalDays,
                //             "total_days_worked_in_current_month": monthlyAttendanceResult.totalWorkedDays,
                //             "salary_earned": parseFloat(monthlyAttendanceResult.totalEarnedAmount.toFixed(2)),
                //             "credit_limit": rupyoCreditLimit,
                //             "amount_in_process": processInAmount,
                //             "amount_available": parseFloat(monthlyAttendanceResult.availableAmount.toFixed(2)),
                //             "remaining_credit_limit": parseFloat(rupyoCreditLimit - monthlyTransactionResult.totalAmountWithdrawn.toFixed(2)),
                //             "total_amount_withdrawn": parseFloat(monthlyTransactionResult.totalAmountWithdrawn.toFixed(2)),
                //             "total_net_salary": parseInt(result.net_salary)
                //         },
                //         "attendance": {
                //             "hours_spent_today": attendanceData.hoursSpentToday,
                //             "absents_this_month": monthlyAttendanceResult.thisMonthAbsents,
                //             "leaves_this_month": monthlyAttendanceResult.thisMonthLeaves,
                //             "missed_punch_this_month": monthlyAttendanceResult.thisMonthMissedPunch,
                //         }
                //     },
                //     "unreadNotificationCount": unreadNotificationCount,
                //     "holidayResult": holidayResult
                // }

                printLogger(4, `_attendanceData nik2:== ${responseData}`, 'employee');
                printLogger(4, `_attendanceData nik3:== ${responseData}`, 'attendance');

                if (responseData === false) {
                    throw errData(500, message.error(), null);
                }
                else {

                    printLogger(2, responseData, 'employee');
                    return response(res, 200, true, message.loggedIn(), responseData);
                }
            }
            else {
                throw errData(200, message.yourCompanyNotActive(), null);
            }
        }
    }
    catch (error) {
        printLogger(2, error, 'employee');
        next(error)
    }
};


// Create employee
exports.createEmployee = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        let reqBody = req.body;

        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), 'employee');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            /* CREATE EMPLOYEE */
            // Check emp_object_id
            if (reqBody.employee_object_id == 0 || reqBody.employee_object_id === null) {

                reqBody.url = req.url

                /* CREATE EMPLOYEE */
                let result = await employeesModel.findAlreadyExistEmployee(reqBody);

                // Check email id already exist or not
                if (result !== null) {
                    throw errData(200, message.emailIdAlreadyTaken(), null);
                }
                else {

                    let data = { "mobile_number": parseInt(reqBody.mobile_number) };

                    // Mobile number check already exist 
                    let employeeResult = await userModel.findByMobileNumber(data);

                    if (employeeResult !== null) {
                        throw errData(200, message.mobileNumberIdAlreadyTaken(), null);
                    }
                    else {

                        let companyId

                        // If employer create employee
                        if (req.userData.company_id) {
                            companyId = req.userData.company_id;
                        }
                        else {
                            companyId = reqBody.company_id;
                        }

                        let checkData = { "company_id": companyId };

                        let companyResultArray = await employerModel.employerProfile(checkData);
                        let companyResult = companyResultArray[0];

                        // Get current month credit_limit_type value from commonFunction
                        let employerCreditLimitType = employeeCreditLimitType(companyResult.Company);

                        // Get company global setting
                        let companySettingResult = await globalSettingModel.getSetting(checkData);

                        // First six digit of rupyo company code
                        let sixDigitRupyoCompanyCode = companySettingResult.rupyo_company_code.substring(0, 6)

                        let serialNumber = companySettingResult.employee_id_number;

                        if (serialNumber.toString().length === 10) {
                            serialNumber = serialNumber.toString().substring(0, 8)
                        }

                        serialNumber = companySettingResult.employee_id_number + 1;

                        let employee_id;
                        let rupyoCreditLimit;

                        // Employee id setting
                        if (reqBody.employee_id_generation_method == enumValue.randomGeneratedMethod) {

                            // Random employee_id generate 14 digit
                            employee_id = `${sixDigitRupyoCompanyCode}${serialNumber}`;
                        }
                        else {
                            if (reqBody.employee_id.length >= 14) {

                                let employeeId = { "employee_manual_id": reqBody.employee_id, "company_id": reqBody.company_id };

                                // Employee id check already exist particular company 
                                let manualEmployeeId = await employeesModel.findAlreadyExistEmployee(employeeId);

                                if (manualEmployeeId === null || manualEmployeeId === undefined) {
                                    employee_id = reqBody.employee_id;
                                }
                                else {
                                    throw errData(200, message.employeeId(), null);
                                }
                            }
                            else {
                                throw errData(200, message.validEmployeeId(), null);
                            }
                        }

                        // Credit limit setting
                        if (employerCreditLimitType === enumValue.dayWiseCreditLimit || reqBody.credit_limit_type === enumValue.percentBaseType) {

                            rupyoCreditLimit = parseFloat((reqBody.net_salary * reqBody.credit_limit_percent) / 100);
                        }
                        else if (reqBody.credit_limit_type === enumValue.fixAmountType) {

                            // Credit limit can not exceed the net monthly salary
                            if (reqBody.rupyo_credit_limit <= reqBody.net_salary) {

                                rupyoCreditLimit = reqBody.rupyo_credit_limit;
                            }
                            else {
                                throw errData(200, message.creditLimitExceed(), null);
                            }
                        }
                        else {

                            // Got default value of 5000 from env file
                            rupyoCreditLimit = global.env.EMPLOYEE_CREDIT_LIMIT;
                        }

                        // Random employee_sys_id generate 16 digit
                        let employee_sys_id = randomString(16);

                        // format bank details
                        let bankDetail = {
                            bank_name: reqBody.bank_name,
                            account_number: reqBody.account_number,
                            ifsc_code: reqBody.ifsc_code,
                            pan_card: reqBody.pan_card,
                            branch_name: reqBody.branch_name,
                            bank_account_type: reqBody.bank_account_type,
                            name_in_bank: reqBody.name_in_bank
                        }

                        // encrypt bank details
                        let encryptDetail = encryptData(bankDetail);

                        // employeeData array
                        let employeeData = [];

                        reqBody.role_id = enumValue.employeeRoleId;
                        reqBody.middle_name = reqBody.middle_name ? reqBody.middle_name : "";
                        // reqBody.district = reqBody.district ? reqBody.district : "";
                        reqBody.cibil_score = reqBody.cibil_score ? reqBody.cibil_score : "";
                        reqBody.gender = reqBody.gender;

                        // By deafult active
                        reqBody.status = enumValue.activeStatus;
                        reqBody.employee_id = employee_id;
                        reqBody.employee_sys_id = employee_sys_id;
                        reqBody.rupyo_credit_limit = rupyoCreditLimit;
                        reqBody.verification_status = enumValue.new_register;
                        reqBody.aadhar_card = reqBody.aadhar_card;

                        reqBody.address = {
                            address_1: reqBody.address_1,
                            address_2: reqBody.address_2 ? reqBody.address_2 : "",
                            pincode: reqBody.pincode,
                            city: reqBody.city,
                            state: reqBody.state,
                            country: reqBody.country,
                            district: reqBody.district ? reqBody.district : ""
                        };

                        reqBody.bank_details = {
                            bank_name: encryptDetail.bank_name,
                            account_number: encryptDetail.account_number,
                            ifsc_code: encryptDetail.ifsc_code,
                            branch_name: encryptDetail.branch_name,
                            bank_account_type: encryptDetail.bank_account_type,
                            name_in_bank: encryptDetail.name_in_bank
                        };

                        reqBody.pan_card = encryptDetail.pan_card;
                        reqBody.payout_credited = 0;
                        reqBody.earned_amount = 0;
                        reqBody.employee_payout_activation_date = moment().utc().add(1, 'month').startOf('month');
                        reqBody.created_by = req.userData._id;

                        // Push data in employeeData array
                        employeeData.push(reqBody);

                        // Save employee data in database
                        let savedResult = await employeesModel.bulkInsertEmployee(employeeData);

                        let smsData = {
                            "employee_name": reqBody.first_name + " " + reqBody.last_name,
                            "company_name": companyResult.company_name,
                            "rupyo_company_code": companyResult.rupyo_company_code
                        }


                        // Semd welcome SMS to employee
                        let awsSMS = await sendSMS("+91" + reqBody.mobile_number, message.employeeWelcomeSMS(smsData));

                        let emailData = {
                            "employee_name": `${reqBody.first_name} ${reqBody.middle_name} ${reqBody.last_name}`,
                            "company_name": companyResult.company_name,
                            "employee_id": employee_id,
                            "date": moment().format("LL"),
                            "time": moment().utcOffset("+05:30").format('hh:mm:ss A')
                        }

                        // Email for employer
                        let responseEmailtoEmployer = await sendEmail(companyResult.email, companyResult.email, `<div>${message.employeeWelcomeEmailToEmployer(emailData)}</div>`, "Welcome to Rupyo");


                        // Send welcome email to employee if have email
                        if (reqBody.email) {

                            // Email for employee
                            let responseEmail = await sendEmail(reqBody.email, reqBody.email, `<div>${message.employeeWelcomeEmail(emailData)}</div>`, "Welcome to Rupyo");
                        }

                        // Update global setting model
                        let updateSettingData = {
                            "company_id": companyId,
                            "employee_id_number": serialNumber
                        }

                        let updateSettingResult = globalSettingModel.updateSetting(updateSettingData);

                        printLogger(2, savedResult, 'employee');
                        return response(res, 200, true, message.insertSuccessfully('Employee'), { _id: savedResult[0]._id });
                    }
                }
            }

            /* UPDATE EMPLOYEE */
            else {

                /* UPDATE EMPLOYEE */
                let reqBody = req.body;

                // Format bank details
                let bankDetail = {
                    bank_name: reqBody.bank_name,
                    account_number: reqBody.account_number,
                    ifsc_code: reqBody.ifsc_code,
                    pan_card: reqBody.pan_card,
                    branch_name: reqBody.branch_name,
                    bank_account_type: reqBody.bank_account_type,
                    name_in_bank: reqBody.name_in_bank
                }

                // Encrypt bank details
                let encryptDetail = encryptData(bankDetail);

                let data = {
                    "encryptDetail": encryptDetail,
                    "userData": req.userData
                }

                let companyId

                // If employer create employee
                if (req.userData.company_id) {
                    companyId = req.userData.company_id;
                }
                else {
                    companyId = reqBody.company_id;
                }

                let checkData = { "company_id": companyId };

                // Get company data
                let companyResultArray = await employerModel.employerProfile(checkData);
                let companyResult = companyResultArray[0];

                // Get current month credit_limit_type value from commonFunction
                let employerCreditLimitType = employeeCreditLimitType(companyResult.Company);

                // CREDIT LIMIT
                if (employerCreditLimitType === enumValue.dayWiseCreditLimit || parseInt(reqBody.credit_limit_type) === enumValue.percentBaseType) {
                    reqBody.rupyo_credit_limit = parseInt((reqBody.net_salary * reqBody.credit_limit_percent) / 100) || 1;
                }
                else {

                    // Credit limit can not exceed the net monthly salary
                    if (reqBody.rupyo_credit_limit >= reqBody.net_salary) {

                        printLogger(2, reqBody, 'employee');
                        // return response(res, 200, false, message.creditLimitExceed(), " ");
                        throw errData(200, message.creditLimitExceed(), null);
                    }
                }

                // Credit limit can not exceed the net monthly salary
                if (reqBody.rupyo_credit_limit <= reqBody.net_salary) {

                    // Update employees
                    let updateResult = await employeesModel.updateEmployee(reqBody, data);

                    if (updateResult === null || updateResult === undefined) {
                        throw errData(200, message.unableToUpdate('Employee'), null);
                    }
                    else {

                        let resultData = {
                            "user_id": reqBody.employee_object_id,
                            "first_name": reqBody.first_name,
                            "middle_name": reqBody.middle_name,
                            "last_name": reqBody.last_name,
                            "updated_by": req.userData._id
                        };

                        // Update full name all related collection
                        historyController.updateFullName(resultData)

                        let pushNotificationResult = "";

                        if (updateResult.verification_status === enumValue.pinStatus) {

                            // console.log("Condition true")
                            let notificationData = {
                                "registrationIds": `["${updateResult.firebase_device_token}"]`,
                                "body": `"Your Bank account details have been updated by your employer. Please click here for more information"`,
                                "title": `"Bank Details Updated"`,
                                "notificationType": `"BANK_DETAILS_UPDATED"`
                            }
                            pushNotificationResult = sendPushNotification(notificationData);
                        }
                        printLogger(2, updateResult, 'employee');
                        return response(res, 200, true, message.updateSuccessfully('Employee details'), { updateResult, pushNotificationResult });
                    }
                }
                else {
                    // let dataResult = [{
                    //     "value": "",
                    //     "msg": message.creditLimitExceed(),
                    //     "param": "",
                    //     "location": ""
                    // }]
                    // printLogger(2, dataResult, 'employee');
                    // return response(res, 200, false, message.creditLimitExceed(), dataResult);
                    throw errData(200, message.creditLimitExceed(), null);
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
        printLogger(0, error, 'employee');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Employees list
exports.employeesList = async (req, res, next) => {
    try {

        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        let companyId = req.userData.role_id === enumValue.employerRoleId ? req.userData.company_id : req.body.company_id;

        let reqBody = req.body;

        let employeeResult = await employeesModel.employeesList(reqBody, companyId);

        let creditLimitType = enumValue.monthWiseCreditLimit;

        if (employeeResult.result.length > 0) {

            for (i = 0; i < employeeResult.result.length; i++) {

                if (employeeResult.result[i].selfie !== undefined && employeeResult.result[i].selfie !== null) {

                    let selfie_url = await tokenMethod.getCloudFrontURL(employeeResult.result[i].selfie);
                    employeeResult.result[i].selfie = selfie_url;
                }
                else {
                    employeeResult.result[i].selfie = "";
                }

                // Get current month credit_limit_type value from commonFunction
                creditLimitType = employeeCreditLimitType(employeeResult.result[i].Company);

                // Add company data key to employees list
                employeeResult.result[i].company_data = {
                    "credit_limit_type": creditLimitType
                }

                delete employeeResult.result[i].Company;
            }

            printLogger(2, employeeResult, 'employee');
            return response(res, 200, true, message.dataFound(), employeeResult);
        }
        else {
            throw errData(200, message.noDataFound(), null);
        }
    }
    catch (error) {
        printLogger(0, error, 'employee');
        next(error)
    }
};


// Find employees
exports.findEmployee = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        let reqBody = req.body;
        let year = moment().utc().format('YYYY');
        let month = moment().utc().format('M');
        let totalDays = moment().utc().endOf('month').format("D");
        const errors = validationResult(req);

        // If errors is not empty
        if (errors.errors.length > 0) {

            // printLogger(0, errors.array(), 'employee');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let data;
            if (req.userData.role_id === enumValue.employeeRoleId) {
                data = { "employee_id": req.userData._id };
            }
            else {
                data = { "employee_id": reqBody.employee_id };
            }

            data.url = req.url;

            // Find employee deatils
            let result = await employeesModel.findEmployee(data);
            printLogger(2, "******* Find Employee Result **********", 'employee');
            printLogger(2, `Find employee result:-  ${result}`, 'employee');

            if (result === undefined || result === null) {
                throw errData(200, message.userNotRegistered(), null);
            }
            else {

                // Calculate employee rupyo credit limit
                if (result.credit_limit_type === enumValue.percentBaseType && result.credit_limit_percent > 0) {

                    result.rupyo_credit_limit = parseFloat((result.net_salary * result.credit_limit_percent) / 100);
                }

                let eodRequestAmount = 0;

                // Find company status
                let companyResult = result.Company;

                let employeeId = {
                    "employee_id": String(result._id)
                };

                let netSalary = parseInt(result.net_salary);
                let netDeductions = parseInt(result.net_deductions);

                // Calculate net pay per day
                let netPayPerDay = parseInt(result.net_salary) / parseInt(totalDays);

                // Get employee attendance details and total earning 
                let totalEarnData = await totalEarnedAction(employeeId, netSalary, netDeductions);

                let checkData = {
                    "employee_id": String(result._id),
                    "year": year,
                    "month": month
                };

                // Get payout amount  this month 
                let monthlyTransactionResult = await monthlyTransactionModel.findMonthlyTransactionByYearMonth(checkData);

                let payout_amount = monthlyTransactionResult === null || monthlyTransactionResult === undefined ? 0 : monthlyTransactionResult.payout_credited;

                let workshiftData = { work_shift_id: result.work_shift_id };
                let workShift = await workshiftModel.findWorkshift(workshiftData);

                let reqBody = {
                    "user_id": result._id,
                    "time_filter": enumValue._thisMonth,
                    "status": [enumValue.pendingStatus, enumValue.approvedStatus, enumValue.holdStatus]
                };

                // Find eod request made this month
                let eodRequestResult = await transactionModel.employeeProcessingAmount(reqBody);

                let checkMonthlyData = {
                    "employee_id": result._id,
                    "month": month,
                    "year": year
                };

                let monthlyPayoutCredited = 0;

                // Get payout credited data by employee id
                let payoutResult = await monthlyTransactionModel.findMonthlyTransactionByYearMonth(checkMonthlyData);

                if (payoutResult === null || payoutResult === undefined) {
                    monthlyPayoutCredited = 0;
                }
                else {
                    monthlyPayoutCredited = parseInt(payoutResult.payout_credited);
                }

                // Total pending amount of current month
                let pendingAmount = eodRequestResult.length < 1 ? 0 : eodRequestResult[0].totalPendingAmount;

                eodRequestAmount = pendingAmount + monthlyPayoutCredited;

                let bankDetail = {

                    bank_name: result.bank_details.bank_name,
                    account_number: result.bank_details.account_number,
                    ifsc_code: result.bank_details.ifsc_code,
                    name_in_bank: result.bank_details.name_in_bank,
                    bank_account_type: result.bank_details.bank_account_type,
                    pan_card: result.pan_card,
                    branch_name: result.bank_details.branch_name
                };

                let decryptDetail = decryptData(bankDetail);

                // Get current month credit_limit_type value from commonFunction
                creditLimitType = employeeCreditLimitType(companyResult);

                let _response = {
                    "_id": result._id,
                    "role_id": result.role_id,
                    "first_name": result.first_name,
                    "middle_name": result.middle_name || "",
                    "last_name": result.last_name,
                    "dob": result.dob || "",
                    // "district": result.district || "",
                    "gender": result.gender || "",
                    "cibil_score": result.cibil_score || "",
                    "father_mother_name": result.father_mother_name || "",
                    "selfie": result.selfie || '',
                    "email": result.email,
                    "mobile_number": result.mobile_number,
                    "status": result.status,
                    "verification_status": result.verification_status,
                    "employee_payout_activation_date": result.employee_payout_activation_date,
                    "employee_id": result.employee_id,
                    "employee_sys_id": result.employee_sys_id,
                    "workshift_id": result.work_shift_id,
                    "workshift_name": workShift.shift_name,
                    "shift_start_time": workShift.shift_start_time,
                    "shift_end_time": workShift.shift_end_time,
                    "employee_type": result.employee_type,
                    "rupyo_credit_limit": result.rupyo_credit_limit,
                    "credit_limit_type": result.credit_limit_type,
                    "credit_limit_percent": result.credit_limit_percent,
                    "aadhar_card": result.aadhar_card || "",
                    "address": {
                        "address_1": result.address.address_1,
                        "address_2": result.address.address_2 || "",
                        "pincode": result.address.pincode,
                        "city": result.address.city,
                        "state": result.address.state,
                        "country": result.address.country,
                        "district": result.address.district || ""
                    },
                    "bank_details": {
                        "bank_name": decryptDetail.bank_name,
                        "account_number": decryptDetail.account_number,
                        "ifsc_code": decryptDetail.ifsc_code,
                        "pan_card": decryptDetail.pan_card,
                        "name_in_bank": decryptDetail.name_in_bank,
                        "bank_account_type": decryptDetail.bank_account_type,
                        "branch_name": decryptDetail.branch_name

                    },
                    "company_data": {
                        "company_id": result.company_id,
                        "company_name": result.company_name,
                        "company_status": companyResult.status || '',
                        "company_address": companyResult.address,
                        "credit_limit_type": creditLimitType,
                    },
                    "salary_data": {
                        "basic_pay": result.basic_pay,
                        "additional_pay": result.additional_pay,
                        "net_deductions": netDeductions || 0,
                        "net_salary": parseInt(result.net_salary),
                        "net_per_month": parseInt(result.net_salary),
                        "net_per_day": parseInt(netPayPerDay),
                        "salary_cycle": result.salary_cycle,
                        "opening_balance": result.opening_balance || 0,
                        "salary_earned": parseFloat(result.earned_amount).toFixed(2), // parseFloat(totalEarnData.total_earned.toFixed(2)),
                        "payout_made": parseFloat(payout_amount.toFixed(2)),
                        "eod_requested": parseFloat(eodRequestAmount.toFixed(2)),
                    }
                }
                printLogger(2, _response, 'employee');
                return response(res, 200, true, message.dataFound(), _response);
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
        printLogger(0, error, 'employee');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Update credit limit
exports.creditLimit = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), 'employee');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let reqBody = req.body;
            let employeeId = [];
            let exceedNetSalaryEmployee = [];
            let notificationsData = [];

            // Percent base type
            if (parseInt(reqBody.type) === enumValue.percentBaseType) {

                for (let i = 0; i < reqBody.employee_id.length; i++) {

                    let checkNetSalary = { "employee_id": reqBody.employee_id[i] };

                    // Net salary check
                    let netSalaryResult = await employeesModel.findAlreadyExistEmployee(checkNetSalary);

                    reqBody.net_salary = netSalaryResult.net_salary;
                    employeeId.push(ObjectId(reqBody.employee_id[i]));
                }
            }

            // Fix amount type
            else if (parseInt(reqBody.type) === enumValue.fixAmountType) {

                for (let i = 0; i < reqBody.employee_id.length; i++) {

                    let checkNetSalary = { "employee_id": reqBody.employee_id[i] };

                    // Net salary check
                    let netSalaryResult = await employeesModel.findAlreadyExistEmployee(checkNetSalary);

                    reqBody.net_salary = netSalaryResult.net_salary;

                    // Credit limit can not exceed the net monthly salary
                    if (reqBody.rupyo_credit_limit <= netSalaryResult.net_salary) {

                        employeeId.push(ObjectId(reqBody.employee_id[i]));
                    }
                    else {
                        exceedNetSalaryEmployee.push(reqBody.employee_id[i]);
                    }

                    let rupyoCreditLimit = reqBody.rupyo_credit_limit;
                    if (parseInt(reqBody.type) === enumValue.percentBaseType) {

                        rupyoCreditLimit = parseInt((netSalaryResult.net_salary * reqBody.percent) / 100) || 1;
                    }

                    // Employee create notification data
                    let notificationData = {
                        "employee_name": netSalaryResult.first_name + " " + netSalaryResult.last_name,
                        "employee_id": netSalaryResult.employee_id,
                        "previous_amount": netSalaryResult.rupyo_credit_limit,
                        "requested_amount": rupyoCreditLimit

                    }
                    let employeeNotification = notification.updateCreditLimitOfEmployee(notificationData);

                    // Set notifications for employees
                    notificationsData.push({
                        "user_id": reqBody.employee_id[i],
                        "company_id": "",
                        "message": employeeNotification,
                        "resource_type": enumValue.creditLimit,
                        "status": enumValue.pendingStatus,
                        "request_id": "",
                        "for_notifications": enumValue.employeeRoleId,
                        "created_by": req.userData._id
                    });
                }
            }

            // Unable to update
            else {
                throw errData(200, message.unableToUpdate('credit limit'), null);
            }

            let result = await employeesModel.employeeCreditLimit(reqBody, employeeId, req.userData);

            if (result === null || result === undefined) {
                throw errData(200, message.unableToUpdate('credit limit'), null);
            }
            else {

                if (exceedNetSalaryEmployee.length > 0) {

                    printLogger(2, result, 'employee');
                    return response(res, 200, true, message.creditLimitExceed(),
                        { "not_update_credit_limit_employee": exceedNetSalaryEmployee }
                    );
                }
                else {

                    // Save notifications
                    notificationModel.bulkInsert(notificationsData);

                    printLogger(2, result, 'employee');
                    return response(res, 200, true, message.updateSuccessfully('Credit limit'), "");
                }
            }
        }
    }
    catch (error) {
        printLogger(0, error, 'employee');
        next(error)
    }
};


// Change employee status
exports.changeStatus = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        let reqBody = req.body;
        const errors = validationResult(req)

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'employee');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let result = await employeesModel.changeStatus(reqBody, req.userData);

            if (result === null || result === undefined) {
                throw errData(200, message.unableToUpdate('Employee status'), null);
            }
            else {

                printLogger(2, result, 'employee');
                return response(res, 200, true, message.updateSuccessfully('Employee status'), " ");
            }
        }
    }
    catch (error) {
        printLogger(0, error, 'employee');
        next(error)
    }
};


// Rupyo mobile app
// Employee registration
exports.employeeRegistration = async (req, res, next) => {
    printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");
    try {
        const errors = validationResult(req)

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, "****************** errors.array() *********************", 'employee');
            printLogger(0, errors.array(), 'employee');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let reqBody = req.body;

            // Check company code
            let companyCodeResult = await employeesModel.employeeCompanyCode(reqBody);

            if (companyCodeResult === null || companyCodeResult === undefined) {
                throw errData(200, message.invalidComapanyCode(), null);
            }
            else {

                let _reqBody = {
                    "mobile_number": parseInt(reqBody.mobile_number),
                    "company_id": companyCodeResult._id
                }

                // Find employee by mobile number and company id
                let mobileResult = await employeesModel.employeeMobileNumber(_reqBody);

                if (mobileResult === null || mobileResult === undefined) {
                    throw errData(200, message.mobileNumberNotLinked(), null);
                }

                /**   
                 * Check verification status not equal 0 
                 * please login and already register
                 */

                else if (mobileResult.verification_status === enumValue.pinStatus || mobileResult.verification_status === enumValue._bankdetails || mobileResult.verification_status === enumValue.selfie) {


                    throw errData(200, message.alreadyRegistered(), null);
                }
                else {

                    await otpModel.employeeOtpDelete(mobileResult)

                    let otpData = {
                        "otp": otpGenerate(),
                        "mobile_number": mobileResult.mobile_number,
                        "user_id": mobileResult._id,
                    };

                    let otpGenerateResult = await otpModel.employeeOtpGenerate(otpData);

                    let awsotp = await sendSMS("+91" + mobileResult.mobile_number, message.otpMessage(otpData.otp));

                    if (awsotp === 0) {
                        throw errData(200, "Catch SMS failed.", null);
                    }
                    else {

                        // Otp for employee to verify mobile number
                        // SMS notications Calling and send
                        otpData = {
                            otp: otpGenerateResult.otp,
                            valid_otp: global.env.EXPIRE_OTP
                        };

                        // Generate short token
                        let userId = {
                            "user_id": otpGenerateResult.user_id
                        };

                        let token = shortJwtToken(userId);

                        printLogger(2, "************** otpGenerateResult *****************", 'employee');
                        printLogger(2, otpGenerateResult, 'employee');
                        return response(res, 200, true, message.otpSendSuccessfully('Otp'),
                            {
                                "status": mobileResult.status,
                                "verification_status": mobileResult.verification_status,
                                "token": token
                            });
                    }
                }
            }
        }
    }
    catch (error) {

        printLogger(0, "******************* error ***********************", 'employee');
        printLogger(0, error, 'employee');
        next(error)
    }
};


// Otp verify employee
exports.otpVerify = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        const errors = validationResult(req);
        if (errors.errors.length > 0) {

            printLogger(0, " ********** errors.array() *************** ", 'employee');
            printLogger(0, errors.array(), 'employee');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let reqBody = req.body;
            let token = reqBody.token;

            // Validate token
            let tokenResult = await jwtVerify(token);

            if (tokenResult === null || tokenResult === undefined) {
                throw errData(200, message.tokenExpired(), null);
            }
            else {

                let checkEmployee = { "employee_id": tokenResult._id };

                // Check employee by employee id
                let employeeResult = await employeesModel.findEmployee(checkEmployee);

                if (employeeResult === null || employeeResult === undefined) {
                    throw errData(200, message.notMobileNumber(), null);
                }
                else {

                    // Generate token
                    let userId = { "user_id": employeeResult._id }
                    let token = shortJwtToken(userId);

                    // Get otp
                    let _otp = reqBody.otp

                    // Verify expiry 
                    let expiryVerify = verifyOtp(_otp);

                    // Check otp 000000 
                    if (reqBody.otp === "000000") {

                        let result = {
                            "mobile_number": parseInt(employeeResult.mobile_number),
                            "verification_status": enumValue.verify_otp
                        };

                        let updateResult = await employeesModel.updateVerificationStatus(result)
                        if (updateResult === null || updateResult === undefined) {
                            throw errData(200, message.inValidOtp(), null);
                        }
                        else {

                            printLogger(2, updateResult, 'employee');
                            return response(res, 200, true, message.matchOtp('Otp'), {
                                "status": updateResult.status,
                                "verification_status": updateResult.verification_status,
                                "token": token
                            });
                        }
                    }
                    else {

                        // Verify OTP
                        let _reqBody = {
                            "user_id": employeeResult._id,
                            "otp": reqBody.otp
                        }
                        let otpResult = await otpModel.otpVerify(_reqBody);

                        if (otpResult === null || otpResult === undefined) {
                            throw errData(200, message.inValidOtp(), null);
                        }
                        else {

                            let result = {
                                "_id": otpResult.user_id,
                                "verification_status": enumValue.verify_otp
                            };

                            // Update verification status (Verify OTP = 1)
                            let updatesResult = await employeesModel.updateVerificationStatus(result);

                            if (updatesResult === null || updatesResult === undefined) {
                                throw errData(200, message.inValidOtp(), null);
                            }
                            else {

                                // Otp expiry validate
                                if (expiryVerify === undefined) {
                                    throw errData(200, message.otpExpired(), null);
                                }
                                else {

                                    printLogger(2, " *********** updatesResult *************", 'employee');
                                    printLogger(2, updatesResult, 'employee');
                                    return response(res, 200, true, message.matchOtp('Otp'), {

                                        "status": updatesResult.status,
                                        "verification_status": result.verification_status,
                                        "token": token
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    catch (error) {
        printLogger(0, "******* Error *************", 'employee');
        printLogger(0, error, 'employee');
        next(error)
    }
};


// Create pin 
exports.generatePin = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        let errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'employee');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let reqBody = req.body;
            let pin = reqBody.pin;
            let verifyPin = reqBody.verify_pin;
            let token = reqBody.token;

            // Campare pin and verify pin
            if (pin === verifyPin) {

                // Validate token
                let tokenResult = await jwtVerify(token);

                if (tokenResult === null) {
                    throw errData(200, message.tokenExpired(), null);
                }
                else {

                    let checkEmployee = { "employee_id": tokenResult._id };

                    // Check employee by employee id
                    let employeeResult = await employeesModel.findEmployee(checkEmployee);

                    printLogger(4, `Verification Status1:- ${employeeResult.verification_status}`, 'employee');
                    printLogger(4, `enumValue.verify_otp1:- ${enumValue.verify_otp}`, 'employee');

                    if (employeeResult === null || employeeResult === undefined) {
                        throw errData(200, message.notMobileNumber(), null);
                    }
                    else {
                        let _status = employeeResult.verification_status;
                        printLogger(4, `Verification Status2:- ${employeeResult.verification_status}`, 'employee');
                        printLogger(4, `enumValue.verify_otp2:- ${enumValue.verify_otp}`, 'employee');

                        // Check otp verified or not
                        if (_status >= enumValue.verify_otp) {

                            let data = {
                                "user_id": employeeResult._id,
                                "password": bcryptjs.hashSync(pin, 4)
                            }

                            // Generate employee pin
                            let generatePinResult = await employeesModel.generatePin(data);

                            if (generatePinResult === null || generatePinResult === undefined) {
                                throw errData(200, message.unableToSetPin(), null);
                            }
                            else {

                                let updateStatus = {
                                    "_id": employeeResult._id,
                                    "verification_status": enumValue.pinStatus
                                };

                                // Set verification (generate pin = 2)
                                let updatesResult = await employeesModel.updateVerificationStatus(updateStatus);

                                if (updatesResult === null || updatesResult === undefined) {
                                    throw errData(200, message.inValidOtp(), null);
                                }
                                else {

                                    printLogger(2, generatePinResult, 'employee');
                                    return response(res, 200, true, message.insertSuccessfully('Pin'), {

                                        "status": generatePinResult.status,
                                        "verification_status": enumValue.pinStatus
                                    });
                                }
                            }
                        }
                        else {
                            throw errData(200, message.otpVerifyInComplete(), null);
                        }
                    }
                }
            }
            else {
                throw errData(200, message.pinNotMatch(), null);
            }
        }
    }
    catch (error) {

        printLogger(0, error, 'employee');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Resend otp 
exports.resendOtp = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        const errors = validationResult(req)

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'employee');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let reqBody = req.body;

            // Convert string to int
            let _reqBody = { "mobile_number": parseInt(reqBody.mobile_number) };

            // Get employee details by mobile number
            let employeeResult = await employeesModel.employeeMobileNumber(_reqBody)

            if (employeeResult === null || employeeResult === undefined) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.notMobileNumber(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'employee');
                // response(res, 200, false, message.notMobileNumber(), dataResult);
                throw errData(200, message.notMobileNumber(), null);
            }
            else {

                // Delete existing otp
                let = otpDeleteResult = await otpModel.employeeOtpDelete(employeeResult)

                let otpData = {
                    "otp": otpGenerate(),
                    "mobile_number": employeeResult.mobile_number,
                    "user_id": employeeResult._id,
                };

                // Generet new otp
                let otpGenerateResult = await otpModel.employeeOtpGenerate(otpData)

                await sendSMS("+91" + employeeResult.mobile_number, message.otpMessage(otpData.otp));

                // Otp for employee to verify mobile number
                // SMS notications Calling and send
                otpData = {
                    "otp": otpGenerateResult.otp,
                    "valid_otp": global.env.EXPIRE_OTP
                };

                let userId = { "user_id": employeeResult._id };

                // Generate short token
                let token = shortJwtToken(userId);

                printLogger(2, otpGenerateResult, 'employee');
                return response(res, 200, true, message.otpSendSuccessfully('Otp'),
                    {
                        "status": employeeResult.status,
                        "verification_status": employeeResult.verification_status,
                        "token": token
                    });
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
        printLogger(0, error, 'employee');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Employee forgot pin request 
exports.forgotPinRequest = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        let reqBody = req.body;
        const errors = validationResult(req);

        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), "employer");
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let _reqBody = { "mobile_number": parseInt(reqBody.mobile_number) };

            let employeeResult = await employeesModel.employeeMobileNumber(_reqBody)

            if (employeeResult === null) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.mobileNumberNotRegistered(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'employer');
                // return response(res, 200, false, message.mobileNumberNotRegistered(), dataResult);
                throw errData(200, message.mobileNumberNotRegistered(), null);
            }
            else if (employeeResult.verification_status >= enumValue.pinStatus && employeeResult.verification_status <= enumValue.loginStatus) {

                let otpDeleteResult = otpModel.employeeOtpDelete(employeeResult)

                let otpData = {
                    "otp": otpGenerate(),
                    "mobile_number": employeeResult.mobile_number,
                    "user_id": employeeResult._id,
                };

                let otpGenerateResult = await otpModel.employeeOtpGenerate(otpData);

                await sendSMS("+91" + employeeResult.mobile_number, message.otpMessage(otpData.otp));

                // Sms notications Calling and send
                otpData = {
                    "otp": otpGenerateResult.otp,
                    "valid_otp": global.env.EXPIRE_OTP
                };

                let userId = { "user_id": employeeResult._id };

                // Generate token for forgot pin
                let token = shortJwtToken(userId);

                printLogger(2, otpGenerateResult, 'employee');
                return response(res, 200, true, message.otpSendSuccessfully('Otp'), {
                    "mobile_number": otpGenerateResult.mobile_number,
                    "token": token
                });
            }
            else {
                // let dataResult = [{
                //     "value": "",
                //     "msg": message.registrationProcessIncomplete(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'employer');
                // return response(res, 200, false, message.registrationProcessIncomplete(), dataResult);
                throw errData(200, message.registrationProcessIncomplete(), null);
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
        printLogger(0, error, 'employer');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Employee otp verify by mobile number
exports.forgotPinOtpVerify = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        let reqBody = req.body;
        const errors = validationResult(req);

        if (!errors.isEmpty()) {

            printLogger(0, errors.array(), 'employee');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let token = reqBody.token;

            // Validate token
            let tokenResult = await jwtVerify(token);

            if (tokenResult === null || tokenResult === undefined) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.tokenExpired(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'employee');
                // return response(res, 200, false, message.tokenExpired(), dataResult);
                throw errData(200, message.tokenExpired(), null);
            }
            else {

                let checkEmployee = { "employee_id": ObjectId(tokenResult._id) };

                // Get employee details
                let employeeResult = await employeesModel.findEmployee(checkEmployee)

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

                    // Verify expiry 
                    let expiryVerify = verifyOtp(reqBody.otp);

                    let userId = { "user_id": employeeResult._id };

                    // Generate token for forgot pin
                    let token = shortJwtToken(userId);

                    // Check otp 000000 
                    if (reqBody.otp === "000000") {

                        printLogger(2, employeeResult, 'employee');
                        return response(res, 200, true, message.matchOtp(), { "mobile_number": employeeResult.mobile_number, "token": token });
                    }
                    else {
                        if (expiryVerify === undefined) {

                            // let dataResult = [{
                            //     "value": "",
                            //     "msg": message.inValidOtp(),
                            //     "param": "",
                            //     "location": ""
                            // }]
                            // printLogger(0, dataResult, 'employee');
                            // return response(res, 200, false, message.inValidOtp(), dataResult);
                            throw errData(200, message.inValidOtp(), null);
                        }
                        else {

                            let checkUser = {
                                "mobile_number": employeeResult.mobile_number,
                                "otp": reqBody.otp
                            };

                            let otpResult = await otpModel.otpVerify(checkUser)

                            if (otpResult === null) {

                                // let dataResult = [{
                                //     "value": "",
                                //     "msg": message.inValidOtp(),
                                //     "param": "",
                                //     "location": ""
                                // }]
                                // printLogger(0, dataResult, 'employee');
                                // return response(res, 200, false, message.inValidOtp(), "");
                                throw errData(200, message.inValidOtp(), null);
                            }
                            else {

                                printLogger(2, otpResult, 'employee');
                                return response(res, 200, true, message.matchOtp(), { "mobile_number": otpResult.mobile_number, "token": token });
                            }
                        }
                    }
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
        printLogger(0, error, 'employee');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Employee reset pin
exports.resetPin = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        let reqBody = req.body;
        let errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array());
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let pin = reqBody.pin;
            let verifyPin = reqBody.verify_pin;
            let token = reqBody.token;

            // Validate token
            let tokenResult = await jwtVerify(token)

            if (tokenResult === null || tokenResult === undefined) {
                // let dataResult = [{
                //     "value": "",
                //     "msg": message.tokenExpired(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'employee');
                // return response(res, 200, false, message.tokenExpired(), dataResult);
                throw errData(200, message.tokenExpired(), null);
            }
            else {

                // Campare pin and verify pin
                if (pin == verifyPin) {

                    let data = {
                        "user_id": tokenResult._id,
                        "password": bcryptjs.hashSync(pin, 4)
                    }

                    let employeeResult = employeesModel.generatePin(data)

                    if (employeeResult === null) {

                        // let dataResult = [{
                        //     "value": "",
                        //     "msg": message.userNotRegistered(),
                        //     "param": "pin",
                        //     "location": ""
                        // }]
                        // printLogger(0, dataResult, 'employee');
                        // return response(res, 200, false, message.userNotRegistered(), dataResult);
                        throw errData(200, message.userNotRegistered(), null);
                    }
                    else {

                        printLogger(0, employeeResult, 'employee');
                        return response(res, 200, true, message.updateSuccessfully('Pin'), " ");
                    }
                }
                else {
                    // let dataResult = [{
                    //     "value": "",
                    //     "msg": message.pinNotMatch(),
                    //     "param": "pin",
                    //     "location": ""
                    // }]
                    // return response(res, 200, false, message.pinNotMatch(), dataResult);
                    throw errData(200, message.pinNotMatch(), null);
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
        printLogger(0, error, 'employee');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Employee bank details //dont use plzz check and remove method
exports.bankDetails = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        let data = { "user_id": req.userData._id };
        let bankDetailsResult = await employeesModel.bankDetails(data);

        if (bankDetailsResult === null || bankDetailsResult === undefined) {
            throw errData(200, message.userNotRegistered(), null);
        }
        else {

            bankDetail = {
                bank_name: bankDetailsResult.bank_details.bank_name,
                account_number: bankDetailsResult.bank_details.account_number,
                ifsc_code: bankDetailsResult.bank_details.ifsc_code,
                pan_card: bankDetailsResult.pan_card,
                branch_name: bankDetailsResult.bank_details.branch_name,

            };

            // Bank details decryption file call
            let decryptionDetail = decryptData(bankDetail);
            let _response = {
                _id: bankDetailsResult._id,
                bank_details: {
                    bank_name: decryptionDetail.bank_name,
                    account_number: decryptionDetail.account_number,
                    ifsc_code: decryptionDetail.ifsc_code,
                    pan_card: decryptionDetail.pan_card,
                    branch_name: decryptionDetail.branch_name
                },
            }

            printLogger(2, _response, 'employee');
            return response(res, 200, true, message.bankDetails('Bank details'), _response);
        }
    }
    catch (error) {
        printLogger(0, error, 'employee');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Employee verify details
exports.verifyBankDetail = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        let reqBody = req.body;
        let _correct = enumValue.correctStatus
        let not_correct = enumValue.notCorrectStatus
        let verificationstatus_steps = reqBody.status == not_correct ? 2 : 3;
        let userStatus = reqBody.status == not_correct ? 6 : 1;

        let data = {
            "user_id": req.userData._id,
            "employer_id": req.userData.employer_user_id,
            "verificationstatus": verificationstatus_steps,
            "status": userStatus
        };

        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'employee');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else if (reqBody.status == _correct || reqBody.status == not_correct) {

            let bankDetailResult = await employeesModel.verifyBankDetail(data);
            let companyResult = await employerModel.findCompany(bankDetailResult);

            if (reqBody.status == not_correct) {

                // Employee click "Incorrect" for Bank/PAN details
                // Notications Calling and send
                inCorrectData = {
                    "employee_name": bankDetailResult.first_name + " " + bankDetailResult.last_name,
                    "employee_id": bankDetailResult.employee_id,
                    "company_name": companyResult.company_name,
                    "company_id": companyResult.rupyo_company_code,
                    "mobile_number": bankDetailResult.mobile_number,
                    "date": moment().format("LL"),
                    "time": moment().utcOffset("+05:30").format('hh:mm:ss A')
                }

                // Bank details incorrect notification mesage for employer
                let bankDetailsNotifications = notification.employeeInCorrectBankdeatils(inCorrectData);

                // Bank details incorrect notification mesage for rupyo admin
                let _bankDetailsNotifications = notification.rupyoAdminInformed(inCorrectData);

                let notificationsData = [];

                // Notification for employer
                notificationsData.push({
                    "user_id": data.user_id,
                    "company_id": data.employer_id,
                    "message": bankDetailsNotifications,
                    "resource_type": enumValue._bankdetails,
                    "request_id": bankDetailResult._id,
                    "status": not_correct, // bankDetailResult.status,
                    "for_notifications": enumValue.employerRoleId,
                    "created_by": bankDetailResult._id
                });


                // Notification for rupyo admin
                notificationsData.push({
                    "user_id": data.user_id,
                    "company_id": data.employer_id,
                    "message": _bankDetailsNotifications,
                    "resource_type": enumValue._bankdetails,
                    "request_id": bankDetailResult._id,
                    "status": not_correct, // bankDetailResult.status,
                    "for_notifications": enumValue.rupyoAdminRoleId,
                    "created_by": bankDetailResult._id
                });
                let notificationResult = await notificationModel.bulkInsert(notificationsData);

                let dataResult = [{
                    "value": '',
                    "msg": message.notLoggedIn(),
                    "param": "",
                    "location": ""
                }]
                printLogger(2, dataResult, 'employee');
                return response(res, 200, true, message.notLoggedIn(), dataResult);
            }

            else if (reqBody.verification_status !== enumValue._bankdetails) {

                printLogger(2, bankDetailResult, 'employee');

                /**
                * Resolve (or fulfill) the promise with data
                * Verification status send mobile app 
                * verification status = 5 /6 or 3
                * 5 = forcefully logout mobile app. 
                * 6 or 3 = next steps procced take selfie.
                */

                return response(res, 200, true, message.verifyDetail(), {
                    "verification_status": data.verificationstatus,
                    "status": userStatus
                });
            }
        }
        else {

            // let dataResult = [{
            //     "value": '',
            //     "msg": message.inValidDetail(),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(0, dataResult, 'employee');
            // return response(res, 500, false, message.inValidDetail(), dataResult);
            throw errData(200, message.inValidDetail(), null);
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'employee');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Employee selfie
exports.takeSelfie = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        let reqBody = req.body;
        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), 'employee');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let data = {
                "user_id": req.userData._id,
                "filename": reqBody.selfie
            };
            let result = employeesModel.takeSelfie(data)

            printLogger(2, result, 'employee');
            return response(res, 200, true, message.validSelfie('Selfie'), '');
        }
    }
    catch (error) {
        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'employee');
        // return response(res, 500, false, message.error(error), error);
        next(error)
    }
};


// Employee profile
exports.employeeProfile = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        let data = { "user_id": req.userData._id };
        let result = await employeesModel.employeeProfile(data);

        if (result === null || result === undefined) {
            throw errData(200, message.userNotRegistered(), null);
        }
        else {

            let companyId = { "company_id": result.company_id };

            // Get company details
            let companyResult = await employerModel.findCompany(companyId);

            // Employer credit limit default set month wise
            let creditLimitType = enumValue.monthWiseCreditLimit;

            // Get current month credit_limit_type value from commonFunction
            creditLimitType = employeeCreditLimitType(companyResult);

            // Calculate employee credit limit
            if (result.credit_limit_type === enumValue.percentBaseType && result.credit_limit_percent > 0) {
                result.rupyo_credit_limit = parseFloat((result.net_salary * result.credit_limit_percent) / 100);
            }

            bankDetail = {
                bank_name: result.bank_details.bank_name,
                account_number: result.bank_details.account_number,
                ifsc_code: result.bank_details.ifsc_code,
                pan_card: result.pan_card,
                branch_name: result.bank_details.branch_name,
                bank_account_type: result.bank_details.bank_account_type,
                name_in_bank: result.bank_details.name_in_bank
            };

            // Bank details decryption file call
            let decryptionDetail = decryptData(bankDetail);
            let _response = {
                "_id": result._id,
                "first_name": result.first_name,
                "middle_name": result.middle_name || "",
                "last_name": result.last_name,
                "company_name": result.company_name,
                "aadhar_card": result.aadhar_card || "",
                "dob": result.dob || "",
                "father_mother_name": result.father_mother_name || "",
                "employer_credit_limit_type": creditLimitType,
                "cibil_score": result.cibil_score || "",
                "district": result.address.district || "",
                "gender": result.gender || "",


                "bank_details": {
                    "bank_name": decryptionDetail.bank_name,
                    "account_number": decryptionDetail.account_number,
                    "ifsc_code": decryptionDetail.ifsc_code,
                    "pan_card": decryptionDetail.pan_card,
                    "branch_name": decryptionDetail.branch_name,
                    "name_in_bank": decryptionDetail.name_in_bank,
                    "bank_account_type": decryptionDetail.bank_account_type
                },

                "email": result.email,
                "mobile_number": result.mobile_number,
                "work_shift_name": result.work_shift_name,
                "rupyo_credit_limit": result.rupyo_credit_limit,
                "selifie": result.selfie
            }
            printLogger(2, _response, 'employee');
            return response(res, 200, true, message.dataFound(), _response);
        }
    }
    catch (error) {
        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'employee');
        // return response(res, 500, false, message.error(error), error);
        next(error)
    }
};


// Employee change pin
exports.changePin = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        let reqBody = req.body;
        let oldPin = reqBody.old_pin;
        let newPin = reqBody.new_pin;
        let verifyPin = reqBody.verify_pin;

        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'employee');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let reqData = { "_id": req.userData._id };

            // Find user by employee id
            let employeeResult = await employeesModel.signIn(reqData)

            if (employeeResult === null || employeeResult === undefined) {

                // let dataResult = [{
                //     "value": '',
                //     "msg": message.unauthorizedUser(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'employee');
                // return response(res, 403, false, message.unauthorizedUser(), dataResult);
                throw errData(200, message.unauthorizedUser(), null);
            }
            else {

                // Password compare 
                const isMatch = bcryptjs.compareSync(oldPin, employeeResult.password);

                if (isMatch) {

                    // Check new pin and verify pin same or not
                    if (newPin === verifyPin) {

                        // Encrypt pin
                        let _newPin = bcryptjs.hashSync(newPin, 4);

                        // Change employee pin
                        let changePinResult = await employeesModel.changePin(reqData, _newPin)

                        if (changePinResult === null) {

                            // let dataResult = [{
                            //     "value": '',
                            //     "msg": message.unableToUpdate('Pin'),
                            //     "param": "",
                            //     "location": ""
                            // }]
                            // printLogger(0, dataResult, 'employee');
                            // return response(res, 200, false, message.unableToUpdate('Pin'), dataResult);
                            throw errData(200, message.unableToUpdate('Pin'), null);
                        }
                        else {

                            // Employee reset password
                            // Employee infrom email

                            printLogger(0, changePinResult, 'employee');
                            return response(res, 200, true, message.updateSuccessfully('Pin'),
                                { "_id": changePinResult._id });
                        }
                    }

                    // New pin and verify pin not match
                    else {
                        // let dataResult = [{
                        //     "value": '',
                        //     "msg": message.pinNotMatch(),
                        //     "param": "pin",
                        //     "location": ""
                        // }]
                        // printLogger(0, dataResult, 'employee');
                        // return response(res, 200, false, message.pinNotMatch(), dataResult);
                        throw errData(200, message.pinNotMatch(), null);
                    }
                }

                // Invalid pin
                else {
                    // let dataResult = [{
                    //     "value": '',
                    //     "msg": message.invalidPin(),
                    //     "param": "",
                    //     "location": ""
                    // }]
                    // printLogger(0, dataResult, 'employee');
                    // return response(res, 200, false, message.invalidPin(), dataResult);
                    throw errData(200, message.invalidPin(), null);
                }
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
        printLogger(0, error, 'employee');
        // return response(res, 500, false, message.error(error), error);
        next(error)
    }
};


// Manual employee registration process
exports.manualEmployeeRegistration = async (req, res) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        let reqBody = req.body;
        let userData = req.userData;

        let query = { _id: ObjectId(reqBody.employee_id) };

        // If employee registration process by employer set company id in query
        if (userData.role_id === enumValue.employerRoleId) {
            query.company_id = userData.company_id;
        }

        // Update data
        let updateData = {

            // Hashing employee 4 digit pin
            "password": bcryptjs.hashSync("0000", 4),
            "verification_status": enumValue.selfie,
            "selfie": "selfies/1638512750622.png",
            "updated_by": userData._id
        }


        // Update employee data
        let updateResult = await employeesModel.updateManualEmployeeRegistation(query, updateData);

        if (updateResult === null || updateData === undefined) {

            let dataResult = [{
                "value": '',
                "msg": message.unableToUpdate('employee registration process'),
                "param": "",
                "location": ""
            }]
            printLogger(0, dataResult, 'employee');
            return response(res, 200, false, message.unableToUpdate('employee registration process'), dataResult);
        }
        else {

            printLogger(0, updateResult, 'employee');
            return response(res, 200, true, message.updateSuccessfully('Employee registration process'),
                { "_id": updateResult._id });
        }
    }
    catch (error) {

        let dataResult = [{
            "value": '',
            "msg": message.error(error),
            "param": "",
            "location": ""
        }]
        printLogger(2, dataResult, 'employee');
        return response(res, 500, false, message.error(error), error);
    }
};


// Employee Csv file upload
exports.employeeCsvUpload = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        const errors = validationResult(req);
        let reqBody = req.body;

        printLogger(4, `REQ.HEADERS:-${util.inspect(req.headers)}`, 'employee');
        printLogger(4, `REQ.BODY:-${util.inspect(req.body)}`, 'employee');
        printLogger(4, `REQ.FILES:- ${util.inspect(req.files)}`, 'employee');
        // If validation errors
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'employee');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let companyId = reqBody.company_id
            if (req.userData.role_id == enumValue.employerRoleId) {
                companyId = req.userData.company_id
            }

            let checkData = { "company_id": companyId };

            let companyResultArray = await employerModel.employerProfile(checkData);
            let companyResult = companyResultArray[0];

            let S3 = new AWS.S3();

            let s3Params = {
                Bucket: 'rupyo-private',
                Key: reqBody.csv_s3_key
            };


            // get csv file and create stream
            const stream = S3.getObject(s3Params).createReadStream();
            printLogger(2, `STREAM:- ${stream}`, 'employee');

            // const stream = fs.createReadStream('../rup-api/public/excels/csv/employee_csv2.csv')

            // convert csv file (stream) to JSON format data
            const jsonObj = await csv().fromStream(stream);
            printLogger(2, `JSONOBJ:- ${jsonObj}`, 'employee');


            let employeeResult = [];
            let errorData = [];
            let _employeeData = [];
            let done = 0;
            let serialNumber;


            /** Start Json Array Code */
            for (let i = 0; i < jsonObj.length; i++) {
                done++;
                let validationData = jsonObj[i];

                // Validation csv file 
                let errorMsg = await validationCsvFile(validationData);
                if (!moment(validationData.dob,'YYYY-MM-DD',true).isValid()) {
                    errorMsg.push("Date is invalid. Please enter a date in the format yyyy-mm-dd.");
                }

                // printLogger(4, `REQ.FILES DOB:- ${util.inspect(validationData.dob)}`, 'employee');
                // sendEmail('pmandloi@flair-solution.com', 'njhawar@flair-solution.com', `<div>[${validationData}] :-</div>`, "Some Error in Rupyo DOB");
                //   let parsed = moment(jsonObj[i].dob, "YYYY-MM-DD");
                //    sendEmail('pmandloi@flair-solution.com', 'njhawar@flair-solution.com', `<div>[${parsed}] :-</div>`, "Some Error in Rupyo DOB-parsed");


                // sendEmail('pmandloi@flair-solution.com', 'njhawar@flair-solution.com', `<div>[${parsednew}] :-</div>`, "Some Error in Rupyo DOB-parsednew");
                if (errorMsg.length > 0) {

                    printLogger(2, "*******  errorMsg  ********", 'employee');
                    printLogger(2, `errorMsg:-  ${errorMsg}`, 'employee');

                    jsonObj[i].error = errorMsg[0];
                    errorData.push(jsonObj[i]);
                }
                else {

                    let emailResult = null;

                    if (jsonObj[i].email) {

                        let checkEmail = { "email": jsonObj[i].email };

                        checkEmail.url = req.url

                        // Check alredy registered email
                        emailResult = await employeesModel.findAlreadyExistEmployee(checkEmail)
                        printLogger(2, "*******  emailResult  ********", 'employee');
                        printLogger(2, `emailResult:-  ${emailResult}`, 'employee');

                        if (emailResult) {

                            jsonObj[i].error = message.emailIdAlreadyTaken();
                            errorData.push(jsonObj[i]);
                        }
                    }

                    if (emailResult === null) {

                        let data = { "mobile_number": parseInt(jsonObj[i].mobile_number) };

                        // Check already registered mobile number
                        let mobileNumberResult = await employeesModel.employeeMobileNumber(data);
                        printLogger(2, "*******  Mobile Number Result  ********", 'employee');
                        printLogger(2, `mobileNumberResult:-  ${mobileNumberResult}`, 'employee');

                        if (mobileNumberResult) {

                            jsonObj[i].error = message.mobileNumberIdAlreadyTaken();
                            errorData.push(jsonObj[i]);
                        }
                        else {

                            // Get rupyo company code
                            let employeeId;
                            let rupyoCreditLimit;

                            let isAllFieldsRight = false;

                            if (companyResult.employee_id_generation_method == enumValue.randomGeneratedMethod) {

                                // Get company global setting
                                let companySettingResult = await globalSettingModel.getSetting(checkData);
                                printLogger(2, `companySettingResult:-  ${companySettingResult}`, 'employee');

                                // First six digit of rupyo company code
                                let sixDigitRupyoCompanyCode = companySettingResult.rupyo_company_code.substring(0, 6);

                                serialNumber = companySettingResult.employee_id_number;
                                printLogger(2, `serialNumber:-  ${serialNumber}`, 'employee');

                                if (serialNumber === null) {

                                    // Get employee count and set new serial number
                                    let dummyPayload = {
                                        "company_id": "",
                                        "status_filter": "",
                                        "employee_type": "",
                                        "search_name": "",
                                        "page": "",
                                        "page_size": "",
                                        "sort_by": "",
                                        "sort_by_column": ""
                                    }
                                    let employeeResult = await employeesModel.employeesList(dummyPayload, reqBody.company_id);
                                    let totalEmployee = employeeResult.total;

                                    serialNumber = 10000000 + totalEmployee;
                                }

                                if (serialNumber.toString().length === 10) {
                                    serialNumber = serialNumber.toString().substring(0, 8)
                                }

                                serialNumber = parseInt(serialNumber) + i + 1;

                                // Set 14 digit employee id with first six digit rupyo company code
                                employeeId = `${sixDigitRupyoCompanyCode}${serialNumber}`;

                                // remove random logic
                                //  employeeId = randomString(14);
                                isAllFieldsRight = true;
                            }
                            else {

                                // Employee id length check ( 14 )
                                if (jsonObj[i].employee_id.length >= 14) {

                                    let checkEmployeeId = {
                                        employee_manual_id: jsonObj[i].employee_id,
                                        company_id: reqBody.company_id
                                    };

                                    // Employee id check already exist particular company 
                                    let manualEmployeeIdResult = await employeesModel.findAlreadyExistEmployee(checkEmployeeId);
                                    printLogger(2, "*******  manualEmployeeIdResult  ********", 'employee');
                                    printLogger(2, `manualEmployeeIdResult:-  ${manualEmployeeIdResult}`, 'employee');

                                    if (manualEmployeeIdResult === null) {

                                        employeeId = jsonObj[i].employee_id;
                                        isAllFieldsRight = true;
                                    }
                                    else {
                                        jsonObj[i].error = message.employeeId();

                                        errorData.push(jsonObj[i]);
                                        isAllFieldsRight = false;
                                    }
                                }
                                else {

                                    jsonObj[i].error = message.validEmployeeId();
                                    errorData.push(jsonObj[i]);
                                }
                            }


                            if (isAllFieldsRight === true) {

                                // Check net pay
                                if (jsonObj[i].net_pay <= 0 || jsonObj[i].net_pay == '') {

                                    jsonObj[i].error = message.correctNetPay();

                                    errorData.push(jsonObj[i]);
                                    isAllFieldsRight = false;
                                }
                                else {
                                    isAllFieldsRight = true;
                                }


                                // Check all fields right or not
                                if (isAllFieldsRight === true) {

                                    // Rupyo credit limit
                                    if (jsonObj[i].rupyo_credit_limit) {

                                        rupyoCreditLimit = jsonObj[i].rupyo_credit_limit;
                                    }
                                    else {

                                        // Get rupyoCreditLimit value from env file
                                        rupyoCreditLimit = global.env.EMPLOYEE_CREDIT_LIMIT;
                                    }

                                    // Random employee_sys_id generate 16 digit
                                    let employee_sys_id = randomString(16);

                                    // Bank detail encryption
                                    let bankDetail = {
                                        bank_name: jsonObj[i].bank_name,
                                        account_number: jsonObj[i].account_number,
                                        ifsc_code: jsonObj[i].ifsc_code,
                                        pan_card: jsonObj[i].pan_card,
                                        branch_name: jsonObj[i].branch_name,
                                        bank_account_type: jsonObj[i].bank_account_type,
                                        name_in_bank: jsonObj[i].name_in_bank

                                    }
                                    let encryptDetail = encryptData(bankDetail);

                                    let employeeData = jsonObj[i];
                                    employeeData.role_id = enumValue.employeeRoleId;

                                    let parsednew = jsonObj[i].dob ? moment(jsonObj[i].dob).format("YYYY-MM-DD") : null;

                                    // By deafult active
                                    employeeData.middle_name = jsonObj[i].middle_name ? jsonObj[i].middle_name : "";
                                    employeeData.cibil_score = jsonObj[i].cibil_score ? jsonObj[i].cibil_score : "";
                                    employeeData.dob = parsednew;
                                    employeeData.status = enumValue.activeStatus;
                                    employeeData.credit_limit_type = enumValue.fixAmountType;
                                    employeeData.employee_id = employeeId;
                                    employeeData.employee_sys_id = employee_sys_id;
                                    employeeData.employee_type = reqBody.employee_type
                                    employeeData.company_id = reqBody.company_id;
                                    employeeData.work_shift_id = reqBody.work_shift_id;
                                    employeeData.rupyo_credit_limit = rupyoCreditLimit;
                                    employeeData.verification_status = enumValue.new_register;
                                    employeeData.aadhar_card = jsonObj[i].aadhar_card || "";

                                    // Employee salary details
                                    employeeData.basic_pay = jsonObj[i].basic_pay;
                                    employeeData.additional_pay = jsonObj[i].additions;
                                    employeeData.net_deductions = jsonObj[i].deductions;
                                    employeeData.net_salary = jsonObj[i].net_pay;

                                    // Bank details
                                    employeeData.bank_details = {
                                        bank_name: encryptDetail.bank_name,
                                        account_number: encryptDetail.account_number,
                                        ifsc_code: encryptDetail.ifsc_code,
                                        branch_name: encryptDetail.branch_name,
                                        bank_account_type: encryptDetail.bank_account_type,
                                        name_in_bank: encryptDetail.name_in_bank
                                    };

                                    employeeData.pan_card = encryptDetail.pan_card;

                                    // Employee addresss
                                    employeeData.address = {
                                        address_1: jsonObj[i].address_1,
                                        address_2: jsonObj[i].address_2 ? jsonObj[i].address_2 : "",
                                        pincode: jsonObj[i].pincode,
                                        city: jsonObj[i].city,
                                        state: jsonObj[i].state,
                                        country: jsonObj[i].country,
                                        district: jsonObj[i].district,
                                    };

                                    employeeData.employee_payout_activation_date = moment().utc().add(1, 'month').startOf('month');
                                    employeeData.created_by = req.userData._id;

                                    // console.log(employeeData)

                                    _employeeData.push(employeeData);

                                    let result = await employeesModel.bulkInsertEmployee([employeeData]);
                                    employeeResult.push(result)
                                }
                            }
                        }
                    }
                }
            }
            /** End Json Array Code */

            printLogger(2, "*******  _employeeData Array  ********", 'employee');
            printLogger(2, `_employeeData:- ${util.inspect(_employeeData)}`, 'employee');


            printLogger(2, "*******  employeeResult  ********", 'employee');
            printLogger(2, `employeeResult:- ${util.inspect(employeeResult)}`, 'employee');


            // Error data array logger
            printLogger(2, "*******  Error Data Array  ********", 'employee');
            printLogger(2, `errorData.LENGTH:-  ${errorData.length}`, 'employee');
            printLogger(2, `errorData:- ${util.inspect(errorData)}`, 'employee');


            /** Start email Code */
            if (_employeeData.length > 0) {

                for (let i = 0; i < _employeeData.length; i++) {


                    // Semd welcome SMS to employee
                    let awsSMS = sendSMS("+91" + _employeeData[i].mobile_number, message.employeeWelcomeSMS(companyResult.company_name));

                    let emailData = {
                        "employee_name": `${_employeeData[i].first_name} ${_employeeData[i].last_name}`,
                        "company_name": companyResult.company_name,
                        "employee_id": _employeeData[i].employee_id,
                        "date": moment().format("LL"),
                        "time": moment().utcOffset("+05:30").format('hh:mm:ss A')
                    }

                    // Email for employer
                    let responseEmailtoEmployer = sendEmail(companyResult.email, companyResult.email, `<div>${message.employeeWelcomeEmailToEmployer(emailData)}</div>`, "Welcome to Rupyo");

                    // Send welcome email to employee if have email
                    if (_employeeData[i].email) {

                        // Email for employee
                        let responseEmail = sendEmail(_employeeData[i].email, _employeeData[i].email, `<div>${message.employeeWelcomeEmail(emailData)}</div>`, "Welcome to Rupyo");
                    }
                }
            }
            /** End email Code */

            if (employeeResult.length > 0) {
                // Update global setting model if company employee id setting is employee id generation method
                if (companyResult.employee_id_generation_method == enumValue.randomGeneratedMethod) {

                    // Update global setting model
                    let updateSettingData = {
                        "company_id": companyId,
                        "employee_id_number": serialNumber
                    }

                    globalSettingModel.updateSetting(updateSettingData);
                }
            }

            let params = {
                "successCount": employeeResult.length,
                "failureCount": errorData.length
            };

            let isSuccess = true;

            if (errorData.length > 0) {
                isSuccess = false;
            }

            let _response = {
                "success_count": employeeResult.length,
                "failure_count": errorData.length,
                "error_data": errorData
            }

            // RESPONSE
            printLogger(2, errorData, 'employee');
            return response(res, 200, isSuccess, "", _response);
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



// Work shift name update prticular employee // Dont use at a time check and method remove
exports.workShiftUpdate = async (req, res, next) => {
    try {
        printLogger(2, `*************** ${req.originalUrl} **************** `, "employee");

        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), 'employee');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let reqBody = req.body;
            let result = await employeesModel.workShiftName(reqBody, req.userData)
            if (result === null || result === undefined) {
                // let dataResult = [{
                //     "value": "",
                //     "msg": message.unableToUpdate('work shift name'),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'employee');
                // return response(res, 200, false, message.unableToUpdate('work shift name'), dataResult);
                throw errData(200, message.unableToUpdate('work shift name'), null);
            }
            else {

                printLogger(2, result, 'employee');
                return response(res, 200, true, message.updateSuccessfully('Work shift name'), "");
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
        printLogger(0, `Error:- ${error}`, 'employee');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// Get punch in/punch out details (today)
let findTodayAttedance = async (checkData) => {

    let todayPunchin = null;
    let todayPunchout = null;
    let hoursSpentToday = 0;
    let timeRightNow = moment().utc();

    checkData.employee_id = (checkData.employee_id).toString();

    let attendanceData = await attendanceModel.findTodayAttedance(checkData);

    if (attendanceData === undefined || attendanceData === null) {

        todayPunchin = null;
        todayPunchout = null;
    }
    else {
        if (attendanceData.punch_out === undefined) {

            todayPunchin = attendanceData.punch_in;
            todayPunchout = null;

        }
        else {

            todayPunchin = attendanceData.punch_in;
            todayPunchout = attendanceData.punch_out;
        }
    }
    let _todayPunchin = moment(todayPunchin).utc();


    // Get hours spent today
    if (attendanceData === undefined || attendanceData === null) {
        hoursSpentToday = 0;
    }
    else {

        if (attendanceData.punch_out) {

            let _todayPunchout = moment(todayPunchout).utc();
            hoursSpentToday = moment.duration(_todayPunchout.diff(_todayPunchin)).hours();
        }
        else {

            hoursSpentToday = moment.duration(timeRightNow.diff(_todayPunchin)).hours();
        }
    }

    let data = {
        "todayPunchin": todayPunchin,
        "todayPunchout": todayPunchout,
        "hoursSpentToday": hoursSpentToday
    }

    return data
};


// Get unread count of notifications
let unreadNotificationCountAction = async (checkData) => {
    try {

        let unreadCountResult = await notificationModel.unreadNotificationCount(checkData)

        if (unreadCountResult === null) {
            return 0;
        }
        else {
            return unreadCountResult;
        }
    }
    catch {
        return 0;
    }
};


// Find last swipe
let lastSwipeAction = async (checkData) => {
    let lastSwipe = "";
    try {
        let data = await attendanceModel.findEmployeeAttendance(checkData);

        if (data === null) {
            lastSwipe = "";
        }

        if (data[0].punch_out) {

            lastSwipe = moment(data[0].punch_out);
        }
        else {

            lastSwipe = moment(data[0].punch_in);
        }

        return lastSwipe
    }
    catch (error) {

        return lastSwipe
    }

};


//  Get employee attendance details and total earning
let totalEarnedAction = async (data, netSalary, netDeductions) => {
    try {

        let year = moment().utc().format('YYYY');
        let month = moment().utc().format('M');
        let netPayPerMonth = 0;
        let netPayPerDay = 0;
        let totalEarned = 0;
        let pay = 0;
        let date;
        let loggedWorkHours = "";
        let totalDays = moment().utc().endOf('month').format("D");
        netPayPerMonth = parseFloat(netSalary); // - parseFloat(netDeductions);
        netPayPerDay = parseFloat(netPayPerMonth) / parseFloat(totalDays);
        let checkData = {
            "employee_id": data.employee_id,
            "year": parseInt(year),
            "month": parseInt(month)
        }

        // Get employee attendance details
        let monthlyAttendanceResult = await monthlyAttendanceModel.findMonthlyAttendanceByYearMonth(checkData);

        if (monthlyAttendanceResult === null || monthlyAttendanceResult === undefined) {

            return totalEarnedData = {
                "total_earned": 0,
                "net_pay_per_month": netPayPerMonth,
                "net_pay_per_day": netPayPerDay,
                "net_salary": 0,
                "net_deductions": 0,
                "present": 0,
                "absent": 0,
                "halfDay": 0,
                "leave": 0,
                "missed_punch": 0,
                "weekly_off": 0,
                "paid_holiday": 0,
                "unpaid_holiday": 0
            };
        }
        else {

            let presents = monthlyAttendanceResult.presents;
            pay = parseFloat(netPayPerDay * presents);
            totalEarned = totalEarned + pay;

            let absents = monthlyAttendanceResult.absents;
            pay = parseFloat(0 * absents);
            totalEarned = totalEarned + pay;

            let halfDays = monthlyAttendanceResult.half_days;
            pay = parseFloat((netPayPerDay / 2) * halfDays);
            totalEarned = totalEarned + pay;

            let leaves = monthlyAttendanceResult.leaves;
            pay = parseFloat(netPayPerDay * leaves);
            totalEarned = totalEarned + pay;

            let weeklyOff = monthlyAttendanceResult.weekly_off;
            pay = parseFloat(netPayPerDay * weeklyOff);
            totalEarned = totalEarned + pay;

            let paidHoliday = monthlyAttendanceResult.paid_holiday;
            pay = parseFloat(netPayPerDay * paidHoliday);
            totalEarned = totalEarned + pay;


            let totalEarnedData = {
                "total_earned": totalEarned || 0,
                "net_pay_per_month": netPayPerMonth || 0,
                "net_pay_per_day": netPayPerDay || 0,
                "net_salary": netSalary || 0,
                "net_deductions": netDeductions || 0,
                "present": monthlyAttendanceResult.presents,
                "absent": monthlyAttendanceResult.absents,
                "halfDay": monthlyAttendanceResult.half_days,
                "leave": monthlyAttendanceResult.leaves,
                "missed_punch": monthlyAttendanceResult.missed_punch,
                "weekly_off": monthlyAttendanceResult.weekly_off,
                "paid_holiday": monthlyAttendanceResult.paid_holiday,
                "unpaid_holiday": monthlyAttendanceResult.unpaid_holiday
            };
            return totalEarnedData;
        }
    }
    catch {
        return 0;
    }
};


// JWT Token verify
let jwtVerify = async (token) => {
    let tokenResult
    try {

        tokenResult = await jwt.verify(token, jwt_secret)
        return tokenResult
    }
    catch (error) {
        return null
    }
};


// Sign in common function for sign in and auto sign in (employee)
let signInAction = async (result) => {
    try {

        let reqBody = result.reqBody;
        let todayPunchin = null;
        let todayPunchout = null;
        let year = moment().utc().format('YYYY');
        let month = moment().utc().format('M');
        let thisMonthAbsents = 0;
        let thisMonthLeaves = 0;
        let totalDays = parseInt(moment().utc().endOf('month').format("DD"));
        let totalWorkedDays = 0;
        let netSalary = 0;
        let totalAmountWithdrawn = 0;
        let amountAvailable = 0;
        let rupyoCreditLimit = 0;
        let timeRightNow = moment().utc();
        let hoursSpentToday = 0;
        let employerPayTransactionCharge = false;
        let transactionPercent = global.env.TRANSACTION_DEDUCTION_PERCENT;
        let creditLimitType = enumValue.monthWiseCreditLimit;


        // Get current month employer_pay_transaction_charge value from commonFunctions
        employerPayTransactionCharge = transactionChargeSetting(result.Company);

        // Get current month credit_limit_type value from commonFunction
        creditLimitType = employeeCreditLimitType(result.Company);

        netSalary = result.net_salary;

        // Calculate employee rupyo credit limit
        if (result.credit_limit_type === enumValue.percentBaseType && result.credit_limit_percent > 0) {

            result.rupyo_credit_limit = parseFloat((result.net_salary * result.credit_limit_percent) / 100);
        }

        rupyoCreditLimit = result.rupyo_credit_limit;

        let bankDetails = {
            bank_name: result.bank_details.bank_name,
            account_number: result.bank_details.account_number,
            ifsc_code: result.bank_details.ifsc_code,
            pan_card: result.pan_card,
            branch_name: result.bank_details.branch_name,
            bank_account_type: result.bank_details.bank_account_type,
            name_in_bank: result.bank_details.name_in_bank
        };

        // Bank details decryption file call
        let decryptionDetail = decryptData(bankDetails);

        let saveData = {
            "user_id": result._id,
            "firebase_device_token": reqBody.firebase_device_token
        };

        // USER MODEL -> UPDATE FIREBASE DEVICE TOKEN
        userModel.updateFirebaseDeviceToken(saveData);

        let checkData = {
            "employee_id": result._id,
            "year": year,
            "month": month,
            'user_id': result._id,
            'time_filter': enumValue._thisMonth,
            'status': enumValue.pendingStatus,
            "for_notifications": enumValue.employeeRoleId
        }

        // ATTENDANCE MODEL -> FIND TODAY ATTENDANCE
        let attendanceData = await findTodayAttedance(checkData);

        // MONTHLY ATTENDANCE MODEL -> SHOW MONTHLY ATTENDANCE
        let monthlyAttendanceResult = await showMonthlyAttendance(result);

        //  MONTHLY TRANSACTION MODEL -> FIND MONTHLY TRANSACTION
        let monthlyTransactionResult = await findMonthlyTransactionByYearMonth(checkData);

        // NOTIFICATION MODEL -> UNREAD NOTIFICATION COUNTS
        let unreadNotificationCount = await unreadNotificationCountAction(checkData);

        checkData.status = [enumValue.pendingStatus, enumValue.approvedStatus, enumValue.holdStatus];

        // TRANSCATION MODEL -> EMPLOYEE TRANSACTIONS LIST
        let processInAmount = await employeeProcessingAmount(checkData);

        // Company holidays
        let holidayResult = await companyHolidays(result.company_id);

        let selfie_url = null;
        //result.selfie = 'favicon.ico';

        if (result.selfie !== undefined && result.selfie !== null) {
            selfie_url = await tokenMethod.getCloudFrontURL(result.selfie);
        }

        // Set response
        let responseData = {

            "status": result.status,
            "verification_status": result.verification_status,
            "user": {
                "name": result.first_name + ' ' + result.middle_name + ' ' + result.last_name,
                "email": result.email,
                "selfie_url": selfie_url,
                "company": result.company_name,
                "mobile": result.mobile_number,
                "aadhar_card": result.aadhar_card || "",
                "dob": result.dob || "",
                "father_mother_name": result.father_mother_name || "",
                "cibil_score": result.cibil_score || "",
                "district": result.address.district || "",
                "gender": result.gender || "",
            },
            "punch": {
                "in": moment(attendanceData.todayPunchin).utc() || null,
                "out": moment(attendanceData.todayPunchout).utc() || null,
                "last_swipe": result.last_swipe || "",
            },
            "bank_details": {
                "account_number": decryptionDetail.account_number,
                "bank_name": decryptionDetail.bank_name,
                "ifsc_code": decryptionDetail.ifsc_code,
                "pan_card": decryptionDetail.pan_card,
                "branch_name": decryptionDetail.branch_name,
                "bank_account_type": decryptionDetail.bank_account_type,
                "name_in_bank": decryptionDetail.name_in_bank,
            },
            "stats": {
                "salary": {
                    "total_days_in_current_month": totalDays,
                    "total_days_worked_in_current_month": monthlyAttendanceResult.totalWorkedDays,
                    "salary_earned": parseFloat(monthlyAttendanceResult.totalEarnedAmount.toFixed(2)),
                    "credit_limit": rupyoCreditLimit,
                    "amount_in_process": processInAmount,
                    "amount_available": parseFloat(monthlyAttendanceResult.availableAmount.toFixed(2)),
                    "remaining_credit_limit": parseFloat(rupyoCreditLimit - monthlyTransactionResult.totalAmountWithdrawn.toFixed(2)),
                    "total_amount_withdrawn": parseFloat(monthlyTransactionResult.totalAmountWithdrawn.toFixed(2)),
                    "total_net_salary": parseInt(result.net_salary)
                },
                "attendance": {
                    "hours_spent_today": attendanceData.hoursSpentToday,
                    "absents_this_month": monthlyAttendanceResult.thisMonthAbsents,
                    "leaves_this_month": monthlyAttendanceResult.thisMonthLeaves,
                    "missed_punch_this_month": monthlyAttendanceResult.thisMonthMissedPunch,
                }
            },
            "unreadNotificationCount": unreadNotificationCount,
            "holidayResult": holidayResult,
            "company_data": {
                "employer_pay_transaction_charge": employerPayTransactionCharge.employer_pay_transaction_charge,
                "transaction_deduction_percent": employerPayTransactionCharge.employer_pay_transaction_charge === false ? employerPayTransactionCharge.transaction_deduction_percent : 0,
                "credit_limit_type": creditLimitType
            }
        }

        return responseData;
    }
    catch (error) {

        printLogger(0, `signInAction:- ${error}`, 'employee');
        return false
    }
};