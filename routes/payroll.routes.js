const router = require('express').Router();
const bodyParser = require('body-parser');

const validation = require('../core/validation');
const payrollController = require('../controllers/payroll.controller');
const auth = require('../core/auth');
const permit = require('../core/authorization');
const { enumValue } = require('../core/utility');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');


// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));


// Show payroll details
router.get('/show',
    logReqData,
    auth,
    permit([enumValue.employeeRoleId]),
    logTokenData,
    payrollController.showPayroll);
    

// Module exports
module.exports = router