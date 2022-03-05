// Init code
const router = require('express').Router();
const path = require('path');

const bodyParser = require('body-parser');
const multer = require('multer');

const userController = require('../controllers/user.controller');
const validation = require('../core/validation');
const auth = require('../core/auth');
const permit = require('../core/authorization');
const { enumValue } = require('../core/utility');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');

// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));


// Routes
// User login
router.post('/login',
    logReqData,
    [
        // Check correct email and not empty fields
        validation.email,
        validation.password
    ],
    userController.login);



// Create Rupyo Admin
router.post('/createrupyoadmin',
    logReqData,
    [
        // Check correct email and not empty fields
        validation.firstName,
        validation.lastName,
        validation.email,
        validation.password,
        validation.mobileNumber,
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId]),
    logTokenData,
    userController.createRupyoAdmin);


// Rupyo Admin list
router.post('/rupyoadminlist',
    logReqData,
    [
        // Check validation
        validation.searchName
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId]),
    logTokenData,
    userController.rupyoAdminList);


// Find Rupyo admin
router.post('/findrupyoadmin',
    logReqData,
    [
        validation.userId
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId]),
    logTokenData,
    userController.findRupyoAdmin);


// Update rupyo admin
router.put('/updaterupyoadmin',
    logReqData,
    [
        validation.userId
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId]),
    logTokenData,
    userController.updateRupyoAdmin);

// Delete rupyo admin 
router.post('/updatestatus',
    logReqData,
    [
        validation.status,
        validation.rupyoAdminId
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId]),
    logTokenData,
    userController.updateStatus);


// Change password 
router.post('/changepassword',
    logReqData,
    [
        validation.password,
        validation.newPassword,
        validation.confirmPassword
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId]),
    logTokenData,
    userController.changePassword);




// Rupyo admin and employer change password request
router.post('/change_password_request',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    userController.changePasswordRequest);




// Rupyo admin and employer OTP verification
router.post('/change_password_otp_verification',
    logReqData,
    [
        validation.otp
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    userController.changePasswordOtpVerification);




// Rupyo admin and employer resend OTP
router.post('/resend_otp',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    userController.resendOtp);




// Rupyo admin and employer change password
router.post('/rupyo_admin_change_password',
    logReqData,
    [
        // validation.otp,
        validation.password,
        validation.newPassword,
        validation.confirmPassword
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    userController.userChangePassword);



// Generate new password 
router.post('/generate_password',
    logReqData,
    [
        validation.email
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId]),
    logTokenData,
    userController.generatePassword);



// Rupyo admin  dashboard
router.post('/dashboard',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId]),
    logTokenData,
    userController.rupyoAdminDashBoard);


// User s3 key  store
router.post('/s3_key',
    logReqData,
    [
        // validation.key,
        validation.key
    ],
    auth,
    logTokenData,
    userController.keyStore);



// Update payout approve, credit access for rupyo admin
router.post('/payout_approve_credit_access',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId]),
    logTokenData,
    userController.payoutApproveCreditAccess);



// Module exports
module.exports = router