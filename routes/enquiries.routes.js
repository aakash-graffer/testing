// Init code
const router = require('express').Router();

const bodyParser = require('body-parser');
const validation = require('../core/validation');
const enquiriesController = require('../controllers/enquiries.controller');
const auth = require('../core/auth');
const permit = require('../core/authorization');
const { enumValue } = require('../core/utility');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');


// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));


// Employer signup route
router.post('/save',
    logReqData,
    [
        // Check not empty fields
        validation.firstName,
        validation.companyName,
        validation.phoneNumber,
        validation.workEmail,
        validation.howYouAre,
        validation.designation,
        validation.typeOf

    ],
    enquiriesController.save);


// Employer signup request list
router.post('/list',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId]),
    logTokenData,
    enquiriesController.list);


// Employer update status
router.post('/updatestatus',
    logReqData,
    [
        // Check not empty fields 
        validation.status,
        validation.enquiriesId

    ], auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId]),
    logTokenData,
    enquiriesController.updateStatus);



// Module exports
module.exports = router;