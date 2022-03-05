// Init code
const router = require('express').Router();

const bodyParser = require('body-parser');
const serviceController = require('../controllers/service.controller');
const auth = require('../core/auth');
const permit = require('../core/authorization');
const { enumValue } = require('../core/utility');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');


// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));


// Send SMS
router.post('/sendsms',
    logReqData,
    serviceController.send_SMS);


router.get('/get_file_token',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId, enumValue.employeeRoleId]),
    logTokenData,
    serviceController.authenticateAppForFiles);


router.get('/cloudfront_url',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId, enumValue.employeeRoleId]),
    logTokenData,
    serviceController.cloudfrontUrl);


// Send Email
router.post('/sendemail',
    logReqData,
    serviceController.send_Email);

// Module exports
module.exports = router;