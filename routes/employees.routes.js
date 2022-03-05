const router = require('express').Router();
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');

const employeesController = require('../controllers/employees.controller');
const validation = require('../core/validation');
const auth = require('../core/auth');
const permit = require('../core/authorization');
const { enumValue } = require('../core/utility');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');


// Middleware 
// Parse application/json
router.use(bodyParser.json())

// Parse application/x-www-form-urlencoded
router.use(bodyParser.urlencoded({ extended: false }));

// Parse an text/plain into a string
router.use(bodyParser.text({ type: 'text/plain' }));
router.use(fileUpload())


// Employee Signin
router.post('/signin',
    logReqData,
    [
        validation.mobileNumberString,
        validation.pin
    ],
    employeesController.signIn);



// Employee auto sign in
router.post('/autosignin',
    logReqData,
    auth,
    permit([enumValue.employeeRoleId]),
    logTokenData,
    employeesController.autoSignIn);


// Create employees
router.post('/createemployee',
    logReqData,
    // Check validation
    [
        validation.firstName,
        validation.lastName,
        validation.mobileNumber,
        validation.companyId,
        validation.address_1,
        validation.address_2,
        validation.pinCode,
        validation.city,
        validation.state,
        validation.country,
        validation.workShift,
        validation.employeeType,
        validation.salaryCycle,
        validation.basicSalary,
        validation.deductions,
        validation.openingBalance,
        validation.bankName,
        validation.accountNumber,
        validation.ifscCode,
        validation.panCard,
        validation.aadharCard,
        validation.dob,
        validation.father_mother_name,
        validation.branch_name,
        validation.gender,
        validation.bankAccountType,
        validation.nameInBank
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    employeesController.createEmployee);


// Employees list
router.post('/employeeslist',
    logReqData,
    [
        validation.searchName
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    employeesController.employeesList);


// Find employee
router.post('/findemployee',
    logReqData,
    [
        // Check validation
        validation.employeeId
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    employeesController.findEmployee);


// Update Credit limit
router.post('/creditlimit',
    logReqData,
    [
        // Check validation
        validation.percentNum,
        validation._employeesId
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    employeesController.creditLimit);


// Change status
router.post('/changestatus',
    logReqData,
    [
        // Check validation
        validation.status,
        validation._employeesId
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    employeesController.changeStatus);


// Employee registration from mobile 
router.post('/register',
    logReqData,
    [
        validation.companyCode,
        validation.mobileNumber
    ],
    employeesController.employeeRegistration);


// Employee otp verify
router.post('/verify',
    logReqData,
    [
        validation.otp
    ],
    employeesController.otpVerify);


// Employee pin create
router.post('/generatepin',
    logReqData,
    [
        validation.pin,
        validation.verifyPin
    ],
    employeesController.generatePin);


// Employee resend otp
router.post('/resend_otp',
    logReqData,
    [
        validation.mobileNumber
    ],
    employeesController.resendOtp);


// Employee forget request
router.post('/forgot_pin',
    logReqData,
    [
        validation.mobileNumber
    ],
    employeesController.forgotPinRequest);



// Employee otp verify forget pin request
router.post('/forgot_pin/verify',
    logReqData,
    [
        validation.otp
    ],
    employeesController.forgotPinOtpVerify);


// Employee reset pin 
router.post('/forgot_pin/reset_pin',
    logReqData,
    [
        validation.pin,
        validation.verifyPin
    ],
    employeesController.resetPin);



// Employee bank details
router.get('/bankdetails',
    logReqData,
    auth,
    permit([enumValue.employeeRoleId]),
    logTokenData,
    employeesController.bankDetails);


// Employee verify details
router.post('/verifybankdetail',
    logReqData,
    [
        validation.status
    ],
    auth,
    permit([enumValue.employeeRoleId]),
    logTokenData,
    employeesController.verifyBankDetail);


// Employee selfie 
router.post('/takeselfie',
    logReqData,
    auth,
    permit([enumValue.employeeRoleId]),
    logTokenData,
    employeesController.takeSelfie);


// Employee profile 
router.get('/employeeprofile',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId, enumValue.employeeRoleId]),
    logTokenData,
    employeesController.employeeProfile);


// Employee change pin 
router.post('/changepin',
    logReqData,
    [
        validation.oldPin,
        validation.newPin,
        validation.verifyPin
    ],
    auth,
    permit([enumValue.employeeRoleId]),
    logTokenData,
    employeesController.changePin);


// Employee profile 
router.post('/employeeprofile',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId, enumValue.employeeRoleId]),
    logTokenData,
    employeesController.employeeProfile);


// Csv upload
router.post('/csvupload',
    logReqData,
    [
        validation.workShift,
        validation.companyId
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    employeesController.employeeCsvUpload);


// Work shift update
router.put('/workshiftnameupdate',
    logReqData,
    [
        validation.workShiftId,
        validation.userId,
        validation.shiftName,
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    employeesController.workShiftUpdate);



// Manual employee registration process
router.post('/manual_employee_registration',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    employeesController.manualEmployeeRegistration);


// Module exports
module.exports = router;