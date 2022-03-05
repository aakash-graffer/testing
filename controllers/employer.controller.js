const { validationResult } = require("express-validator");
const bcryptjs = require("bcryptjs");
const path = require('path');
const moment = require('moment');
const util = require('util');

const { response } = require("../core/responseformat");
const { message, notification, printLogger, encryptData, decryptData, randomString, enumValue, errData } = require("../core/utility");
const { sendSMS, sendEmail, employeeCreditLimitType, transactionChargeSetting, transactionChargeSettingForNextMonth,
  employeeCreditLimitTypeForNextMonth, getUpdatedArrayForTransactionChargeSetting, getUpdatedArrayForEmployeeCreditLimitSetting } = require('../core/commonFunctions');

const userModel = require('../models/user.model');
const employerModel = require("../models/employer.model");
const employeesModel = require("../models/employees.model");
const workShiftModel = require("../models/workshift.model");
const globalSettingModel = require('../models/globalSetting.model');
const requestModel = require("../models/request.model");
const transactionModel = require("../models/transaction.model");
const attendanceModel = require("../models/attendance.model");
const notificationsController = require("./notifications.controller");
const histroyController = require("./histroy.controller");
const tokenMethod = require("../core/getOpenIdToken");


//  Create and update employer
exports.createEmployer = async (req, res, next) => {
  try {

    printLogger(2, `*************** ${req.originalUrl} **************** `, "employer");
    const errors = validationResult(req);

    if (errors.errors.length > 0) {

      printLogger(0, `Validation error:- ${errors.array()}`, "employer");
      // return response(res, 200, false, message.validationError(), errors.array());
      throw errData(200, message.validationError(), errors.array());
    }
    else {

      let reqBody = req.body;
      let year = moment().utc().format('YYYY');
      let month = moment().utc().add(1, 'month').format('MM');

      // Bank details encryption
      let encrypted_field = await bankDetailsEncryption(reqBody);

      /* START CREATE EMPLOYER */
      if (reqBody.user_id === null || reqBody.user_id == 0) {

        reqBody.url = req.url;

        // Check duplicate email 
        let emailResult = await employerModel.findEmployer(reqBody);
        printLogger(2, `emailResult:-  ${emailResult}`, "employer");

        if (emailResult !== null) {

          // let dataResult = [{
          //   "value": "",
          //   "msg": message.emailIdAlreadyTaken(),
          //   "param": "",
          //   "location": ""
          // }]
          // printLogger(0, dataResult, 'employer');
          // return response(res, 200, false, message.emailIdAlreadyTaken(), dataResult);
          throw errData(200, message.emailIdAlreadyTaken(), null);
        }
        else {

          let data = { "mobile_number": parseInt(reqBody.mobile_number) };

          // Check duplicate mobile number 
          let mobileNumberResult = await userModel.findByMobileNumber(data);
          printLogger(2, `mobileNumberResult:-  ${mobileNumberResult}`, "employer");

          if (mobileNumberResult !== null) {

            // let dataResult = [{
            //   "value": "",
            //   "msg": message.mobileNumberIdAlreadyTaken(),
            //   "param": "",
            //   "location": ""
            // }]
            // printLogger(0, dataResult, 'employer');
            // return response(res, 200, false, message.mobileNumberIdAlreadyTaken(), dataResult);
            throw errData(200, message.mobileNumberIdAlreadyTaken(), null);
          }
          else {
            // create
            // If company not exist

            // Set rupyo credit limit
            if (reqBody.rupyo_credit_limit) {

              creditLimit = reqBody.rupyo_credit_limit;
            }
            else {

              // Value get by env file
              creditLimit = global.env.EMPLOYER_CREDIT_LIMIT;
            }

            // First four character of company name
            let companyNameFourChar = reqBody.company_name.trim().split(/\s/).join('').substring(0, 4);

            // Four digit random string
            let _randomString = randomString(4);

            // Create Rupyo company code
            let rupyoCompanyCode = `${companyNameFourChar}${_randomString}`.toUpperCase();

            // Add Current month
            month = moment().utc().format('MM');

            // Set company data
            let companyData = {
              "company_name": reqBody.company_name,
              "rupyo_company_code": rupyoCompanyCode,
              "status": enumValue.activeStatus,
              "gurantor_name": reqBody.gurantor_name,
              "incorporation_date": reqBody.incorporation_date,
              "gst_number": reqBody.gst_number,
              "bank_details": {
                "bank_name": encrypted_field.bank_name,
                "account_number": encrypted_field.account_number,
                "ifsc_code": encrypted_field.ifsc_code,
                "branch_name": encrypted_field.branch_name,
                "bank_account_type": encrypted_field.bank_account_type,
              },
              "pan_card": encrypted_field.pan_card,
              "company_cin": encrypted_field.company_cin,
              "roc_type": reqBody.roc_type,
              "address": {
                "address_1": reqBody.address_1,
                "address_2": reqBody.address_2,
                "pincode": reqBody.pincode,
                "city": reqBody.city,
                "state": reqBody.state,
                "country": reqBody.country,
              },
              "transaction_charge_setting": [
                {
                  "year": year,
                  "month": month,
                  "employer_pay_transaction_charge": reqBody.employer_pay_transaction_charge,
                  "transaction_deduction_percent": reqBody.transaction_deduction_percent,
                  "activation_date": moment().utc().startOf('month'),
                  "last_changed_date": moment.utc()
                }
              ],
              "employee_credit_limit_setting": [
                {
                  "year": year,
                  "month": month,
                  "credit_limit_type": reqBody.credit_limit_type,
                  "activation_date": moment().utc().startOf('month'),
                  "last_changed_date": moment.utc()
                }
              ],
              "rupyo_credit_limit": creditLimit,
              "set_payout_limit": reqBody.set_payout_limit,
              "employee_id_generation_method": reqBody.employee_id_generation_method,
              "weekly_holiday": reqBody.weekly_holiday,
              "created_by": req.userData._id,
            };

            // Create company
            let companyResult = await employerModel.createCompany(companyData);
            printLogger(2, `companyResult:-  ${companyResult}`, "employer");

            // If company details not saved
            if (companyResult === null || companyResult === undefined) {

              // return response(res, 200, false, message.noInsertSuccessfully("Company"), companyResult);
              throw errData(200, message.noInsertSuccessfully("Company"), null);
            }
            else {

              // Password hashing
              const hashedPassword = bcryptjs.hashSync(reqBody.password, 10);

              // Random employee_sys_id generate 16 digit
              let employee_sys_id = randomString(16);

              // Set employer data
              let employerData = {
                "employee_sys_id": employee_sys_id,
                "role_id": enumValue.employerRoleId,
                "first_name": reqBody.first_name,
                "middle_name": reqBody.middle_name,
                "last_name": reqBody.last_name,
                "email": reqBody.email,
                "mobile_number": reqBody.mobile_number,
                "password": hashedPassword,
                "status": enumValue.activeStatus,
                "company_status": companyResult.status,
                "company_id": companyResult._id,
                "company_name": reqBody.company_name,
                "created_by": req.userData._id,
              };

              // Create employer
              let employerResult = await employerModel.createEmployer(employerData);
              printLogger(2, `employerResult:-  ${employerResult}`, "employer");

              // If employer details not saved
              if (employerResult === null || employerResult === undefined) {

                let companyDetails = {
                  rupyo_company_code: rupyoCompanyCode,
                }

                // Delete company details in companies collection if employer details not saved in users collection
                await employerModel.deleteCompanyDetails(companyDetails);
                // return response(res, 200, false, message.noInsertSuccessfully("Company"), employerResult);
                throw errData(200, message.noInsertSuccessfully("Company"), null);
              }
              else {

                // Save global setting
                let settingData = {
                  "company_id": employerResult.company_id,
                  "rupyo_company_code": companyResult.rupyo_company_code,
                  "employee_id_number": 10000000
                }

                // Call global setting save method
                globalSettingModel.saveSetting(settingData);

                // Create default workshifts
                let workshiftsData = [

                  // Open shift
                  {
                    "company_id": employerResult.company_id,
                    "company_name": employerResult.company_name,
                    "shift_name": "Open shift",
                    "shift_start_time": "18:30:00",
                    "shift_end_time": "17:00:00",
                    "is_open_shift": true,
                    "created_by": req.userData._id
                  },

                  // Default shift
                  {
                    "company_id": employerResult.company_id,
                    "company_name": employerResult.company_name,
                    "shift_name": "Day shift",
                    "shift_start_time": "03:30:00",
                    "shift_end_time": "12:30:00",
                    "is_open_shift": false,
                    "created_by": req.userData._id
                  }
                ];

                let workshiftResult = await workShiftModel.insertWorkShifts(workshiftsData)

                let result = {
                  "company_result": companyResult,
                  "employer_result": employerResult
                }

                // Notications calling and send
                let employerData = {
                  "login_id": employerResult.email,
                  "password": reqBody.password,
                  "date": moment().format("LL"),
                  "time": moment().utcOffset("+05:30").format('hh:mm:ss A')
                };

                // Employer notifications send email
                let employerCreationMessage = notification.employerCreation(employerData);


                let smsData = {
                  "employer_name": employerResult.first_name + " " + employerResult.last_name,
                  "company_name": companyResult.company_name,
                  "rupyo_company_code": companyResult.rupyo_company_code
                }


                // Send SMS to employer
                let awsSMS = await sendSMS("+91" + reqBody.mobile_number, message.employerWelcomeSMS(smsData));

                // Send welcome email to employer
                let responseEmail = await sendEmail(reqBody.email, reqBody.email, `<div>${employerCreationMessage}</div>`, "Welcome to Rupyo");

                printLogger(2, `result:- ${result}`, "employer");
                return response(res, 200, true, message.insertSuccessfully("Employer"), result);
              }
            }
          }
        }
      }
      /* END CREATE EMPLOYER */

      /* START UPDATE EMPLOYER */
      else {

        // Get employer details
        let findResult = await employerModel.getEmployer({ user_id: reqBody.user_id });

        // ************ TRANSACTION CHARGE SETTING  ************* //
        let transactionChargeSettingArray = [];

        // Find transaction charge setting
        if (findResult.length > 0 && findResult[0].Company) {

          // Get updated array for transaction charge setting
          transactionChargeSettingArray = getUpdatedArrayForTransactionChargeSetting(findResult[0].Company, reqBody);
        }
        else {

          // let dataResult = [{
          //   "value": "",
          //   "msg": message.userNotRegistered(),
          //   "param": "",
          //   "location": ""
          // }]
          // printLogger(0, dataResult, 'employer');
          // return response(res, 200, false, message.userNotRegistered(), dataResult);
          throw errData(200, message.userNotRegistered(), null);
        }

        reqBody.transaction_charge_setting = transactionChargeSettingArray;

        // **********  EMPLOYEE CREDIT LIMIT SETTING  *********** //
        let employeeCreditLimitArray = [];

        if (findResult.length > 0 && findResult[0].Company) {

          employeeCreditLimitArray = getUpdatedArrayForEmployeeCreditLimitSetting(findResult[0].Company, reqBody);
        }
        else {

          // let dataResult = [{
          //   "value": "",
          //   "msg": message.userNotRegistered(),
          //   "param": "",
          //   "location": ""
          // }]
          // printLogger(0, dataResult, 'employer');
          // return response(res, 200, false, message.userNotRegistered(), dataResult);
          throw errData(200, message.userNotRegistered(), null);
        }

        reqBody.employee_credit_limit_setting = employeeCreditLimitArray;
        // console.log("employeeCreditLimitArray:- ", employeeCreditLimitArray);

        let data = {
          encrypted_field: encrypted_field,
          userData: req.userData,
        };

        // Update employer details
        let result = await employerModel.updateEmployer(reqBody, data);

        if (result === null || result === undefined) {

          // let dataResult = [{
          //   "value": "",
          //   "msg": message.unableToUpdate("Employer"),
          //   "param": "",
          //   "location": ""
          // }]
          // printLogger(0, dataResult, 'employer');
          // return response(res, 200, false, message.unableToUpdate("Employer"), dataResult);
          throw errData(200, message.unableToUpdate("Employer"), null);
        }
        else {
          let resultData = {
            company_id: result._id,
            company_name: reqBody.company_name,
            updated_by: req.userData._id
          }

          // Update company name all related collection
          histroyController.updateCompanyName(resultData)
          printLogger(2, `result:- ${result}`, "employer");
          return response(res, 200, true, message.updateSuccessfully("Employer"), result);
        }
      }
      /* END UPDATE EMPLOYER */
    }
  }
  catch (error) {

    // let dataResult = [{
    //   "value": "",
    //   "msg": message.error(error),
    //   "param": "",
    //   "location": ""
    // }]
    printLogger(0, error, 'employer');
    // return response(res, 500, false, message.error(error), dataResult) 
    next(error)
  }
};


