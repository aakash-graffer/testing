const router = require('express').Router();
const bodyParser = require('body-parser');
const { check } = require('express-validator');
const permit = require('../core/authorization');
const { enumValue } = require('../core/utility');

const monthlyAttendanceController = require('../controllers/monthlyAttendance.controller');
const auth = require('../core/auth');
const validation = require('../core/validation');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// Show monthly attendance
router.get('/list',
    logReqData,
    [
        validation.yearNum,
        validation.monthNum
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId, enumValue.employeeRoleId]),
    logTokenData,
    monthlyAttendanceController.showMonthlyAttendance);

// Module exports
module.exports = router