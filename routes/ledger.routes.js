const routes = require('express').Router();
const bodyParser = require('body-parser');

const validation = require('../core/validation');
const ledgerController = require('../controllers/ledger.controller');
const auth = require('../core/auth');
const router = require('./attendance.routes');
const permit = require('../core/authorization');
const { enumValue } = require('../core/utility');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');

// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));


// Ledger payout
router.post('/payout',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    ledgerController.payout);


    
// Ledger settlement
router.post('/settlement',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    ledgerController.settlementLedger);



// Ledger employee payout
router.post('/employee_payout',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    ledgerController.employeePayoutLedger);



// Ledger employer payout
router.post('/employer_payout',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    ledgerController.employerPayoutLedger);



// Module exports
module.exports = router