// Employers list
exports.employersList = async (req, res, next) => {
  try {
    printLogger(2, `*************** ${req.originalUrl} **************** `, "employer");

    let reqBody = req.body;

    let employerResult = await employerModel.employersList(reqBody);

    if (employerResult.result.length > 0) {

      // Calculate number of employees
      for (let i = 0; i < employerResult.result.length; i++) {

        let data = { company_id: employerResult.result[i].company_id.toString() }

        let countResult = await employeesModel.employeeCount(data);

        let numberOfEmployee = countResult[0] == undefined || countResult[0] == null ? 0 : countResult[0].company_id;

        employerResult.result[i].company_size = numberOfEmployee
      }

      printLogger(2, `employerResult:- ${employerResult}`, "employer");
      return response(res, 200, true, message.dataFound(), employerResult);
    }
    else {

      // let dataResult = [{
      //   "value": "",
      //   "msg": message.noDataFound(),
      //   "param": "",
      //   "location": ""
      // }]
      // printLogger(0, dataResult, "employer");
      // return response(res, 200, false, message.noDataFound(), dataResult);
      throw errData(200, message.noDataFound(), null);
    }
  }
  catch (error) {

    // let dataResult = [{
    //   "value": "",
    //   "msg": message.error(error),
    //   "param": "",
    //   "location": ""
    // }]
    printLogger(0, error, 'employer');
    // return response(res, 500, false, message.error(error), dataResult) 
    next(error)
  }
};


// Get employer
exports.getEmployer = async (req, res, next) => {
  try {
    printLogger(2, `*************** ${req.originalUrl} **************** `, "employer");
    let reqBody = req.body;
    const errors = validationResult(req);

    if (errors.errors.length > 0) {

      printLogger(0, errors.array(), "employer");
      // return response(res, 200, false, message.validationError(), errors.array());
      throw errData(200, message.validationError(), errors.array());
    }
    else {

      let result = await employerModel.getEmployer(reqBody);
      let employerResult = result[0];

      if (employerResult === undefined || employerResult === null) {

        // let dataResult = [{
        //   "value": "",
        //   "msg": message.userNotRegistered(),
        //   "param": "",
        //   "location": ""
        // }]
        // printLogger(0, dataResult, 'employer');
        // return response(res, 200, false, message.userNotRegistered(), dataResult);
        throw errData(200, message.userNotRegistered(), null);
      }
      else {

        let employerPayTransactionCharge = false;
        let creditLimitType = enumValue.monthWiseCreditLimit;
        // let creditLimitPercent = 50;

        // Decrypt field object
        let fields = {
          bank_name: employerResult.Company.bank_details.bank_name,
          account_number: employerResult.Company.bank_details.account_number,
          ifsc_code: employerResult.Company.bank_details.ifsc_code,
          branch_name: employerResult.Company.bank_details.branch_name,
          bank_account_type: employerResult.Company.bank_details.bank_account_type,
          pan_card: employerResult.Company.pan_card,
          company_cin: employerResult.Company.company_cin ? employerResult.Company.company_cin : "",
          // partnership_firm_company_id: employerResult.Company.partnership_firm_company_id ? employerResult.Company.partnership_firm_company_id : "",
        };

        // Decryption
        let decrypted_fields = decryptData(fields);

        employerResult.Company.bank_details.bank_name = decrypted_fields.bank_name
        employerResult.Company.bank_details.account_number = decrypted_fields.account_number
        employerResult.Company.bank_details.ifsc_code = decrypted_fields.ifsc_code
        employerResult.Company.bank_details.branch_name = decrypted_fields.branch_name
        employerResult.Company.bank_details.bank_account_type = decrypted_fields.bank_account_type
        employerResult.Company.pan_card = decrypted_fields.pan_card
        employerResult.Company.company_cin = decrypted_fields.company_cin ? decrypted_fields.company_cin : ""
        // employerResult.Company.partnership_firm_company_id = decrypted_fields.partnership_firm_company_id ? decrypted_fields.partnership_firm_company_id : ""


        // Get current month employer_pay_transaction_charge value from commonFunction
        employerPayTransactionCharge = transactionChargeSetting(employerResult.Company)

        // Get current month credit_limit_type value from commonFunction
        creditLimitType = employeeCreditLimitType(employerResult.Company);

        employerResult.employer_pay_transaction_charge = employerPayTransactionCharge.employer_pay_transaction_charge;
        employerResult.transaction_deduction_percent = employerPayTransactionCharge.transaction_deduction_percent;
        employerResult.credit_limit_type = creditLimitType;
        // employerResult.credit_limit_percent = creditLimitPercent;
        employerResult.Company.roc_type = employerResult.Company.roc_type === undefined ? enumValue.companyCinType : employerResult.Company.roc_type;

        printLogger(2, `result:- ${result}`, "employer");
        return response(res, 200, true, message.dataFound(), employerResult);
      }
    }
  }
  catch (error) {

    // let dataResult = [{
    //   "value": "",
    //   "msg": message.error(error),
    //   "param": "",
    //   "location": ""
    // }]
    printLogger(0, error, 'employer');
    // return response(res, 500, false, message.error(error), dataResult) 
    next(error)
  }
};


