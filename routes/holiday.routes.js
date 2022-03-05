const router = require('express').Router();
const bodyParser = require('body-parser');

const holidayController = require('../controllers/holiday.controller');
const validation = require('../core/validation');
const auth = require('../core/auth');
const permit = require('../core/authorization');
const { enumValue } = require('../core/utility');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');


// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));


// Add holiday
router.post('/add_holiday',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    holidayController.addHoliday);


// Holiday list
router.post('/list',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    holidayController.holidayList);


// Delete holiday
router.post('/delete',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    holidayController.deleteHoliday);



// Module exports
module.exports = router