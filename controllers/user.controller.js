// Init code
const { validationResult } = require('express-validator');
const bcryptjs = require('bcryptjs');
const moment = require('moment');
const util = require('util');
const jwt = require('jsonwebtoken');

const { response } = require('../core/responseformat');
const { message, printLogger, notification, jwtTokenGenerate, enumValue, randomString, shortJwtToken, jwtVerify, errData } = require('../core/utility');
const { sendEmail, sendSMS, employeeCreditLimitType, findMonthlyTransactionByYearMonth } = require('../core/commonFunctions');
const notificationsController = require('../controllers/notifications.controller');
const employerController = require('./employer.controller');
const userModel = require('../models/user.model');
const settlementModel = require('../models/settlement.model');
const employeesModel = require('../models/employees.model');
const employerModel = require('../models/employer.model');
const transactionModel = require('../models/transaction.model')
const attendanceModel = require('../models/attendance.model');
const tokenMethod = require('../core/getOpenIdToken');
const notificationModel = require('../models/notifications.model');
const monthlyTransactionModel = require('../models/monthlyTransaction.model');
const otpModel = require('../models/otp.model');
const jwt_secret = global.env.JWT_SECRET;



// Autosave admin account
exports.autoSaveAdminAccount = async () => {
    try {
        // Password hashing
        const hashedPassword = bcryptjs.hashSync('12345678', 10);

        let adminAccounts = [{
            role_id: 4,
            employee_sys_id: "null_1",
            first_name: "Shivin",
            last_name: "Khanna",
            email: "founders@rupyo.in",
            mobile_number: "9009632145",
            status: 1,
            password: hashedPassword,
            have_payout_approve_access: true,
            have_payout_credit_access: true
        },
        {
            role_id: 1,
            employee_sys_id: "null_2",
            first_name: "Rupyo",
            last_name: "Support",
            email: "support@rupyo.in",
            mobile_number: "9000000124",
            status: 1,
            password: hashedPassword,
            have_payout_approve_access: true,
            have_payout_credit_access: true
        }]

        adminAccounts.forEach(async (admin) => {
            let adminAccount = await userModel.find({ email: admin.email });

            if(adminAccount?._id){
                let consoleMsg = admin.role_id == enumValue.superAdminRoleId ? "Super Admin Already Created!" : "Rupyo Admin Already Created!";
                console.log(consoleMsg)
            }
            else{
                let adminCrt = await userModel.createRupyoAdmin(admin);
                let consoleMsg = admin.role_id == enumValue.superAdminRoleId ? "Super Admin Created Successfully!" : "Rupyo Admin Created Successfully!";
                console.log(consoleMsg)
            }
        })
    }
    catch (error) {}
};