// Change employer status
exports.changeStatus = async (req, res, next) => {
  try {
    printLogger(2, `*************** ${req.originalUrl} **************** `, "employer");

    let reqBody = req.body;
    const errors = validationResult(req);

    if (errors.errors.length > 0) {

      printLogger(0, errors.array(), "employer");
      // return response(res, 200, false, message.validationError(), errors.array());
      throw errData(200, message.validationError(), errors.array());
    }
    else {

      let result = await employerModel.changeStatus(reqBody, req.userData)

      if (result === null || result === undefined) {

        // let dataResult = [{
        //   "value": "",
        //   "msg": message.unableToUpdate("Employer status"),
        //   "param": "",
        //   "location": ""
        // }]
        // printLogger(0, dataResult, 'employer');
        // return response(res, 200, false, message.message.unableToUpdate("Employer status"), dataResult);
        throw errData(200, message.unableToUpdate("Employer status"), null);
      }
      else {

        printLogger(2, `result:- ${result}`, "employer");
        return response(res, 200, true, message.updateSuccessfully("Employer status"), result);
      }
    }
  }
  catch (error) {

    // let dataResult = [{
    //   "value": "",
    //   "msg": message.error(error),
    //   "param": "",
    //   "location": ""
    // }]
    printLogger(0, error, 'employer');
    // return response(res, 500, false, message.error(error), dataResult) 
    next(error)
  }
};


// Employer forgot password request to rupyo admin
exports.forgotPasswordRequest = async (req, res, next) => {
  try {
    printLogger(2, `*************** ${req.originalUrl} **************** `, "employer");
    let reqBody = req.body;
    const errors = validationResult(req);

    if (errors.errors.length > 0) {

      printLogger(0, errors.array(), "employer");
      // return response(res, 200, false, message.validationError(), errors.array());
      throw errData(200, message.validationError(), errors.array());
    }
    else {
      reqBody.url = req.url;

      let result = await employerModel.getEmployer(reqBody);
      let findResult = result[0]

      // Check find result
      if (findResult === null || findResult === undefined) {

        // let dataResult = [{
        //   "value": "",
        //   "msg": message.userNotRegistered(),
        //   "param": "",
        //   "location": ""
        // }]
        // printLogger(0, dataResult, 'employer');
        // return response(res, 200, false, message.userNotRegistered(), dataResult);
        throw errData(200, message.userNotRegistered(), null);
      }
      else {

        // Check result status
        if (findResult.status === enumValue.archiveStatus) {

          // let dataResult = [{
          //   "value": "",
          //   "msg": message.notAuthorizedToResetPassword(),
          //   "param": "",
          //   "location": ""
          // }]
          // printLogger(0, dataResult, 'employer');
          // return response(res, 200, false, message.notAuthorizedToResetPassword(), dataResult);
          throw errData(200, message.notAuthorizedToResetPassword(), null);
        }

        /* RUPYO ADMIN FORGOT PASSWORD */
        // If rupyo admin clicked on forgot password new password email send on respective admin email address
        if (findResult.role_id === enumValue.rupyoAdminRoleId || findResult.role_id === enumValue.superAdminRoleId || findResult.role_id === enumValue.employerRoleId) {

          let query = { "email": findResult.email };

          // Generate random password
          let updatedPassword = randomString(8);

          // Hash the password
          const hashedPassword = bcryptjs.hashSync(updatedPassword, 10);

          // Save new hashed password to database
          let updatePasswordResult = await userModel.changePassword(query, hashedPassword);

          // Send new password email on admin email address
          let responseEmail = await sendEmail(findResult.email, findResult.email, `<div>Your new password is  ${updatedPassword}.</div>`, "Rupyo password changed");

          if (updatePasswordResult.nModified >= 1) {

            printLogger(2, findResult, "rupyo_admin");
            return response(res, 200, true, message.passwordUpdatedSuccessfully("Password"), { _id: findResult._id });
          }
          else {

            // let dataResult = [{
            //   "value": "",
            //   "msg": message.unableToUpdate("Password"),
            //   "param": "",
            //   "location": ""
            // }]
            // printLogger(0, dataResult, "rupyo_admin");
            // return response(res, 200, false, message.unableToUpdate("Password"), dataResult);
            throw errData(200, message.unableToUpdate("Password"), null);
          }
        }

        // /* EMPLOYER FORGOT PASSWORD */
        // else {

        //   let _randomString = randomString(12);
        //   let requestId = `RP${_randomString}`;
        //   let requestDetail = `I forgot my rupyo account password. My email is ${reqBody.email}`;

        //   let requestData = {
        //     "request_id": requestId,
        //     "request_type": enumValue.forgetPasswordRequest,
        //     "details": requestDetail,
        //     "status": enumValue.pendingStatus,
        //     "company_id": findResult.company_id,
        //     "created_by": findResult._id,
        //   };

        //   let result = await requestModel.requestSave(requestData);

        //   // Notications Calling and send
        //   let forgotPasswordData = {
        //     "employer_name": findResult.first_name + " " + findResult.last_name,
        //     "company_name": findResult.Company.company_name,
        //     "company_code": findResult.Company.rupyo_company_code
        //   };

        //   // Rupyo admin infrom email
        //   let forgotPasswordNotifications = notification.employerForgetPassword(forgotPasswordData);

        //   // Notification for rupyo admin
        //   let notificationsData = {
        //     "user_id": findResult._id,
        //     "company_id": findResult.company_id,
        //     "message": forgotPasswordNotifications,
        //     "resource_type": enumValue.forgetPasswordRequest,
        //     "status": enumValue.pendingStatus,
        //     "request_id": requestId,
        //     "for_notifications": enumValue.rupyoAdminRoleId,
        //     "created_by": findResult._id,
        //   };

        //   notificationsController.saveNotification(notificationsData);

        //   printLogger(2, result, "employer");
        //   return response(res, 200, true, message.requestSent(), { _id: result._id });
        // }
      }

    }
  }
  catch (error) {

    // let dataResult = [{
    //   "value": "",
    //   "msg": message.error(error),
    //   "param": "",
    //   "location": ""
    // }]
    printLogger(0, error, 'employer');
    // return response(res, 500, false, message.error(error), dataResult) 
    next(error)
  }
};


// Employer forgot password (change by rupyo admin)
exports.forgotPassword = async (req, res, next) => {
  try {
    printLogger(2, `*************** ${req.originalUrl} **************** `, "employer");
    let reqBody = req.body;
    const errors = validationResult(req);

    if (errors.errors.length > 0) {

      printLogger(0, errors.array(), "employer");
      // return response(res, 200, false, message.validationError(), errors.array());
      throw errData(200, message.validationError(), errors.array());
    }
    else {

      // Find employer using email
      let employerResult = await employerModel.findEmployer(reqBody);
      printLogger(2, `employerResult:-  ${employerResult}`, "employer");

      if (employerResult === null || employerResult === undefined) {

        // let dataResult = [{
        //   "value": "",
        //   "msg": message.userNotRegistered(),
        //   "param": "",
        //   "location": ""
        // }]
        // printLogger(0, dataResult, 'employer');
        // return response(res, 200, false, message.userNotRegistered(), dataResult);
        throw errData(200, message.userNotRegistered(), null);
      }
      else {

        // Generate random password
        let newPassword = randomString(8);

        let hashedPassword = bcryptjs.hashSync(newPassword, 10);

        let data = {
          "email": reqBody.email,
          "hashedPassword": hashedPassword,
          "_id": req.userData._id,
        };

        // Forgot password
        let result = await employerModel.forgotPassword(data);
        printLogger(2, `result:-  ${result}`, "employer");

        if (result === null) {

          // let dataResult = [{
          //   "value": "",
          //   "msg": message.unableToUpdate("Employer password"),
          //   "param": "",
          //   "location": ""
          // }]
          // printLogger(0, dataResult, 'employer');
          // return response(res, 200, false, message.unableToUpdate("Employer password"), dataResult);
          throw errData(200, message.unableToUpdate("Employer password"), null);
        }
        else {
          let changePasswordData = { "password": newPassword };

          // Rupyo admin infrom email
          let changePasswordNotifications = notification.employerResetPassword(changePasswordData);

          // Notification store employer
          let notificationsData = {
            "user_id": req.userData._id,
            "company_id": result.company_id,
            "message": changePasswordNotifications,
            "request_id": result._id,
            "resource_type": enumValue.changePassword,
            "status": enumValue.approvedStatus,
            "for_notifications": enumValue.employerRoleId,
            "created_by": result._id
          };
          notificationsController.saveNotification(notificationsData);

          // Send forgot password email to employer email address
          let responseEmail = await sendEmail(result.email, result.email, `<div>${changePasswordNotifications}</div>`, "Rupyo password change");

          printLogger(2, result, "employer");
          return response(res, 200, true, message.updateSuccessfully("Employer password"), { _id: result._id });
        }
      }
    }
  }
  catch (error) {

    // let dataResult = [{
    //   "value": "",
    //   "msg": message.error(error),
    //   "param": "",
    //   "location": ""
    // }]
    printLogger(0, error, 'employer');
    // return response(res, 500, false, message.error(error), dataResult) 
    next(error)
  }
};


