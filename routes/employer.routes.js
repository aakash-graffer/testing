const router = require('express').Router();
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');

const validation = require('../core/validation');
const employerController = require('../controllers/employer.controller');
const auth = require('../core/auth');
const permit = require('../core/authorization');
const { enumValue } = require('../core/utility');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');

// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));


// Multer configuration for company logo
let Storage = multer.diskStorage({
    destination: 'public/company_logos',
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    }
});

let FileFilter = (req, file, cb) => {
    if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png') {
        cb(null, true);
    }
    else {
        cb(null, false);
    }
};

let imageUpload = multer({ storage: Storage, fileFilter: FileFilter }).single('company_logo');


// create employer
router.post('/createemployer',
    logReqData,
    imageUpload,
    // Check validation
    [
        validation.firstName,
        validation.middleName,
        validation.lastName,
        validation.email,
        validation.password,
        validation.mobileNumber,
        validation.companyCin,
        validation.rocType,
        validation.companyName,
        validation.address_1,
        validation.address_2,
        validation.pinCode,
        validation.city,
        validation.state,
        validation.country,
        validation.setPayoutLimit,
        validation.employeeIdGenerationMethod,
        validation.rupyoCreditLimit,
        validation.bankName,
        validation.accountNumber,
        validation.ifscCode,
        validation.panCard,
        validation.gst_number,
        validation.gurantor_name,
        validation.incorporation_date,
        validation.branch_name,
        validation.bankAccountType
        
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    employerController.createEmployer);


// Employers list
router.post('/employerslist',
    logReqData,
    [
        // Check validation
        validation.searchName
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId]),
    logTokenData,
    employerController.employersList);


// Get employer
router.post('/getemployer',
    logReqData,
    [
        validation.userId
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    employerController.getEmployer);


// Change employer status
router.post('/changestatus',
    logReqData,
    [
        validation.status,
        validation.arrayUserId
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId]),
    logTokenData,
    employerController.changeStatus);


// Employer forgot password request to rupyo admin
router.post('/forgotpasswordrequest',
    logReqData,
    [
        validation.email
    ],
    employerController.forgotPasswordRequest);


// Employer forgot password (change by rupyo admin)
router.post('/forgotpassword',
    logReqData,
    [
        validation.email
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId]),
    logTokenData,
    employerController.forgotPassword);


// Credit limit update request
router.post('/creditlimit/request',
    logReqData,
    [
        validation.creditLimit
    ],
    auth,
    permit([enumValue.employerRoleId]),
    logTokenData,
    employerController.creditLimitRequest);


// Change credit limit
router.post('/changecreditlimit',
    logReqData,
    [
        validation.companyId,
        validation.creditLimit
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId]),
    logTokenData,
    employerController.changeCreditLimit);


// Company name and Id
router.get('/companyname',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    employerController.companyName);


// Employer  dashboard
router.post('/dashboard',
    logReqData,
    auth,
    permit([enumValue.employerRoleId]),
    logTokenData,
    employerController.employerDashboard);


// Employer profile dashboard
router.post('/profile',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    employerController.employerProfile);



// Csv upload
router.post('/csvupload',
    logReqData,
    auth,
    logTokenData,
    employerController.employerCsvUpload);


// Get next month transaction_charge_setting and employee_credit_limit_setting
router.post('/next_month_changes',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    employerController.employerNextMonthChanges);



// Module exports
module.exports = router;