// User login
exports.login = async (req, res, next) => {
    try {
        printLogger(2, `*********** ${req.originalUrl} ************`, 'rupyo_admin');

        let reqBody = req.body;
        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), 'rupyo_admin');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let data = { "email": reqBody.email };

            // Find user email id
            let findResult = await userModel.find(data);

            if (findResult === null || findResult === undefined) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.invalidPassword(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'rupyo_admin');
                // return response(res, 200, false, message.invalidPassword(), dataResult);
                throw errData(200, message.invalidPassword(), null);
            }
            else {

                // Check archive status
                if (findResult.status === enumValue.archiveStatus) {

                    // let dataResult = [{
                    //     "value": "",
                    //     "msg": message.notActive(),
                    //     "param": "",
                    //     "location": ""
                    // }]
                    // printLogger(2, dataResult, 'rupyo_admin');
                    // return response(res, 200, false, message.notActive(), dataResult);
                    throw errData(200, message.notActive(), null);
                }
                else {

                    // Match encrypted password
                    const isMatch = bcryptjs.compareSync(reqBody.password, findResult.password);
                    if (isMatch) {

                        // Jwt token generate and calling
                        let token = jwtTokenGenerate(findResult);

                        // Add token in findResult
                        findResult.token = token;

                        let companyId = findResult.company_id === undefined ? "" : findResult.company_id;
                        let creditLimitType = enumValue.monthWiseCreditLimit;

                        let companyData
                        if (companyId) {

                            let data = { "company_id": companyId };

                            // Get employee id generation method
                            companyData = await employerModel.findCompany(data);

                            // Get current month setting for credit_limit_type
                            creditLimitType = employeeCreditLimitType(companyData);
                        }

                        let employeeIdGenerationMethod;
                        if (companyId === "") {

                            employeeIdGenerationMethod = ""
                        }
                        else {
                            // let data = { "company_id": companyId };

                            // // Get employee id generation method
                            // let companyData = await employerModel.findCompany(data);
                            employeeIdGenerationMethod = companyData.employee_id_generation_method;
                        }

                        let forNotifications = companyId == "" ? enumValue.rupyoAdminRoleId : enumValue.employerRoleId;
                        let checkData = { "company_id": companyId, "for_notifications": forNotifications };


                        // NOTIFICATION MODEL -> UNREAD NOTIFICATION COUNTS
                        let unreadNotificationCount = await unreadNotificationCountAction(checkData);

                        // Common response for SUPER ADMIN, RUPYO ADMIN and EMPLOYER
                        let showResult = {
                            "_id": findResult._id,
                            "role_id": findResult.role_id,
                            "selfie": findResult.selfie ? findResult.selfie : "",
                            "token": token,
                            "company_id": companyId,
                            "employee_id_generation_method": employeeIdGenerationMethod,
                            "unread_notifications_count": unreadNotificationCount
                        }

                        // EMPLOYER DASHBOARD
                        if (findResult.role_id === enumValue.employerRoleId) {

                            let addUserData = {
                                "company_id": showResult.company_id,
                                "role_id": findResult.role_id,
                                "credit_limit_type": creditLimitType
                            }

                            req.userData = addUserData
                            req.loginResult = showResult

                            employerDashboard = await employerController.employerDashboard(req, res, next);
                        }
                        else {

                            // Add admin name, email and mobile number in response
                            showResult.user_name = findResult.first_name + " " + findResult.last_name;
                            showResult.email_id = findResult.email;
                            showResult.mobile_number = findResult.mobile_number;
                            showResult.have_payout_approve_access = findResult.have_payout_approve_access || false;
                            showResult.have_payout_credit_access = findResult.have_payout_credit_access || false;

                            printLogger(2, findResult, 'rupyo_admin');
                            return response(res, 200, true, message.loggedIn(), showResult);
                        }
                    }

                    // Invalid password
                    else {

                        // let dataResult = [{
                        //     "value": "",
                        //     "msg": message.invalidPassword(),
                        //     "param": "",
                        //     "location": ""
                        // }]
                        // printLogger(2, dataResult, 'rupyo_admin');
                        // return response(res, 200, false, message.invalidPassword(), dataResult);
                        throw errData(200, message.invalidPassword(), null);
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
        printLogger(0, `login Error:- ${error}`, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Create Rupyo Admin
exports.createRupyoAdmin = async (req, res, next) => {
    try {
        printLogger(2, `*********** ${req.originalUrl} ************`, 'rupyo_admin');

        const errors = validationResult(req);

        // If validation errors is not empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'rupyo_admin');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let reqBody = req.body;
            reqBody.url = req.url;

            // Find email already exist
            let emailResult = await userModel.findRupyoAdmin(reqBody);

            if (emailResult !== null) {
                // let dataResult = [{
                //     "value": "",
                //     "msg": message.emailIdAlreadyTaken(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(2, dataResult, 'rupyo_admin');
                // return response(res, 200, false, message.emailIdAlreadyTaken(), dataResult);
                throw errData(200, message.emailIdAlreadyTaken(), null);
            }
            else {

                let data = { "mobile_number": reqBody.mobile_number };

                // Find mobile number already exist
                let mobileNumberResult = await userModel.findRupyoAdmin(data);

                if (mobileNumberResult !== null) {
                    // let dataResult = [{
                    //     "value": "",
                    //     "msg": message.mobileNumberIdAlreadyTaken(),
                    //     "param": "",
                    //     "location": ""
                    // }]
                    // printLogger(2, dataResult, 'rupyo_admin');
                    // return response(res, 200, false, message.mobileNumberIdAlreadyTaken(), dataResult);
                    throw errData(200, message.mobileNumberIdAlreadyTaken(), null);
                }
                else {

                    // Hash password
                    const hashedPassword = bcryptjs.hashSync(reqBody.password, 10);

                    // Random employee_sys_id generate 16 digit
                    let employee_sys_id = randomString(16);

                    let rupyoAdminData = {
                        "employee_sys_id": employee_sys_id,
                        "role_id": enumValue.rupyoAdminRoleId,
                        "first_name": reqBody.first_name,
                        "middle_name": reqBody.middle_name,
                        "last_name": reqBody.last_name,
                        "email": reqBody.email,
                        "status": enumValue.activeStatus,
                        "mobile_number": reqBody.mobile_number,
                        "password": hashedPassword,
                        "created_by": req.userData._id
                    };


                    // Create rupyo admin
                    let adminResult = await userModel.createRupyoAdmin(rupyoAdminData)

                    if (adminResult === null) {

                        // let dataResult = [{
                        //     "value": "",
                        //     "msg": message.dataCouldNotBeInserted('Rupyo Admin'),
                        //     "param": "",
                        //     "location": ""
                        // }]
                        // printLogger(2, dataResult, 'rupyo_admin');
                        // return response(res, 200, false, message.dataCouldNotBeInserted('Rupyo Admin'), dataResult);
                        throw errData(200, message.dataCouldNotBeInserted('Rupyo admin'), null);
                    }
                    else {

                        // Notications Calling and send
                        let rupyoAdminNotificationData = {
                            "login_id": adminResult.email,
                            "password": reqBody.password
                        }

                        // Rupyo admin mail contain
                        let adminCreationMessage = notification.subAdminCreation(rupyoAdminNotificationData);

                        // Send welcome email to rupyo admin
                        let responseEmail = await sendEmail(adminResult.email, adminResult.email, `<div>${adminCreationMessage}</div>`, "Welcome to Rupyo");

                        // Rupyo admin data inserted successfully.
                        printLogger(2, adminResult, 'rupyo_admin');
                        return response(res, 200, true, message.insertSuccessfully('Rupyo Admin'), {
                            "_id": adminResult._id
                        });
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
        printLogger(0, `createRupyoAdmin Error:- ${error}`, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Rupyo admin list
exports.rupyoAdminList = async (req, res, next) => {
    try {
        printLogger(2, `*********** ${req.originalUrl} ************`, 'rupyo_admin');

        let reqBody = req.body;

        let rupyoAdminResult = await userModel.rupyoAdminList(reqBody);
        // console.log("rupyoAdminResult:- ",rupyoAdminResult)

        if (rupyoAdminResult === null) {
            // let dataResult = [{
            //     "value": "",
            //     "msg": message.noDataFound(),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(2, dataResult, 'rupyo_admin');
            // return response(res, 200, false, message.noDataFound(), dataResult);
            throw errData(200, message.noDataFound(), null);
        }
        else {

            printLogger(2, rupyoAdminResult, 'rupyo_admin');
            return response(res, 200, true, message.dataFound(), rupyoAdminResult);
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, `rupyoAdminList Error:- ${error}`, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Find rupyo admin 
exports.findRupyoAdmin = async (req, res, next) => {
    try {
        printLogger(2, `*********** ${req.originalUrl} ************`, 'rupyo_admin');

        let reqBody = req.body;
        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array());
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let result = await userModel.findRupyoAdmin(reqBody)

            if (result === null || result === undefined) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.rupyoAdminNotRegister(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(2, dataResult, 'rupyo_admin');
                // return response(res, 200, false, message.rupyoAdminNotRegister(), dataResult);
                throw errData(200, message.rupyoAdminNotRegister(), null);
            }
            else {

                printLogger(2, result, 'rupyo_admin');
                return response(res, 200, true, message.dataFound(), result);
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
        printLogger(0, `findRupyoAdmin Error:- ${error}`, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Update rupyo admin
exports.updateRupyoAdmin = async (req, res, next) => {
    try {
        printLogger(2, `*********** ${req.originalUrl} ************`, 'rupyo_admin');

        let reqBody = req.body;
        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'rupyo_admin');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            // Update rupyo admin
            let result = await userModel.updateRupyoAdmin(reqBody, req.userData)

            if (result === null || result === undefined) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.unableToUpdate('Rupyo admin'),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(2, dataResult, 'rupyo_admin');
                // return response(res, 200, false, message.unableToUpdate('Rupyo admin'), dataResult);
                throw errData(200, message.unableToUpdate('Rupyo admin'), null);
            }
            else {
                printLogger(2, result, 'rupyo_admin');
                return response(res, 200, true, message.updateSuccessfully('Rupyo admin'), { _id: result._id });
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
        printLogger(0, `updateRupyoAdmin Error:- ${error}`, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Delete rupyo admin 
exports.updateStatus = async (req, res, next) => {
    try {
        printLogger(2, `*********** ${req.originalUrl} ************`, 'rupyo_admin');

        let reqBody = req.body;
        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'rupyo_admin');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            // Update status rupyo admin
            let result = await userModel.updateStatus(reqBody, req.userData)

            if (result === null || result === undefined) {
                // let dataResult = [{
                //     "value": "",
                //     "msg": message.unableToUpdate('Rupyo admin status'),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(2, dataResult, 'rupyo_admin');
                // return response(res, 200, false, message.unableToUpdate('Rupyo admin status'), dataResult);
                throw errData(200, message.unableToUpdate('Rupyo admin status'), null);
            }
            else {
                printLogger(2, result, 'rupyo_admin');
                return response(res, 200, true, message.updateSuccessfully('Rupyo admin status'), { _id: result._id });
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
        printLogger(0, `updateStatus Error:- ${error}`, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Change password
exports.changePassword = async (req, res, next) => {
    try {
        printLogger(2, `*********** ${req.originalUrl} ************`, 'rupyo_admin');

        let reqBody = req.body;

        let newpassword = reqBody.new_password;
        let confirmpassword = reqBody.confirm_password;
        let data = { "email": String(req.userData.email) }
        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), 'rupyo_admin');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            // Find user
            let emailResult = await userModel.find(data);

            if (emailResult === null || emailResult === undefined) {

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

                // Match pin
                const isMatch = bcryptjs.compareSync(reqBody.password, emailResult.password);

                // Check password match or not
                if (isMatch) {

                    // Check new password and confirm password same or not
                    if (newpassword == confirmpassword) {

                        const changedPassword = bcryptjs.hashSync(newpassword, 10);

                        let result = userModel.changePassword(data, changedPassword)

                        if (result === null) {

                            // let dataResult = [{
                            //     "value": "",
                            //     "msg": message.unableToUpdate('Password'),
                            //     "param": "",
                            //     "location": ""
                            // }]
                            // printLogger(0, dataResult, 'rupyo_admin');
                            // return response(res, 200, false, message.unableToUpdate('Password'), dataResult);
                            throw errData(200, message.unableToUpdate('Password'), null);
                        }
                        else {

                            printLogger(2, result, 'rupyo_admin');
                            return response(res, 200, true, message.updateSuccessfully('Password'), "");
                        }
                    }

                    // New Password and confirm password not match
                    else {
                        // let dataResult = [{
                        //     "value": "",
                        //     "msg": message.passwordNotMatch(),
                        //     "param": "password",
                        //     "location": ""
                        // }]
                        // printLogger(0, dataResult, 'rupyo_admin');
                        // return response(res, 500, false, message.passwordNotMatch(), dataResult);
                        throw errData(200, message.passwordNotMatch(), null);
                    }
                }
                else {

                    // let dataResult = [{
                    //     "value": '',
                    //     "msg": message.wrongPassword(),
                    //     "param": "",
                    //     "location": ""
                    // }]
                    // printLogger(2, dataResult, 'employee');
                    // return response(res, 200, false, message.wrongPassword(), dataResult);
                    throw errData(200, message.wrongPassword(), null);
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
        printLogger(0, `changePassword Error:- ${error}`, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Rupyo admin and employer change password request (v2)
exports.changePasswordRequest = async (req, res, next) => {
    try {
        printLogger(2, `*********** ${req.originalUrl} ************`, 'rupyo_admin');

        // Get _id from token data
        let userId = { "user_id": req.userData._id };

        const errors = validationResult(req);

        // If validation errors
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'rupyo_admin');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            // Find user
            let userResult = await userModel.find(userId);
            printLogger(2, `userResult:- ${userResult}`, 'rupyo_admin');

            if (userResult === null || userResult === undefined) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.userNotRegistered(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'rupyo_admin');
                // return response(res, 200, false, message.userNotRegistered(), dataResult);
                throw errData(200, message.userNotRegistered(), null);
            }
            else {

                /**
                 * NOTE:-  If password is being changed for RUPYO ADMIN so OTP will be sent to SUPER ADMIN mobile number.
                 * 
                 *         and If password is being changed for EMPLOYER so OTP will be sent to OWN mobile number.
                 */

                // Get super admin mobile number from env file and set it for send otp mobile number
                let mobileNumber = global.env.SUPER_ADMIN_MOBILE_NUMBER;

                // Get employer mobile number from userResult and set it for send otp mobile number.
                if (req.userData.role_id === enumValue.employerRoleId) {
                    mobileNumber = userResult.mobile_number;
                }

                // Delete old otp (by user_id)
                await otpModel.deleteOtp(userId);

                // Generate otp
                let otpData = {
                    "otp": otpGenerate(),
                    "mobile_number": mobileNumber,
                    "user_id": userId.user_id,
                };

                // Save otp into database
                let otpGenerateResult = await otpModel.employeeOtpGenerate(otpData);

                // Send otp to mobile number
                let awsotp = await sendSMS("+91" + mobileNumber, message.otpMessage(otpData.otp));

                if (awsotp === 0) {

                    // let dataResult = [{
                    //     "value": "",
                    //     "msg": "catch SMS failed.",
                    //     "param": "",
                    //     "location": ""
                    // }]
                    // return response(res, 200, false, "catch SMS failed.", dataResult);
                    throw errData(200, "Catch SMS failed.", null);
                }
                else {

                    printLogger(2, `otpGenerateResult:- ${otpGenerateResult}`, 'rupyo_admin');
                    return response(res, 200, true, message.otpSendSuccessfully('Otp'), {});
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
        printLogger(0, `changePasswordRequest Error:- ${error}`, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// Rupyo admin and employer OTP verification (v2)
exports.changePasswordOtpVerification = async (req, res, next) => {
    try {
        printLogger(2, `*********** ${req.originalUrl} ************`, 'rupyo_admin');

        let reqBody = req.body;

        // Get user email from token data
        let data = { "email": String(req.userData.email) }
        const errors = validationResult(req);

        // If validation errors
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'rupyo_admin');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            // Find user by email
            let emailResult = await userModel.find(data);
            printLogger(2, `emailResult:- ${emailResult}`, 'rupyo_admin');

            // If emailResult is null or undefined
            if (emailResult === null || emailResult === undefined) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.userNotRegistered(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'rupyo_admin');
                // return response(res, 200, false, message.userNotRegistered(), dataResult);
                throw errData(200, message.userNotRegistered(), null);
            }
            else {

                /* ******** Check otp is valid or not ******** */
                let _otp = reqBody.otp

                // Check otp expiry
                let expiryVerify = verifyOtp(_otp);

                let _reqBody = {
                    "user_id": req.userData._id,
                    "otp": reqBody.otp
                }

                // Verify otp from otp model
                let otpResult = await otpModel.otpVerify(_reqBody);

                // If otp result is undefined or null
                if (otpResult === null || otpResult === undefined) {

                    printLogger(2, otpResult, 'rupyo_admin');
                    // let dataResult = [{
                    //     "value": "",
                    //     "msg": message.inValidOtp(),
                    //     "param": "",
                    //     "location": ""
                    // }]
                    // return response(res, 200, false, message.inValidOtp(), dataResult);
                    throw errData(200, message.inValidOtp(), null);
                }
                else {

                    // Validate otp expiry
                    if (expiryVerify === undefined) {

                        // let dataResult = [{
                        //     "value": "",
                        //     "msg": message.otpExpired(),
                        //     "param": "",
                        //     "location": ""
                        // }]
                        // printLogger(0, dataResult, 'rupyo_admin');
                        // return response(res, 200, false, message.otpExpired(), dataResult);
                        throw errData(200, message.otpExpired(), null);
                    }
                    else {

                        // Generate short token
                        let userId = {
                            "user_id": req.userData.employer_user_id
                        };

                        let token = shortJwtToken(userId);

                        printLogger(2, "************** otpGenerateResult *****************", 'employee');
                        return response(res, 200, true, message.matchOtp('OTP'),
                            {
                                "token": token
                            });
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
        printLogger(0, `userChangePassword Error:- ${error}`, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// Rupyo admin and employer resend OTP (v2)
exports.resendOtp = async (req, res, next) => {
    try {
        printLogger(2, `*********** ${req.originalUrl} ************`, 'rupyo_admin');

        let reqBody = req.body;

        // Get _id from token data
        let userId = { "user_id": req.userData._id };

        const errors = validationResult(req);

        // If validation errors
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'rupyo_admin');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            // Find user
            let userResult = await userModel.find(userId);
            printLogger(2, `userResult:- ${userResult}`, 'rupyo_admin');

            // If userResult is null or undefined
            if (userResult === null || userResult === undefined) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.userNotRegistered(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'rupyo_admin');
                // return response(res, 200, false, message.userNotRegistered(), dataResult);
                throw errData(200, message.userNotRegistered(), null);
            }
            else {

                /**
                 * NOTE:-  If password is being changed for RUPYO ADMIN so OTP will be sent to SUPER ADMIN mobile number.
                 * 
                 *         and If password is being changed for EMPLOYER so OTP will be sent to OWN mobile number.
                 */

                // Get super admin mobile number from env file and set it for send otp mobile number
                let mobileNumber = global.env.SUPER_ADMIN_MOBILE_NUMBER;

                // Get employer mobile number from userResult and set it for send otp mobile number.
                if (req.userData.role_id === enumValue.employerRoleId) {
                    mobileNumber = userResult.mobile_number;
                }

                // Delete old otp (by user_id)
                await otpModel.deleteOtp(userId);

                // Generate otp
                let otpData = {
                    "otp": otpGenerate(),
                    "mobile_number": mobileNumber,
                    "user_id": userId.user_id,
                };

                // Save otp into database
                let otpGenerateResult = await otpModel.employeeOtpGenerate(otpData);

                // Send otp to mobile number
                let awsotp = await sendSMS("+91" + mobileNumber, message.otpMessage(otpData.otp));

                if (awsotp === 0) {

                    // let dataResult = [{
                    //     "value": "",
                    //     "msg": "catch SMS failed.",
                    //     "param": "",
                    //     "location": ""
                    // }]
                    // return response(res, 200, false, "catch SMS failed.", dataResult);
                    throw errData(200, "Catch SMS failed", null);
                }
                else {

                    printLogger(2, `otpGenerateResult:- ${otpGenerateResult}`, 'rupyo_admin');
                    return response(res, 200, true, message.otpSendSuccessfully('Otp'), {});
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
        printLogger(0, `userChangePassword Error:- ${error}`, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// Rupyo admin and employer change password (v2)
exports.userChangePassword = async (req, res, next) => {
    try {
        printLogger(2, `*********** ${req.originalUrl} ************`, 'rupyo_admin');

        let reqBody = req.body;
        let newpassword = reqBody.new_password;
        let confirmpassword = reqBody.confirm_password;

        // Get user email from token data
        let data = { "email": String(req.userData.email) }
        const errors = validationResult(req);

        // If validation errors
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'rupyo_admin');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            // Find user by email
            let emailResult = await userModel.find(data);
            printLogger(2, `emailResult:- ${emailResult}`, 'rupyo_admin');

            // If emailResult is null or undefined
            if (emailResult === null || emailResult === undefined) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.userNotRegistered(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'rupyo_admin');
                // return response(res, 200, false, message.userNotRegistered(), dataResult);
                throw errData(200, message.userNotRegistered(), null);
            }
            else {

                /* ******** Check JWT short token ******** */
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

                    let checkEmployee = {
                        "employee_id": tokenResult._id
                    };

                    // Match rupyo admin old password
                    const isMatch = bcryptjs.compareSync(reqBody.password, emailResult.password);

                    // Check password match or not
                    if (isMatch) {

                        // Check new password and confirm password are match or not
                        if (newpassword == confirmpassword) {

                            // Encrypt new password
                            const changedPassword = bcryptjs.hashSync(newpassword, 10);

                            // Save new encrypted password
                            let result = userModel.changePassword(data, changedPassword);

                            if (result === null) {

                                // let dataResult = [{
                                //     "value": "",
                                //     "msg": message.unableToUpdate('Password'),
                                //     "param": "",
                                //     "location": ""
                                // }]
                                // printLogger(0, dataResult, 'rupyo_admin');
                                // return response(res, 200, false, message.unableToUpdate('Password'), dataResult);
                                throw errData(200, message.unableToUpdate('Password'), null);
                            }
                            else {

                                printLogger(2, result, 'rupyo_admin');
                                return response(res, 200, true, message.updateSuccessfully('Password'), "");
                            }
                        }

                        // New Password and confirm password not match
                        else {

                            // let dataResult = [{
                            //     "value": "",
                            //     "msg": message.passwordNotMatch(),
                            //     "param": "",
                            //     "location": ""
                            // }]
                            // printLogger(0, dataResult, 'rupyo_admin');
                            // return response(res, 200, false, message.passwordNotMatch(), dataResult);
                            throw errData(200, message.passwordNotMatch(), null);
                        }
                    }
                    else {

                        // // Wrong password
                        // let dataResult = [{
                        //     "value": '',
                        //     "msg": message.wrongPassword(),
                        //     "param": "",
                        //     "location": ""
                        // }]
                        // printLogger(0, dataResult, 'rupyo_admin');
                        // return response(res, 200, false, message.wrongPassword(), dataResult);
                        throw errData(200, message.wrongPassword(), null);
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
        printLogger(0, `userChangePassword Error:- ${error}`, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// Rupyo admin generate new password
exports.generatePassword = async (req, res, next) => {
    try {
        printLogger(2, `*********** ${req.originalUrl} ************`, 'rupyo_admin');

        let reqBody = req.body;
        const errors = validationResult(req);

        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), "rupyo_admin");
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let data = { "email": String(reqBody.email) };

            // Find user
            let emailResult = await userModel.find(data);

            if (emailResult === null || emailResult === undefined) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.userNotRegistered(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'rupyo_admin');
                // return response(res, 200, false, message.userNotRegistered(), dataResult);
                throw errData(200, message.userNotRegistered(), null);
            }
            else {

                // Generate random password
                let newPassword = randomString(8);

                let hashedPassword = bcryptjs.hashSync(newPassword, 10);

                let result = await userModel.changePassword(data, hashedPassword);

                if (result.nModified === 0) {

                    // let dataResult = [{
                    //     "value": "",
                    //     "msg": message.unableToUpdate('Password'),
                    //     "param": "",
                    //     "location": ""
                    // }]
                    // printLogger(0, dataResult, 'rupyo_admin');
                    // return response(res, 200, false, message.unableToUpdate('Password'), dataResult);
                    throw errData(200, message.unableToUpdate('Password'), null);
                }
                else {

                    printLogger(2, result, 'rupyo_admin');
                    return response(res, 200, true, message.updateSuccessfully("Rupyo admin password"), { _id: emailResult._id, email: emailResult.email, password: newPassword });
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
        printLogger(0, `generatePassword Error:- ${error}`, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Rupyo admin dashboard
exports.rupyoAdminDashBoard = async (req, res, next) => {
    try {
        printLogger(2, `*********** ${req.originalUrl} ************`, 'rupyo_admin');

        // if (req.userData.role_id === enumValue.rupyoAdminRoleId) {
        let reqBody;

        // Employee status check
        let employeeStatusResult = await employeeStatus();

        // Employer status count
        let employerStatusResult = await employerStatus();

        // All company credit limit 
        let employeeTransactionsData = await employerCreditLimitAndEmployeeTotalAmountPaid();

        let totalCreditLimit = 0;
        let consumedCreditLimit = 0

        if (employeeTransactionsData.employers_credit_limit) {
            totalCreditLimit = parseFloat(employeeTransactionsData.employers_credit_limit.toFixed(2));
        }

        if (employeeTransactionsData.employee_total_amount_paid) {
            consumedCreditLimit = parseFloat(employeeTransactionsData.employee_total_amount_paid.toFixed(2));
        }

        // Highest credit limit ten employer
        let highestCreditLimitData = await highestCreditLimitTenEmployer();

        /* GRAPH 1 */
        // Format data for top 10 employers by highest credit limit

        let companyNames = [];
        let companyRupyoCreditLimit = [];

        let topTenEmployersByHighestCreditLimit = {

            "company_name": [],
            "rupyo_credit_limit": []
        }

        if (highestCreditLimitData.employerCreditLimitHighest) {
            if (highestCreditLimitData.employerCreditLimitHighest.length > 0) {

                await highestCreditLimitData.employerCreditLimitHighest.forEach(el => {

                    companyNames.push(el.company_name)
                    companyRupyoCreditLimit.push(el.rupyo_credit_limit)
                })

                topTenEmployersByHighestCreditLimit = {

                    "company_name": companyNames,
                    "rupyo_credit_limit": companyRupyoCreditLimit
                }
            }
        }

        printLogger(4, `1st GRAPH data employerCreditLimitHighest:- ${util.inspect(highestCreditLimitData.employerCreditLimitHighest, { depth: null })}`, "rupyo_admin");
        printLogger(4, `1st GRAPH topTenEmployersByHighestCreditLimit:- ${util.inspect(topTenEmployersByHighestCreditLimit, { depth: null })}`, "rupyo_admin");


        /* GRAPH 2 */
        // Format data for top 10 employers by credit limit utilized this month

        let topTenEmployersByCreditLimitUtilizedThisMonth = {
            "company_name": [],
            "utilized_credit_limit": []
        }

        if (highestCreditLimitData.employerCreditLimitUtilizedTen) {
            if (highestCreditLimitData.employerCreditLimitUtilizedTen.length > 0) {

                companyNames = [];
                let companyPayoutCredited = [];

                await highestCreditLimitData.employerCreditLimitUtilizedTen.forEach(el => {
                    companyNames.push(el.company_name)
                    companyPayoutCredited.push(el.payout_credited)
                })

                topTenEmployersByCreditLimitUtilizedThisMonth = {
                    "company_name": companyNames,
                    "utilized_credit_limit": companyPayoutCredited
                }
            }
        }

        printLogger(4, `2nd GRAPH data employerCreditLimitUtilizedTen:- ${util.inspect(highestCreditLimitData.employerCreditLimitUtilizedTen, { depth: null })} `, "rupyo_admin");
        printLogger(4, `2nd GRAPH topTenEmployersByCreditLimitUtilizedThisMonth:- ${util.inspect(topTenEmployersByCreditLimitUtilizedThisMonth, { depth: null })}`, "rupyo_admin");


        /* GRAPH 3 */
        // Format data for top 10 employees by taken max payout this month

        let employeeNames = [];
        let payoutCredited = [];

        let topTenEmployeesByTakenMaxPayoutThisMonth = {
            "employee_name": [],
            "payout_credited": []
        }

        if (highestCreditLimitData.employeesMaxPayoutThisMonth) {
            if (highestCreditLimitData.employeesMaxPayoutThisMonth.length > 0) {
                await highestCreditLimitData.employeesMaxPayoutThisMonth.forEach(el => {
                    employeeNames.push(el.employee_name[0].employee_name)
                    payoutCredited.push(el.payout_credited)
                })

                topTenEmployeesByTakenMaxPayoutThisMonth = {
                    "employee_name": employeeNames,
                    "payout_credited": payoutCredited
                }
            }
        }

        printLogger(4, `3rd GRAPH data employeesMaxPayoutThisMonth:- ${util.inspect(highestCreditLimitData.employeesMaxPayoutThisMonth, { depth: null })} `, "rupyo_admin");
        printLogger(4, `3rd GRAPH topTenEmployeesByTakenMaxPayoutThisMonth:- ${util.inspect(topTenEmployeesByTakenMaxPayoutThisMonth, { depth: null })}`, "rupyo_admin");


        /* GRAPH 4 */
        // Format data for top 10 employers by taken max payout count this month

        let topTenEmployersByTakenMaxPayoutCountThisMonth = {
            "company_name": [],
            "payout_count": []
        }

        if (highestCreditLimitData.topTenEmployersByMaxPayoutCount) {
            if (highestCreditLimitData.topTenEmployersByMaxPayoutCount.length > 0) {

                companyNames = [];
                payoutCount = [];
                await highestCreditLimitData.topTenEmployersByMaxPayoutCount.forEach(el => {

                    companyNames.push(el.company_name)
                    payoutCount.push(el.payout_credited_count)
                })

                topTenEmployersByTakenMaxPayoutCountThisMonth = {
                    "company_name": companyNames,
                    "payout_count": payoutCount
                }
            }
        }

        printLogger(4, `4th GRAPH data topTenEmployersByMaxPayoutCount:- ${util.inspect(highestCreditLimitData.topTenEmployersByMaxPayoutCount, { depth: null })} `, "rupyo_admin");
        printLogger(4, `4th GRAPH topTenEmployersByTakenMaxPayoutCountThisMonth:- ${util.inspect(topTenEmployersByTakenMaxPayoutCountThisMonth, { depth: null })}`, "rupyo_admin");


        reqBody = { "days_filter": enumValue._thisMonth };

        //  Total payment paid till now this year
        let transactions_yearly_data = await transactionModel.transactionsYearlyData();

        printLogger(4, `total_Payout_Request_Rejected_Yearly:- ${util.inspect(transactions_yearly_data[0].payout_rejected[0], { depth: null })}`, "rupyo_admin");


        let totalPayoutRequestYearly = (transactions_yearly_data.length === 0 ? 0 : transactions_yearly_data[0].payout_request.length === 0 ? 0 : parseInt(transactions_yearly_data[0].payout_request[0].count)) || 0;
        let totalPayoutRequestCreditedYearly = (transactions_yearly_data.length === 0 ? 0 : transactions_yearly_data[0].payout_credited.length === 0 ? 0 : parseInt(transactions_yearly_data[0].payout_credited[0].count)) || 0;
        let totalPayoutRequestCreditedAmountYearly = (transactions_yearly_data.length === 0 ? 0 : transactions_yearly_data[0].payout_credited.length === 0 ? 0 : parseInt(transactions_yearly_data[0].payout_credited[0].amount)) || 0;
        let totalPayoutRequestRejectedYearly = (transactions_yearly_data.length === 0 ? 0 : transactions_yearly_data[0].payout_rejected.length === 0 ? 0 : parseInt(transactions_yearly_data[0].payout_rejected[0].count)) || 0;
        let totalPayoutRequestRejectedAmountYearly = (transactions_yearly_data.length === 0 ? 0 : transactions_yearly_data[0].payout_rejected.length === 0 ? 0 : parseInt(transactions_yearly_data[0].payout_rejected[0].amount)) || 0;


        // Employers list of consumed 80% of their credit limit by his employees (Monthly)
        let eightyPersentConsumed = await transactionModel.payoutConsumeEighteenPersentCreditLimit();

        // User selfie
        for (i = 0; i < eightyPersentConsumed.length; i++) {

            if (eightyPersentConsumed[i].selfie !== undefined && eightyPersentConsumed[i].selfie !== null) {

                let selfieUrl = await tokenMethod.getCloudFrontURL(eightyPersentConsumed[i].selfie);
                eightyPersentConsumed[i].selfie = selfieUrl;
            }
            else {
                eightyPersentConsumed[i].selfie = "";
            }
        }

        // Total employee count pay out done this month
        // let totalEmployeeCountPaid = await transactionModel.eodTransactionsCount(reqBody);
        // let numberOfEmployeePayoutPaid = totalEmployeeCountPaid[0] == undefined ||totalEmployeeCountPaid[0] == null ? 0 : totalEmployeeCountPaid[0].payout_credited;

        //  Employee transaction multiple time payout paid count this month
        let multipleTransaction = await transactionModel.employeeTookMultipleAmount(reqBody);
        let multiplePayoutDoneEmployee = multipleTransaction[0].payoutCount[0] === undefined || multipleTransaction[0].payoutCount[0] === null ? 0 : multipleTransaction[0].payoutCount[0].number_of_payout;
        let topTenlistMultiple = multipleTransaction[0].payoutTen[0] === undefined || multipleTransaction[0].payoutTen[0] === null ? [] : multipleTransaction[0].payoutTen[0].company;


        // Get count of payout done employee(s)
        let payoutDoneResult = await monthlyTransactionModel.payoutDone(reqBody);
        let numberOfEmployeePayoutPaid = payoutDoneResult[0] === undefined || payoutDoneResult[0] === null ? 0 : payoutDoneResult[0].payout_credited;

        // Settlement employer count pending 
        let settlementData = await settlementModel.employerSettlement();


        let settlement_requested_amount = settlementData.length == 0 ? 0 : parseInt(settlementData[0].amount);

        // Total settlement amount this year and company name
        let settlementAmountData = await settlementModel.employerSettlementYearly();

        // console.log("settlementAmountData:- ",settlementAmountData);
        // console.log("full paid:- ", settlementAmountData[0].paid_amount);

        let settlementReceivedAmount = settlementAmountData.length == 0 ? 0 : settlementAmountData[0].paid_amount[0] == undefined || null ? 0 : settlementAmountData[0].paid_amount[0].amount;

        let resultData = {

            // (1.2.1) Total, Active and Pause Employers (count)
            "employer_status_count": employerStatusResult.employer_status_count,

            // total number of employers
            "total_number_of_employers": employerStatusResult.number_of_employer,

            // (1.2.2) Total, Active and Pause Employees (count)
            "employee_status_count": employeeStatusResult.employee_status_count,

            // total number of employees
            "total_number_of_employees": employeeStatusResult.numberOfEmployees,

            // (1.2.3) Employers total credit limit 
            "total_credit_limit": totalCreditLimit,

            // (1.2.3) Consumed credit limit 
            "consumed_credit_limit": consumedCreditLimit,

            // (1.2.3) Remaining credit limit 
            "remaining_credit_limit": parseFloat((totalCreditLimit - consumedCreditLimit).toFixed(2)) || 0,

            // (1.2.4)  GRAPH-1
            "top_ten_employers_by_highest_credit_limit": topTenEmployersByHighestCreditLimit,

            // (1.2.5)  GRAPH-2
            "top_ten_employers_by_utilized_credit_limit": topTenEmployersByCreditLimitUtilizedThisMonth,

            // (1.2.6)  GRAPH-3
            "top_ten_employees_by_take_max_payout_monthly": topTenEmployeesByTakenMaxPayoutThisMonth, // highestCreditLimitData.employeesMaxPayoutThisMonth,

            // (1.2.7)  GRAPH-4  Histogram of top 10 employers by max employees taking pay out this month
            "top_ten_employers_by_max_payout_count": topTenEmployersByTakenMaxPayoutCountThisMonth, //highestCreditLimitData.topTenEmployersByMaxPayoutCount,


            // (1.2.9) Graphic showing how many employees have consumed 80% of their credit limits
            "employers_of_consumed_eighty_percent_of_their_credit_limit": eightyPersentConsumed,

            // (1.2.10)
            "number_of_employees_payout_not_done": employeeStatusResult.numberOfEmployees - numberOfEmployeePayoutPaid,

            // (1.2.11)
            "number_of_employees_payout_done": numberOfEmployeePayoutPaid,

            // (1.2.12)
            "more_than_one_payout_done_employee_count": multiplePayoutDoneEmployee,

            // (1.2.13)  Settlement requested amount for current year 
            "settlement_requested_amount": settlement_requested_amount,

            // (1.2.14)  Total payout amount made this year
            "total_payout_amount_made_this_year": totalPayoutRequestCreditedAmountYearly,

            // (1.2.14) Total settlement amount received this year
            "total_settlement_amount_received_this_year": settlementReceivedAmount,

            // (1.2.15) Total pay-out requests
            "total_payout_request_this_year": totalPayoutRequestYearly,

            // (1.2.15) Total pay-out requests credited
            "total_payout_request_credited_this_year": totalPayoutRequestCreditedYearly,

            // Total payout request rejected
            "total_payout_request_rejected_this_year": totalPayoutRequestRejectedYearly
        };

        // console.log("Dashboard:- ", resultData)
        printLogger(2, resultData, "rupyo_admin");
        return response(res, 200, true, message.dataFound(), resultData);
        // }
        // else {

        //     let dataResult = [{
        //         "value": '',
        //         "msg": message.notAuthorizeAcess(),
        //         "param": "",
        //         "location": ""
        //     }]
        //     printLogger(0, dataResult, 'rupyo_admin');
        //     return response(res, 403, false, message.notAuthorizeAcess(), dataResult);
        // }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": error,
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, `rupyoAdminDashBoard Error:- ${error}`, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// User s3 key store  
exports.keyStore = async (req, res, next) => {
    try {
        printLogger(2, `*********** ${req.originalUrl} ************`, 'rupyo_admin');

        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array());
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let reqBody = req.body;

            let data = {
                "user_id": reqBody.user_id,
                "s3_key": reqBody.s3_key,
                "updated_by": req.userData._id
            };

            let keyResult = await userModel.keyStore(data);

            if (keyResult === null || keyResult === undefined) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.userNotRegistered(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'rupyo_admin');
                // return response(res, 200, false, message.userNotRegistered(), dataResult);
                throw errData(200, message.userNotRegistered(), null);
            }
            else {

                printLogger(2, keyResult, 'rupyo_admin');
                return response(res, 200, true, message.keyStore('User'), { "_id": keyResult._id });
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
        printLogger(0, `keyStore Error:- ${error}`, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



// Update payout approve, credit access for rupyo admin
exports.payoutApproveCreditAccess = async (req, res, next) => {
    try {
        printLogger(2, `*********** ${req.originalUrl} ************`, 'rupyo_admin');
        let reqBody = req.body;

        // Check Admin Id
        let adminResult = await userModel.findRupyoAdmin(reqBody);

        if (adminResult === null || adminResult === undefined) {

            // let dataResult = [{
            //     "value": "",
            //     "msg": message.userNotRegistered(),
            //     "param": "",
            //     "location": ""
            // }]
            // printLogger(0, adminResult, 'rupyo_admin');
            // return response(res, 200, false, message.userNotRegistered(), dataResult);
            throw errData(200, message.userNotRegistered(), null);
        }
        else {

            let adminId = reqBody.user_id;

            let updateData = {};

            // If super admin wants to update payout approve access
            if (reqBody.payout_approve_access === true || reqBody.payout_approve_access === false) {
                updateData.have_payout_approve_access = reqBody.payout_approve_access;
            }

            // If super admin wants to update payout credit access
            if (reqBody.payout_credit_access === true || reqBody.payout_credit_access === false) {
                updateData.have_payout_credit_access = reqBody.payout_credit_access;
            }

            // Payput credit access
            let updatePayoutAccessResult = await userModel.updatePayoutApproveCreditAccess(adminId, updateData);

            if (updatePayoutAccessResult === null || updatePayoutAccessResult === undefined) {

                // let dataResult = [{
                //     "value": "",
                //     "msg": message.unableToUpdate('Payout access'),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, updatePayoutAccessResult, 'rupyo_admin');
                // return response(res, 200, false, message.unableToUpdate('Payout access'), dataResult);
                throw errData(200, message.unableToUpdate('Payout access'), null);
            }
            else {

                printLogger(2, updatePayoutAccessResult, 'rupyo_admin');
                return response(res, 200, true, message.updateSuccessfully('Payout access'), updatePayoutAccessResult);
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
        printLogger(0, `payoutApproveAccess Error:- ${error}`, 'rupyo_admin');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Get employee  status 
employeeStatus = async () => {
    try {
        let statusResult = await employeesModel.employeeStatus();
        // console.log("statusResult:- ",statusResult)

        let active = statusResult[0] === undefined ? 0 : statusResult[0].count
        let deactive = statusResult[1] === undefined ? 0 : statusResult[1].count
        let pause = statusResult[2] === undefined ? 0 : statusResult[2].count

        // Number of employee
        let number_of_employees = active + deactive + pause;

        printLogger(2, statusResult, "rupyo_admin");

        let data = {
            "numberOfEmployees": number_of_employees,
            "employee_status_count": statusResult
        };
        return data;
    }
    catch {
        return 0;
    }
};


// Find employer status count
employerStatus = async () => {
    try {

        // Employer status count
        let employerStatusResult = await employerModel.employerStatus();
        let active = employerStatusResult[0] === undefined ? 0 : employerStatusResult[0].count
        let deactive = employerStatusResult[1] === undefined ? 0 : employerStatusResult[1].count
        let pause = employerStatusResult[2] === undefined ? 0 : employerStatusResult[2].count

        // Number of employee
        let numberOfEmployer = active + deactive + pause;

        printLogger(2, employerStatusResult, "rupyo_admin");

        let data = {
            "employer_status_count": employerStatusResult,
            "number_of_employer": numberOfEmployer
        };
        return data;
    }
    catch {
        return 0;
    }
};


// Find employer status count
employerCreditLimitAndEmployeeTotalAmountPaid = async () => {
    try {
        let companyResult = await employerModel.companyCreditLimitCount();

        // Total employer credit limit count
        let employersCreditLimit = companyResult[0] === undefined || companyResult[0] === null ? 0 : companyResult[0].count;


        let reqBody = { "days_filter": enumValue._thisMonth };

        // Total consumed credit limit for the current month by them
        let transactionResult = await transactionModel.totalDistributionAmount(reqBody)

        // Total amount paid 
        let employeeTotalAmountPaid = transactionResult[0] === undefined || transactionResult[0] === null ? 0 : transactionResult[0].count

        employeeTransactionsData = {
            "employee_total_amount_paid": employeeTotalAmountPaid,
            "employers_credit_limit": employersCreditLimit
        }

        return employeeTransactionsData;
    }
    catch {
        return 0;
    }
};


// Top ten credit limit employer and utilized (monthly)
highestCreditLimitTenEmployer = async () => {
    try {

        // Highest credit limit ten employer
        let creditLimitHighestResult = await employerModel.highestCreditLimitTenEmployer();

        let highestCreditLimitData;


        // Monthly filter
        let reqBody = { "days_filter": enumValue._thisMonth };

        // Top 10 employers who have utilized highest credit limit
        let employerUtilizeCreditLimitResult = await transactionModel.topTenEmployerUtilizeCreditLimit(reqBody);

        // console.log("employerUtilizeCreditLimitResult:- ", employerUtilizeCreditLimitResult)

        // Top 10 employees who take maximum payout this month
        let employeesTransactionTenResult = await transactionModel.topTenEmployeesByMaxPayout(reqBody);
        // console.log("employeesTransactionTenResult:- ", employeesTransactionTenResult)

        let topTenEmployersByMaxPayoutCount = await transactionModel.topTenEmployersByMaxPayoutCount(reqBody)
        // console.log("topTenEmployersByMaxPayoutCount:- ", topTenEmployersByMaxPayoutCount)

        // Yearly filter
        reqBody = { "days_filter": enumValue._thisYear };



        highestCreditLimitData = {
            "employerCreditLimitHighest": creditLimitHighestResult,
            "employerCreditLimitUtilizedTen": employerUtilizeCreditLimitResult,
            "employeesMaxPayoutThisMonth": employeesTransactionTenResult,
            "topTenEmployersByMaxPayoutCount": topTenEmployersByMaxPayoutCount,
        }
        return highestCreditLimitData
    }
    catch (error) {

        return 0;
    }
};


// All employee transaction and top ten payout employee
transactionsFilterListMonthly = async (reqBody) => {
    try {
        // Max payout ten employee
        let maxPayoutTenResult = await transactionModel.transactionsFilterListMonthly(reqBody);
        let eodTransactionEmployee = maxPayoutTenResult[0].transactionData[0] === undefined || maxPayoutTenResult[0].transactionData[0] === null ? [] : maxPayoutTenResult[0].transactionData[0].company;

        let employeemaxPayoutData = {
            "all_employee_payout_Monthly": eodTransactionEmployee,
        }

        return employeemaxPayoutData
    }
    catch {
        return 0
    }
};


// Top ten employee maximum payout this year
transactionsTopTenYearly = async (reqBody) => {
    try {
        // Max payout ten employee
        let topTenYearlyEmployee = await transactionModel.transactionsTopTenYearly(reqBody);
        let topTen = topTenYearlyEmployee[0] === undefined || topTenYearlyEmployee[0] === null ? [] : topTenYearlyEmployee[0].top_ten
        let employeemaxPayoutYearly = {
            "top_ten_yearly_employee": topTen
        };

        return employeemaxPayoutYearly;
    }
    catch {
        return 0
    }
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