// Employer Credit limit change request to rupyo admin
exports.creditLimitRequest = async (req, res, next) => {
  try {
    printLogger(2, `*************** ${req.originalUrl} **************** `, "employer");
    let reqBody = { "company_id": String(req.userData.company_id), "rupyo_credit_limit": req.body.rupyo_credit_limit };
    const errors = validationResult(req);

    if (errors.errors.length > 0) {
      printLogger(0, errors.array(), "employer");
      // return response(res, 200, false, message.validationError(), errors.array());
      throw errData(200, message.validationError(), errors.array());
    }
    else {

      let result = await employerModel.employerProfile(reqBody);
      printLogger(2, `result:-  ${result}`, "employer");

      let findResult = result[0];

      if (findResult === null) {

        // let dataResult = [{
        //   "value": "",
        //   "msg": message.userNotRegistered(),
        //   "param": "",
        //   "location": ""
        // }]
        // printLogger(0, dataResult, 'employer');
        // return response(res, 200, false, message.userNotRegistered(), dataResult);
        throw errData(200, message.userNotRegistered(), null);
      }
      else {

        let _randomString = randomString(12);
        let requestId = `RP${_randomString}`;
        let requestDetail = `Please change my credit limit ${reqBody.rupyo_credit_limit}.`;

        let requestData = {
          "request_id": requestId,
          "request_type": enumValue.creditLimit,
          "details": requestDetail,
          "amount": reqBody.rupyo_credit_limit,
          "status": enumValue.pendingStatus,
          "company_id": findResult.company_id,
          "created_by": findResult._id,
        };

        let result = await requestModel.requestSave(requestData);
        printLogger(2, `result:-  ${result}`, "employer");

        // Notications Calling and send
        let creditLimitData = {
          "employer_name": findResult.first_name + " " + findResult.last_name,
          "company_name": findResult.company_name,
          "company_code": findResult.rupyo_company_code,
          "previous_amount": findResult.rupyo_credit_limit,
          "requested_amount": reqBody.rupyo_credit_limit,
        };

        // Send notification to rupyo admin
        let creditLimitNotifications = notification.employerCreditLimit(creditLimitData);

        // Change credit limit request notification for rupyo admin
        let notificationsData = {
          "user_id": req.userData._id,
          "company_id": findResult.company_id,
          "credit_limit": reqBody.rupyo_credit_limit,
          "message": creditLimitNotifications,
          "request_id": result._id,
          "resource_type": enumValue.creditLimit,
          "status": enumValue.pendingStatus,
          "for_notifications": enumValue.rupyoAdminRoleId,
          "created_by": result._id
        };
        notificationsController.saveNotification(notificationsData);

        printLogger(2, result, "employer");
        return response(res, 200, true, message.requestSent(), { company_id: findResult.company_id });
      }
    }
  }
  catch (error) {

    // let dataResult = [{
    //   "value": "",
    //   "msg": message.error(error),
    //   "param": "",
    //   "location": ""
    // }]
    printLogger(0, error, 'employer');
    // return response(res, 500, false, message.error(error), dataResult) 
    next(error)
  }
};



// Change credit limit
exports.changeCreditLimit = async (req, res, next) => {
  try {
    printLogger(2, `*************** ${req.originalUrl} **************** `, "employer");
    let reqBody = req.body;
    const errors = validationResult(req);

    if (errors.errors.length > 0) {

      printLogger(0, errors.array(), "employer");
      // return response(res, 200, false, message.validationError(), errors.array());
      throw errData(200, message.validationError(), errors.array());
    }
    else {

      // Find Employer
      let _employerResult = await employerModel.employerProfile(reqBody);
      printLogger(2, `employerResult:-  ${_employerResult}`, "employer");

      if (_employerResult.length === 0) {

        // let dataResult = [{
        //   "value": "",
        //   "msg": message.userNotRegistered(),
        //   "param": "",
        //   "location": ""
        // }]
        // printLogger(0, dataResult, 'employer');
        // return response(res, 200, false, message.userNotRegistered(), dataResult);
        throw errData(200, message.userNotRegistered(), null);
      }
      else {

        let employerResult = _employerResult[0];

        // Get updated array for transaction_charge_setting
        let transactionChargeSettingArray = getUpdatedArrayForTransactionChargeSetting(employerResult.Company, reqBody);
        reqBody.transaction_charge_setting = transactionChargeSettingArray;


        // Get updated array for employee_credit_limit_setting
        let creditLimitSettingArray = getUpdatedArrayForEmployeeCreditLimitSetting(employerResult.Company, reqBody);
        reqBody.employee_credit_limit_setting = creditLimitSettingArray;


        // Update credit limit
        let result = await employerModel.changeCreditLimit(reqBody, req.userData);

        printLogger(2, `result:-  ${result}`, "employer");

        if (result === null || result === undefined) {

          // let dataResult = [{
          //   "value": "",
          //   "msg": message.unableToUpdate("Credit limit"),
          //   "param": "",
          //   "location": ""
          // }]
          // printLogger(0, dataResult, 'employer');
          // return response(res, 200, false, message.unableToUpdate("Credit limit"), dataResult);
          throw errData(200, message.unableToUpdate('credit limit'), null);
        }
        else {

          let creditLimitData = {
            "employer_name": employerResult.first_name + " " + employerResult.last_name,
            "company_name": result.company_name,
            "company_code": result.rupyo_company_code,
            "previous_amount": result.rupyo_credit_limit,
            "requested_amount": reqBody.rupyo_credit_limit
          };

          // Get notification text
          let creditLimitNotifications = notification.updatedCreditLimitOfEmployer(creditLimitData);

          // Notification for employer
          let notificationsData = {
            "user_id": req.userData._id,
            "company_id": result._id,
            "message": creditLimitNotifications,
            "resource_type": enumValue.creditLimit,
            "request_id": result._id,
            "status": enumValue.approvedStatus,
            "for_notifications": enumValue.employerRoleId,
            "created_by": result._id
          };

          notificationsController.saveNotification(notificationsData);

          printLogger(2, result, "employer");
          // return response(res, 200, true, message.updateSuccessfully("Employer credit limit"), { company_id: result._id });
          return response(res, 200, true, message.changesReflectedNextMonth(), { company_id: result._id });
        }
      }
    }
  }
  catch (error) {

    // let dataResult = [{
    //   "value": "",
    //   "msg": message.error(error),
    //   "param": "",
    //   "location": ""
    // }]
    printLogger(0, error, 'employer');
    // return response(res, 500, false, message.error(error), dataResult) 
    next(error)
  }
};


// Company name and Id
exports.companyName = async (req, res, next) => {
  try {
    printLogger(2, `*************** ${req.originalUrl} **************** `, "employer");

    // Get company name and object id
    let employerResult = await employerModel.companyName();
    printLogger(2, `employerResult:-  ${employerResult}`, "employer");

    if (employerResult.length === 0) {

      // let dataResult = [{
      //   "value": "",
      //   "msg": message.noDataFound(),
      //   "param": "",
      //   "location": ""
      // }]
      // printLogger(0, dataResult, 'employer');
      // return response(res, 200, false, message.noDataFound(), dataResult);
      throw errData(200, message.noDataFound(), null);
    }
    else {

      for (let i = 0; i < employerResult.length; i++) {

        // Employer credit limit default set month wise
        let creditLimitType = enumValue.monthWiseCreditLimit;

        // Get current month credit_limit_type value from commonFunction
        creditLimitType = employeeCreditLimitType(employerResult[i]);

        employerResult[i].credit_limit_type = creditLimitType;

        delete employerResult[i].employee_credit_limit_setting
      }

      printLogger(2, employerResult, "employer");
      return response(res, 200, true, message.dataFound(), employerResult);
    }
  }
  catch (error) {

    // let dataResult = [{
    //   "value": "",
    //   "msg": message.error(error),
    //   "param": "",
    //   "location": ""
    // }]
    printLogger(0, error, 'employer');
    // return response(res, 500, false, message.error(error), dataResult) 
    next(error)
  }
};


