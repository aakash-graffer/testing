const router = require('express').Router();
const path = require('path');
const bodyParser = require('body-parser');

const validation = require('../core/validation');
const auth = require('../core/auth');
const permit = require('../core/authorization');
const { enumValue } = require('../core/utility');
const requestController = require('../controllers/request.controller');
const employerModel = require('../models/employer.model');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');

// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));


// Create request
router.post('/save',
    logReqData,
    [
        // Check not empty fields
        validation.requestType,
        validation.details,
    ],
    auth,
    permit([enumValue.employerRoleId, enumValue.employeeRoleId]),
    logTokenData,
    requestController.requestSave);



// Requests list
router.post('/list',
    logReqData,
    [
        // Check validation
        validation.searchName
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.employerRoleId, enumValue.rupyoAdminRoleId]),
    logTokenData,
    requestController.requestsList);


// Request find
router.post('/find',
    logReqData,
    [
        // Check not empty fields
        validation.requestId
    ],
    auth,
    logTokenData,
    requestController.requestFind);


// Request update status
router.post('/updatestatus',
    logReqData,
    [
        // Check not empty fields
        validation.requestId
    ],
    auth,
    logTokenData,
    requestController.updateStatus);


// Request update
router.put('/requestupdate',
    logReqData,
    [
        // Check not empty fields
        validation.requestId
    ],
    auth,
    logTokenData,
    requestController.requestUpdate);




// Immediate fire request
// // Create open shift for existing employer
// router.post('/update_fire',
//     auth,
//     permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId]),
//     employerModel.updateFire);


// Module exports
module.exports = router;
