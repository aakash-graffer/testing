// Init code
const router = require('express').Router();

const bodyParser = require('body-parser');
const validation = require('../core/validation');
const auth = require('../core/auth');
const transactionController = require('../controllers/transaction.controller');
const permit = require('../core/authorization');
const { enumValue } = require('../core/utility');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');


// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));


// Employee payout request
router.post('/payoutrequest',
  logReqData,
  [
    validation.amount
  ],
  auth,
  permit([enumValue.employeeRoleId]),
  logTokenData,
  transactionController.payoutRequest);


// Employees transactions list
router.post('/list',
  logReqData,
  auth,
  permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
  logTokenData,
  transactionController.transactionsList);


// Employees transaction details (by payout request id)
router.post('/transaction_details',
  logReqData,
  auth,
  permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
  logTokenData,
  transactionController.transactionDetails);


// Employee transactions list (Mobile application)
router.get('/employeetransactions',
  logReqData,
  auth,
  permit([enumValue.employeeRoleId]),
  logTokenData,
  transactionController.employeeTransactions);


// Update payout request
router.post('/updatetransaction',
  logReqData,
  auth,
  permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId]),
  logTokenData,
  transactionController.updateTransaction);

  // Employees transactions list
router.post('/listbyid',
logReqData,
auth,
permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
logTokenData,
transactionController.listById);


// Module exports
module.exports = router;