// Employee Csv file upload
exports.employerCsvUpload = async (req, res, next) => {
  try {
    printLogger(2, `*************** ${req.originalUrl} **************** `, "employer");
    const errors = validationResult(req);

    // If validation errors
    if (errors.errors.length > 0) {
      printLogger(0, errors.array(), "employer");
      // return response(res, 200, false, message.validationError(), errors.array());
      throw errData(200, message.validationError(), errors.array());
    }
    else {

      let csvData = req.files.csv_book.data.toString(enumValue.stringFormat);

      let insertData = [];
      let errorData = [];
      let done = 0;
      await csv()
        .fromString(csvData)
        .then((jsonObj) => {
          for (let i = 0; i < jsonObj.length; i++) {
            let reqBody = { email: jsonObj[i].email };

            employerModel.findEmployer(reqBody)
              .then((emailResult) => {
                printLogger(2, emailResult, "employer");
                if (emailResult !== null) {

                  errorData.push({
                    error: message.emailIdAlreadyTaken(),
                    email: emailResult.email,
                    bank_name: jsonObj[i].bank_name,
                    account_number: jsonObj[i].account_number,
                    ifsc_code: jsonObj[i].ifsc_code,
                    pan_card: jsonObj[i].pan_card,
                    company_cin: jsonObj[i].company_cin,
                    roc_type: jsonObj[i].roc_type || enumValue.companyCinType,
                    company_name: jsonObj[i].company_name,
                    address_1: jsonObj[i].address_1,
                    address_2: jsonObj[i].address_2,
                    pincode: jsonObj[i].pincode,
                    city: jsonObj[i].city,
                    state: jsonObj[i].state,
                    country: jsonObj[i].country,
                    set_payout_limit: jsonObj[i].set_payout_limit,
                    employee_id_generation_method: jsonObj[i].employee_id_generation_method,
                    weekly_holiday: jsonObj[i].weekly_holiday,
                    password: jsonObj[i].password,
                    first_name: jsonObj[i].first_name,
                    middle_name: jsonObj[i].middle_name,
                    last_name: jsonObj[i].last_name,
                    mobile_number: jsonObj[i].mobile_number,
                    branch_name: jsonObj[i].branch_name,
                    bank_account_type: jsonObj[i].bank_account_type,
                  });
                  done++;
                  if (done === jsonObj.length) {
                    errorExit();
                  }
                } else {
                  if (!jsonObj[i].file) {
                    reqFile = "";
                  } else {
                    reqFile = jsonObj[i].file.filename;
                  }

                  // Encrypt field object
                  let fields = {
                    bank_name: jsonObj[i].bank_name,
                    account_number: jsonObj[i].account_number,
                    ifsc_code: jsonObj[i].ifsc_code,
                    pan_card: jsonObj[i].pan_card,
                    company_cin: jsonObj[i].company_cin,
                    branch_name: jsonObj[i].branch_name,
                    bank_account_type: jsonObj[i].bank_account_type,
                  };

                  // Encryption
                  let encrypted_field = encryptData(fields);

                  // Generate Rupyo company code
                  let rupyoCompanyCode = randomString(8);

                  // Get status value form enum
                  let _status = enumValue.activeStatus;

                  let companyData = {
                    company_name: jsonObj[i].company_name,
                    company_logo: reqFile,
                    rupyo_company_code: rupyoCompanyCode,
                    status: _status,
                    bank_details: {
                      bank_name: encrypted_field.bank_name,
                      account_number: encrypted_field.account_number,
                      ifsc_code: encrypted_field.ifsc_code,
                      branch_name: encrypted_field.branch_name,
                      bank_account_type: encrypted_field.bank_account_type,
                    },
                    pan_card: encrypted_field.pan_card,
                    company_cin: encrypted_field.company_cin,
                    roc_type: jsonObj[i].roc_type || enumValue.companyCinType,
                    address: {
                      address_1: jsonObj[i].address_1,
                      address_2: jsonObj[i].address_2,
                      pincode: jsonObj[i].pincode,
                      city: jsonObj[i].city,
                      state: jsonObj[i].state,
                      country: jsonObj[i].country,
                    },
                    rupyo_credit_limit: global.env.EMPLOYER_CREDIT_LIMIT,
                    set_payout_limit: jsonObj[i].set_payout_limit,
                    employee_id_generation_method: jsonObj[i].employee_id_generation_method,
                    weekly_holiday: jsonObj[i].weekly_holiday,
                    created_by: req.userData._id,
                  };

                  // Create company
                  employerModel
                    .createCompany(companyData)
                    .then((companyResult) => {
                      if (!companyResult) {
                        printLogger(0, companyResult, "employer");
                        throw errData(200, message.noDataFound(), null);
                      }
                      else {

                        // Password hashing
                        const hashedPassword = bcryptjs.hashSync(jsonObj[i].password, 10);

                        let employerData = {
                          role_id: enumValue.employerRoleId,
                          first_name: jsonObj[i].first_name,
                          middle_name: jsonObj[i].middle_name,
                          last_name: jsonObj[i].last_name,
                          email: jsonObj[i].email,
                          mobile_number: jsonObj[i].mobile_number,
                          password: hashedPassword,
                          status: _status,
                          company_status: companyResult.status,
                          company_id: companyResult._id,
                          company_name: jsonObj[i].company_name,
                          created_by: req.userData._id,
                        };

                        // Create employer
                        employerModel.createEmployer(employerData)
                          .then((employerResult) => {
                            let result = `${companyResult} +" "+ ${employerResult}`;

                            // Notications Calling and send
                            let employerData = {
                              login_id: employerResult.email,
                              password: jsonObj[i].password,
                            };

                            // Employer notifications send email
                            let employerCreationMessage = notification.employerCreation(employerData);

                            // Send welcome email to employer
                            let responseEmail = sendEmail(employerResult.email, employerResult.email, `<div>${employerCreationMessage}</div>`, "Welcome to Rupyo");

                            printLogger(2, result, "employer");
                            insertData.push({ _id: employeeResult._id });
                            for (i = 0; i < insertData.length; i++) {
                              done++;

                              if (done !== insertData.length) {
                                exit();
                              }
                            }
                          })

                          .catch((error) => {
                            // let dataResult = [{
                            //   "value": "",
                            //   "msg": "error",
                            //   "param": "",
                            //   "location": ""
                            // }]
                            // printLogger(0, dataResult, 'employer');
                            // return response(res, 500, false, message.error(error), dataResult);
                            throw errData(200, message.error(), null);
                          });
                      }
                    })
                    .catch((error) => {
                      // let dataResult = [{
                      //   "value": "",
                      //   "msg": "error",
                      //   "param": "",
                      //   "location": ""
                      // }]
                      // printLogger(0, dataResult, 'employer');
                      // return response(res, 500, false, message.error(error), dataResult);
                      throw errData(200, message.error(), null);
                    });
                }
              })
              .catch((error) => {
                // let dataResult = [{
                //   "value": "",
                //   "msg": "error",
                //   "param": "",
                //   "location": ""
                // }]
                // printLogger(0, dataResult, 'employer');
                // return response(res, 500, false, message.error(error), dataResult);
                throw errData(200, message.error(), null);
              });
          }

          exit = () => {

            // Insert successfully message
            printLogger(2, insertData, 'employee');
            return response(res, 200, true, message.insertSuccessfully('Csv data'), insertData);
          }
          errorExit = () => {
            // Excel file data  store
            let workbook = new Excel.Workbook();
            let worksheet = workbook.addWorksheet("New Sheet");

            // Data
            let _data = [];
            for (i = 0; i < errorData.length; i++) {
              _data.push({
                error: errorData[i].error,
                first_name: errorData[i].first_name,
                middle_name: errorData[i].middle_name,
                last_name: errorData[i].last_name,
                mobile_number: errorData[i].mobile_number,
                address_1: errorData[i].address_1,
                address_2: errorData[i].address_2,
                pincode: errorData[i].pincode,
                city: errorData[i].city,
                state: errorData[i].state,
                country: errorData[i].country,
                set_payout_limit: errorData[i].set_payout_limit,
                employee_id_genertaion_methhod: errorData[i].employee_id_genertaion_methhod,
                weekly_holiday: errorData[i].weekly_holiday,
                password: errorData[i].password,
                bank_name: errorData[i].bank_name,
                account_number: errorData[i].account_number,
                ifsc_code: errorData[i].ifsc_code,
                branch_name: errorData[i].branch_name,
                bank_account_type: errorData[i].bank_account_type,
                pan_card: errorData[i].pan_card,
                company_cin: errorData[i].company_cin,
                company_name: errorData[i].company_name,
                selfie: errorData[i].selfie,
              });
            }

            let milis = new Date();
            milis = milis.getTime();

            // Worksheet columns
            worksheet.columns = [{
              header: "Error",
              key: "error",
            },
            {
              header: "First name",
              key: "first_name",
            },
            {
              header: "Middle name",
              key: "middle_name",
            },
            {
              header: "Last name",
              key: "last_name",
            },
            {
              header: "Email",
              key: "email",
            },
            {
              header: "Mobile number",
              key: "mobile_number",
            },
            {
              header: "Address 1",
              key: "address_1",
            },
            {
              header: "address 2",
              key: "address_2",
            },
            {
              header: "Pincode",
              key: "pincode",
            },
            {
              header: "City",
              key: "city",
            },
            {
              header: "State",
              key: "state",
            },
            {
              header: "Country",
              key: "country",
            },
            {
              header: "Set payout limit",
              key: "set_payout_limit",
            },
            {
              header: "Employee id generation method",
            },
            {
              key: "employee_id_genertaion_methhod",
            },
            {
              header: "Weekly holiday",
              key: "weekly_holiday",
            },
            {
              header: "Password",
              key: "password",
            },
            {
              header: "Bank name",
              key: "bank_name",
            },
            {
              header: "Account number",
              key: "account_number",
            },
            {
              header: "Ifsc code",
              key: "ifsc_code",
            },
            {
              header: "Branch Name",
              key: "branch_name",
            },
            {
              header: "Bank Account Type",
              key: "bank_account_type",
            },
            {
              header: "Pancard",
              key: "pan_card",
            },
            {
              header: "Company cin",
              key: "company_cin",
            },
            {
              header: "Company name",
              key: "company_name",
            },
            {
              header: "Selfie",
              key: " selfie",
            },
            ];

            // formatting the header
            worksheet.columns.forEach((column) => {
              column.width =
                column.header.length < 12 ? 12 : column.header.length;
            });

            worksheet.getRow(1).font = {
              bold: true,
            };

            // Insert the data into excel
            _data.forEach((e, index) => {
              const rowIndex = index + 2;

              worksheet.addRow({
                error: e.error,
                first_name: e.first_name,
                middle_name: e.middle_name,
                last_name: e.last_name,
                mobile_number: e.mobile_number,
                address_1: e.address_1,
                address_2: e.address_2,
                pincode: e.pincode,
                city: e.city,
                state: e.state,
                country: e.country,
                set_payout_limit: e.set_payout_limit,
                employee_id_genertaion_methhod: e.employee_id_genertaion_methhod,
                weekly_holiday: e.weekly_holiday,
                password: e.password,
                bank_name: e.bank_name,
                account_number: e.account_number,
                ifsc_code: e.ifsc_code,
                branch_name: e.branch_name,
                bank_account_type: e.bank_account_type,
                pan_card: e.pan_card,
                company_cin: e.company_cin,
                company_name: e.company_name,
                selfie: e.selfie,
              });
            });

            // Formatting borders
            // loop through all of the rows and set the outline style.
            worksheet.eachRow({
              includeEmpty: false,
            },
              function (row, rowNumber) {
                worksheet.getCell(`A${rowNumber}`).border = {
                  top: {
                    style: "thin",
                  },
                  left: {
                    style: "thin",
                  },
                  bottom: {
                    style: "thin",
                  },
                  right: {
                    style: "none",
                  },
                };

                const insideColumns = ["B", "C", "D", "E"];
                insideColumns.forEach((v) => {
                  worksheet.getCell(`${v}${rowNumber}`).border = {
                    top: {
                      style: "thin",
                    },
                    bottom: {
                      style: "thin",
                    },
                    left: {
                      style: "none",
                    },
                    right: {
                      style: "none",
                    },
                  };
                });

                worksheet.getCell(`F${rowNumber}`).border = {
                  top: {
                    style: "thin",
                  },
                  left: {
                    style: "none",
                  },
                  bottom: {
                    style: "thin",
                  },
                  right: {
                    style: "thin",
                  },
                };
              }
            );

            //Saving the excel file
            workbook.xlsx.writeFile(path.join('./public', 'excels', 'csv_data_not_insert', `DataSheet-${milis}.xlsx`));


            // Not insert successfully message
            printLogger(2, errorData, "employer");
            return response(res, 200, true, message.noInsertSuccessfully("Csv data"), errorData);
          };
        })

        .catch((error) => {
          // let dataResult = [{
          //   "value": "",
          //   "msg": "error",
          //   "param": "",
          //   "location": ""
          // }]
          // printLogger(0, dataResult, 'employer');
          // return response(res, 500, false, message.error(error), dataResult);
          throw errData(200, message.error(error), null);
        });
    }
  }
  catch (error) {
    // let dataResult = [{
    //   "value": "",
    //   "msg": message.error(error),
    //   "param": "",
    //   "location": ""
    // }]
    printLogger(0, error, 'employer');
    // return response(res, 500, false, message.error(error), dataResult) 
    next(error)
  }
};


