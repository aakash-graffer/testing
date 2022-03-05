const router = require('express').Router();
const bodyParser = require('body-parser');

const auth = require('../core/auth');
const validation = require('../core/validation');
const workshiftController = require('../controllers/workshift.controller');
const permit = require('../core/authorization');
const { enumValue } = require('../core/utility');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');


// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.text({ type: 'text/plain' }));

// Create workshift
router.post('/createworkshift',
    logReqData,
    [
        // Check not empty fields
        validation.companyId,
        validation.shiftName,
        validation.shiftEndTime,
        validation.shiftStartTime
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    workshiftController.save);


// Workshift list
router.post('/workshiftlist',
    logReqData,
    [
        // Check validation
        validation.searchName
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    workshiftController.list);


// Workshift find
router.post('/find',
    logReqData,
    [
        // Check not empty fields
        validation.workShiftId
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    workshiftController.find);


// Workshift update status
router.post('/updatestatus',
    logReqData,
    [
        // Check not empty fields
        validation.workShiftId
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    workshiftController.updateStatus);


// Workshift update
router.post('/workshiftupdate',
    logReqData,
    [
        // Check not empty fields
        validation.workShiftId
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    workshiftController.workshiftUpdate);



//  Find  Workshift by company id
router.post('/findworkshiftbycompanyid',
    logReqData,
    [
        // Check not empty fields
        validation.companyId
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    workshiftController.findWorkshiftByCompanyId);



// Module exports
module.exports = router;