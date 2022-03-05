// Init code
const router = require('express').Router();
const path = require('path');

const bodyParser = require('body-parser');

const settlementController = require('../controllers/settlement.controller');
const validation = require('../core/validation')
const auth = require('../core/auth');
const permit = require('../core/authorization');
const { enumValue } = require('../core/utility');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');


// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));


// Generate settlement report by employer
router.post('/generate',
   logReqData,
   [
      validation.companyId
   ],
   auth,
   permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
   logTokenData,
   settlementController.generateSettlement);


// List all settlement
router.post('/list',
   logReqData,
   auth,
   permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
   logTokenData,
   settlementController.settlementList);


// Update settlement request
router.post("/update",
   logReqData,
   auth,
   permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
   logTokenData,
   settlementController.updateSettlement);


// Employer settlement details (by settlement id)
router.post('/settlement_details',
   logReqData,
   auth,
   permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
   logTokenData,
   settlementController.settlementDetails);


// Module exports
module.exports = router