// Employer profile
exports.employerProfile = async (req, res, next) => {
  try {
    printLogger(2, `*************** ${req.originalUrl} **************** `, "employer");
    let companyId = req.userData.company_id ? String(req.userData.company_id) : req.body.company_id;

    let data = {
      "company_id": companyId,
      "role_id": req.userData.role_id
    };

    // if (data.role_id === enumValue.employerRoleId || data.role_id === enumValue.rupyoAdminRoleId) {

    let result = await employerModel.employerProfile(data);
    printLogger(2, `result:-  ${result}`, "employer");

    if (result.length === 0) {
      throw errData(200, message.companyNotExists(), null);
    }
    else {
      let employerResult = result[0];

      // Employer status 
      let statusResult = await employeesModel.employeeCount(data);

      // Number of employee
      let numberOfEmployee = statusResult[0] === undefined || statusResult[0] === null ? 0 : statusResult[0].company_id;

      data.days_filter = enumValue._thisMonth;

      // Selfie url
      let selfieUrl = "";
      if (employerResult.selfie) {
        selfieUrl = await tokenMethod.getCloudFrontURL(employerResult.selfie);
      }

      // Company tranactions data
      let transactionData = await transactionActions(data);

      let bankDetails = {
        bank_name: employerResult.bank_details.bank_name,
        account_number: employerResult.bank_details.account_number,
        ifsc_code: employerResult.bank_details.ifsc_code,
        branch_name: employerResult.bank_details.branch_name,
        bank_account_type: employerResult.bank_details.bank_account_type,
        pan_card: employerResult.pan_card,
        company_cin: employerResult.company_cin,
        // partnership_firm_company_id: employerResult.partnership_firm_company_id
      };

      // Bank details decryption file call
      let decryptionDetail = decryptData(bankDetails);

      let employerPayTransactionCharge = false;
      let creditLimitType = enumValue.monthWiseCreditLimit;

      // Get current month employer_pay_transaction_charge value from commonFunction
      employerPayTransactionCharge = transactionChargeSetting(employerResult.Company);

      // Get current month credit_limit_type and credit_limit_percent value from commonFunction
      creditLimitType = employeeCreditLimitType(employerResult.Company);

      // If employers has next month changes
      let employerPayTransactionChargeNextMonth = transactionChargeSettingForNextMonth(employerResult.Company);

      let resultData = {

        "_id": employerResult._id,
        "status": employerResult.status,
        "first_name": employerResult.first_name,
        "middle_name": employerResult.middle_name,
        "last_name": employerResult.last_name,
        "mobile_number": employerResult.mobile_number,
        "selfie": selfieUrl,
        "company_name": employerResult.company_name,
        "company_address": employerResult.address,
        "rupyo_company_code": employerResult.rupyo_company_code,
        "created_at": employerResult.created_at,
        "rupyo_credit_limit": employerResult.rupyo_credit_limit,
        "weekly_holiday": employerResult.weekly_holiday,
        "bank_name": decryptionDetail.bank_name,
        "account_number": decryptionDetail.account_number,
        "ifsc_code": decryptionDetail.ifsc_code,
        "branch_name": decryptionDetail.branch_name,
        "bank_account_type": decryptionDetail.bank_account_type,
        "company_cin": decryptionDetail.company_cin,
        "roc_type": employerResult.roc_type === undefined ? enumValue.companyCinType : employerResult.roc_type,
        "pan_card": decryptionDetail.pan_card,
        "employee_id_generation_method": employerResult.employee_id_generation_method,
        "number_of_employee": numberOfEmployee,
        "current_number_of_employees": numberOfEmployee,
        "total_payout_transaction_count": parseFloat(transactionData.total_payout_transaction_count.toFixed(2)) || 0,
        "total_amount_paid": parseFloat(transactionData.total_amount_paid.toFixed(2)) || 0,
        "out_standing_balance": parseFloat(transactionData.total_amount_paid.toFixed(2)) || 0,
        "amount_requested": parseFloat(transactionData.amount_requested.toFixed(2)) || 0,
        "amount_recieved": parseFloat(transactionData.total_amount_paid.toFixed(2)) || 0,
        "admin_id": employerResult.email,
        "last_transaction_data": transactionData.last_transaction_data,
        "employer_pay_transaction_charge": employerPayTransactionCharge.employer_pay_transaction_charge,
        "transaction_deduction_percent": employerPayTransactionCharge.transaction_deduction_percent,
        "credit_limit_type": creditLimitType,
        "is_next_month_changes": employerPayTransactionChargeNextMonth.employer_pay_transaction_charge !== null ? true : false,
        "gurantor_name": employerResult.Company.gurantor_name,
        "incorporation_date": employerResult.Company.incorporation_date,
        "gst_number": employerResult.Company.gst_number,
        "is_next_month_changes": employerPayTransactionChargeNextMonth.employer_pay_transaction_charge !== null ? true : false
        // "credit_limit_percent": creditLimitPercent
      };


      printLogger(2, resultData, "employer");
      return response(res, 200, true, message.dataFound(), resultData);
    }
    // }
    // else {

    //   let dataResult = [{
    //     "value": '',
    //     "msg": message.notAuthorizeAcess(),
    //     "param": "",
    //     "location": ""
    //   }]
    //   printLogger(0, dataResult, 'employer');
    //   return response(res, 403, false, message.notAuthorizeAcess(), dataResult);
    // }
  }
  catch (error) {

    // let dataResult = [{
    //   "value": "",
    //   "msg": message.error(error),
    //   "param": "",
    //   "location": ""
    // }]
    printLogger(0, error, 'employer');
    // return response(res, 500, false, message.error(error), dataResult) 
    next(error)
  }
};


