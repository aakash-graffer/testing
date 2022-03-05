// Init code
const router = require('express').Router();
const bodyParser = require('body-parser');

const reportController = require('../controllers/report.controller');
const auth = require('../core/auth');
const permit = require('../core/authorization');
const { enumValue } = require('../core/utility');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');


// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));


// Employee status report in employee list
router.get('/employee_status_report',
    logReqData,
    reportController.employeeStatusReport);


// Rupyo admin All Employers settlement report (RUP-64/RUP-72)
router.post('/employer_settlement',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    reportController.employerSettleMentReport);



// All Employees that have taken Payout from Rupyo (RUP-65/RUP-71)
router.post('/employee_payout_report',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    reportController.employeePayOutReport);



// All Employees that have taken Payout from Rupyo (Employer wise) report
router.get('/company_wise_payout_report',
    logReqData,
    reportController.companyWisePayoutReport);

// Pratik code
router.get('/company_wise_payout_report_testing',
    logReqData,
    reportController.companyWisePayoutReportTesting);


// Employees report (Employer wise)
router.get('/company_wise_employee_report',
    logReqData,
    reportController.companyWiseEmployeeReport);



// Module exports
module.exports = router