// Employer dashboard
exports.employerDashboard = async (req, res, next) => {
  try {
    printLogger(2, `*************** ${req.originalUrl} **************** `, "employer");
    let lastDate = moment().utc().endOf('month').format('D');
    let toDate = moment().utc().format('D');

    let data = {
      "company_id": req.userData.company_id,
      "role_id": req.userData.role_id
    };


    // // If errors is empty
    // if (data.role_id === enumValue.employerRoleId) {

    let result = await employerModel.employerProfile(data);
    printLogger(2, `result:-  ${result}`, "employer");

    let companyResult = result[0];

    if (companyResult === null || companyResult === undefined) {

      // let dataResult = [{
      //   "value": '',
      //   "msg": message.companyNotExists(),
      //   "param": "",
      //   "location": ""
      // }]
      // printLogger(0, dataResult, "employer");
      // return response(res, 200, false, message.companyNotExists(), dataResult);
      throw errData(200, message.companyNotExists(), null);
    }
    else {

      let result = { company_id: String(companyResult.company_id) };

      // Employees status 
      let statusResult = await employeesModel.employeeStatus(result);
      printLogger(2, `statusResult:-  ${statusResult}`, "employer");

      if (statusResult.length === 0) {
        statusResult = [
          { _id: 1, count: 0 },
          { _id: 2, count: 0 },
          { _id: 3, count: 0 }
        ]
      }

      // Number of employee count this company
      let employeeCountResult = await employeesModel.employeeCount(result);
      printLogger(2, `employeeCountResult:-  ${employeeCountResult}`, "employer");

      let number_of_employees = employeeCountResult[0] === undefined || employeeCountResult[0] === null ? 0 : employeeCountResult[0].company_id;

      let reqBody;
      reqBody = {
        "company_id": companyResult.company_id,
        "days_filter": enumValue._thisMonth
      };

      // Employess transaction details
      let transactionMonthlyData = await transactionMonthly(reqBody);

      reqBody = {

        "company_id": String(companyResult.company_id),
        "days_filter": enumValue._thisMonth
      };

      // Employess request made  
      let transactionData = await transactionActions(reqBody);
      printLogger(2, `transactionData:-  ${transactionData}`, "employer");

      let _data = { "company_id": String(companyResult.company_id) }

      // Attendance data
      let attendanceData = await attendanceToday(_data);
      printLogger(2, `attendanceData:-  ${attendanceData}`, "employer");

      let notPayoutEmployee = transactionMonthlyData.total_payout_transaction_count[0] === null || transactionMonthlyData.total_payout_transaction_count[0] === undefined ? 0 : transactionMonthlyData.total_payout_transaction_count[0].payout_credited;

      // Average payout credited
      let averagePayoutCredited = 0;

      if (transactionMonthlyData.total_payout_transaction_count.length > 0) {

        averagePayoutCredited = transactionMonthlyData.total_amount_paid / transactionMonthlyData.eod_transaction_employee.length  // transactionMonthlyData.multiple_transaction_count[0].number_of_payout;
      }

      // Calculate dashboard graph categories
      let categories = [];
      for (let i = 1; i <= toDate; i++) {
        categories.push(i)
      }


      // Calculate dashboard graph payout count and payout volume
      reqBody.company_id = req.userData.company_id

      let resultCount = [];
      let resultAmount = [];

      for (let i = 1; i <= toDate; i++) {

        reqBody.toDate = i;
        let perDayResult = await transactionModel.eodTransactionsCountPerDate(reqBody);

        resultCount.push(perDayResult.length)

        let dailyAmount = 0;
        for (let j = 0; j < perDayResult.length; j++) {

          dailyAmount = dailyAmount + perDayResult[j].amount
        }

        resultAmount.push(dailyAmount);
      }

      // Employee selfie
      if (transactionMonthlyData.eod_transaction_employee.length > 0) {

        for (i = 0; i < transactionMonthlyData.eod_transaction_employee.length; i++) {

          if (transactionMonthlyData.eod_transaction_employee[i].selfie !== undefined && transactionMonthlyData.eod_transaction_employee[i].selfie !== null) {

            let selfie_url = await tokenMethod.getCloudFrontURL(transactionMonthlyData.eod_transaction_employee[i].selfie);
            transactionMonthlyData.eod_transaction_employee[i].selfie = selfie_url;
          }
          else {
            transactionMonthlyData.eod_transaction_employee[i].selfie = "";
          }
        }
      }


      // Set dummy key if array length is zero
      if (transactionMonthlyData.total_payout_transaction_count.length === 0) {

        transactionMonthlyData.total_payout_transaction_count[0] = {
          "payout_credited": 0
        }
      }

      if (transactionMonthlyData.eod_transaction_count.length === 0) {

        transactionMonthlyData.eod_transaction_count[0] = {
          "payout_credited": 0
        }
      }

      let totalPayoutTransactionCount = [{
        payout_credited: 0
      }]

      if (transactionMonthlyData.total_payout_transaction_count.length > 0) {

        totalPayoutTransactionCount = transactionMonthlyData.total_payout_transaction_count
      }

      // Response result
      let resultData = {

        "email_id": companyResult.email,
        "mobile_number": companyResult.mobile_number,
        "company_name": companyResult.company_name,
        "gurantor_name": companyResult.Company.gurantor_name,
        "incorporation_date": companyResult.Company.incorporation_date,
        "gst_number": companyResult.Company.gst_number,
        "company_id": String(companyResult.company_id),
        "rupyo_company_code": companyResult.rupyo_company_code,

        "rupyo_credit_limit": companyResult.rupyo_credit_limit,

        // Remaining credit limit 
        "remaining": parseFloat((companyResult.rupyo_credit_limit - transactionMonthlyData.total_amount_paid).toFixed(2)) || 0,

        // Consume credit limit
        "consume": parseFloat(transactionMonthlyData.total_amount_paid.toFixed(2)) || 0,

        // Employee attendance today   
        "today_attendance_count": attendanceData.attendanceCount,

        // Employee count status wise
        "employee_status_count": statusResult,

        // Payout distributions
        "number_of_employee": number_of_employees,
        "total_payout_transaction_count": totalPayoutTransactionCount,
        "request_made": transactionData.request_made,
        "eod_transaction_count": transactionMonthlyData.eod_transaction_count,
        'average_payout_credited': parseInt(averagePayoutCredited),


        // List of employees who have credited payout
        'eod_transaction_employee': transactionMonthlyData.eod_transaction_employee,

        // Dashboard graph
        'categories': categories,

        'payout_volume': resultAmount,

        'payout_count': resultCount,
        'first_name': companyResult.first_name,
        'middle_name': companyResult.middle_name,
        'last_name': companyResult.last_name
      };

      let userResultDashboard = {};
    //  console.log("resultData",resultData);
      if (req.loginResult) {

        userResultDashboard._id = req.loginResult._id,
          userResultDashboard.role_id = req.loginResult.role_id,
          userResultDashboard.selfie = req.loginResult.selfie,
          userResultDashboard.token = req.loginResult.token,
          userResultDashboard.company_id = req.loginResult.company_id,
          userResultDashboard.employee_id_generation_method = req.loginResult.employee_id_generation_method,
          userResultDashboard.unread_notifications_count = req.loginResult.unread_notifications_count,
          userResultDashboard.credit_limit_type = req.userData.credit_limit_type;
        userResultDashboard.employer_dashboard = resultData


        printLogger(2, `userResultDashboard:- ${userResultDashboard}`, 'rupyo_admin');
        return response(res, 200, true, message.loggedIn(), userResultDashboard);

      }
      else {

        printLogger(2, `resultData:- ${resultData}`, "employer");
        return response(res, 200, true, message.dataFound(), resultData);
      }

    }
    // }
    // else {
    //   let dataResult = [{
    //     "value": '',
    //     "msg": message.notAuthorizeAcess(),
    //     "param": "",
    //     "location": ""
    //   }]
    //   printLogger(0, dataResult, 'employer');
    //   return response(res, 403, false, message.notAuthorizeAcess(), dataResult);
    // }
  }
  catch (error) {

    // let dataResult = [{
    //   "value": "",
    //   "msg": message.error(error),
    //   "param": "",
    //   "location": ""
    // }]
    printLogger(0, error, 'employer');
    // return response(res, 500, false, message.error(error), dataResult) 
    next(error)
  }
};



// Get next month transaction_charge_setting and employee_credit_limit_setting
exports.employerNextMonthChanges = async (req, res, next) => {
  try {
    printLogger(2, `*************** ${req.originalUrl} **************** `, "employer");

    let companyId = req.userData.company_id ? String(req.userData.company_id) : req.body.company_id;

    let data = {
      "company_id": companyId,
      "role_id": enumValue.employerRoleId
    };

    let result = await employerModel.employerProfile(data);
    printLogger(2, `result:-  ${result}`, "employer");

    if (result.length === 0) {

      // let dataResult = [{
      //   "value": '',
      //   "msg": message.companyNotExists(),
      //   "param": "",
      //   "location": ""
      // }]
      // printLogger(0, dataResult, "employer");
      // return response(res, 200, false, message.companyNotExists(), dataResult);
      throw errData(200, message.companyNotExists(), null);
    }
    else {

      let employerResult = result[0];

      // Get next month employer_pay_transaction_charge value from commonFunction
      let employerPayTransactionCharge = transactionChargeSettingForNextMonth(employerResult.Company);

      // Get next month credit_limit_type and credit_limit_percent value from commonFunction
      let creditLimitType = employeeCreditLimitTypeForNextMonth(employerResult.Company);

      // Response data
      let responseData = {
        "employer_pay_transaction_charge": employerPayTransactionCharge.employer_pay_transaction_charge,
        "transaction_deduction_percent": employerPayTransactionCharge.transaction_deduction_percent,
        "credit_limit_type": creditLimitType.credit_limit_type,
        "changes_reflection_date": creditLimitType.changes_reflection_date
      }

      if (employerPayTransactionCharge.employer_pay_transaction_charge === null){
        printLogger(2, responseData, "employer");
      return response(res, 200, false, message.noDataFound(), responseData);
      }

      printLogger(2, responseData, "employer");
      return response(res, 200, true, message.dataFound(), responseData);
    }
  }
  catch (error) {

    // let dataResult = [{
    //   "value": "",
    //   "msg": message.error(error),
    //   "param": "",
    //   "location": ""
    // }]
    printLogger(0, error, 'employer');
    // return response(res, 500, false, message.error(error), dataResult) 
    next(error)
  }
};


// Employer utilize credit limit this month and remaning
transactionActions = async (reqBody) => {

  // Employee transaction details
  let transactionResult = await transactionModel.lastTransactionDataEmployer(reqBody);

  // All payout request
  let requestMade = transactionResult[0].requestMade[0] === undefined || transactionResult[0].requestMade[0] === null ? 0 : transactionResult[0].requestMade[0].amount;

  let amountRequested = transactionResult[0].amountRequest[0] === undefined || transactionResult[0].amountRequest[0] === null ? 0 : transactionResult[0].amountRequest[0].amount;

  let lastTransactionData = transactionResult[0].transactionData[0] === undefined || transactionResult[0].transactionData[0] === null ? [] : transactionResult[0].transactionData[0].employer;

  let totalPayoutTransactionCount = transactionResult[0].transactionCount[0] === undefined || transactionResult[0].transactionCount[0] === null ? 0 : transactionResult[0].transactionCount[0].amount;

  // Total amount paid 
  let totalAmountPaid = transactionResult[0].totalPaid[0] === undefined || transactionResult[0].totalPaid[0] === null ? 0 : transactionResult[0].totalPaid[0].amount;

  let totalDistribution = await transactionModel.totalDistributionAmount(reqBody)

  let transactionData = {
    "total_payout_transaction_count": totalPayoutTransactionCount,
    "total_amount_paid": totalAmountPaid,
    "request_made": requestMade,
    "amount_requested": amountRequested,
    "last_transaction_data": lastTransactionData,
    "total_distribution": totalDistribution

  }
  return transactionData
};


// Transaction daily graph data
transactionsDaily = async (data) => {

  try {
    let employeePayoutData;
    let dailyPayoutResult = await transactionModel.transactionsFilterListDaily(data);

    if (dailyPayoutResult.length === 0) {
      return 0;
    }
    else {
      let payoutCount = 0;
      let totalPayoutAmount = 0;
      let createdAt;
      let employeePayoutGraphData = [];

      // Employee payout data date wise and total amount
      for (i = 0; i < dailyPayoutResult.length; i++) {
        payoutCount++
        createdAt = dailyPayoutResult[i].created_at
        totalPayoutAmount = totalPayoutAmount + dailyPayoutResult[i].payout_credited
      }

      employeePayoutGraphData.push({
        "date_of_payout": createdAt,
        "daily_payout_amount": totalPayoutAmount,
        "payout_Count": payoutCount

      })

      employeePayoutData = {
        "employee_payout_graph_data": employeePayoutGraphData
      }
    }
    return employeePayoutData
  }
  catch {
    return 0;
  }
};


// Transaction employer cummulative this month
transactionMonthly = async (reqBody) => {
  try {

    // Employess transaction details
    let transactionResult = await transactionModel.transactionsFilterListMonthly(reqBody);

    // let totalPayoutTransaction = 0;
    let totalAmountPaid = transactionResult[0].payoutCount[0] === undefined || transactionResult[0].payoutCount[0] === null ? 0 : transactionResult[0].payoutCount[0].totalAmount;
    let eodTransactionEmployee = transactionResult[0].transactionData[0] === undefined || transactionResult[0].transactionData[0] === null ? [] : transactionResult[0].transactionData[0].company;

    //  Employee total Distribution Amount count
    let eodTransaction = await transactionModel.eodTransactionsCount(reqBody);

    //  Employee transaction multiple time count
    let multipleTransaction = await transactionModel.employeeTookMultipleAmount(reqBody);

    // Number of employee count this month payout done
    let numberOfEmployeePayoutDone = await transactionModel.payoutPaidEmployeeCountThisMonth(reqBody);


    let transactionMonthlyData = {
      "eod_transaction_employee": eodTransactionEmployee,
      "total_amount_paid": totalAmountPaid,
      "eod_transaction_count": eodTransaction,
      "total_payout_transaction_count": numberOfEmployeePayoutDone,
      "multiple_transaction_count": multipleTransaction[0].payoutCount
    }

    return transactionMonthlyData
  }
  catch {
    return 0;
  }
};


// Attendance data today particular company
attendanceToday = async (_data) => {
  try {

    let toDayAttendance = await attendanceModel.attendanceListToday(_data);

    let attendanceData = {
      "attendanceCount": toDayAttendance,
    }
    return attendanceData
  }
  catch {
    return 0;
  }
};


// Bank details encryption
bankDetailsEncryption = async (reqBody) => {
  try {

    // Encrypt field object
    let fields = {
      bank_name: reqBody.bank_name,
      account_number: reqBody.account_number,
      ifsc_code: reqBody.ifsc_code,
      branch_name: reqBody.branch_name,
      bank_account_type: reqBody.bank_account_type,
      pan_card: reqBody.pan_card,
      company_cin: reqBody.company_cin,

      // partnership_firm_company_id: reqBody.partnership_firm_company_id
    };

    // Encryption
    let encrypted_field = encryptData(fields);

    return encrypted_field
  }
  catch {
    return 0
  }
};