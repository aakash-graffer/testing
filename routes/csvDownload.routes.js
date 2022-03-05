const router = require('express').Router();
const bodyParser = require('body-parser');

const validation = require('../core/validation');
const csvDownloadController = require('../controllers/csvDownload.controller');
const auth = require('../core/auth');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');


// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));


// Rupyo admin csv download 
router.post('/rupyo_admin',
    logReqData,
    auth,
    logTokenData,
    csvDownloadController.rupyoAdminCsv);


// Employer csv download 
router.post('/employer',
    logReqData,
    auth,
    logTokenData,
    csvDownloadController.employerCsv);


// Employee csv download 
router.post('/employee',
    logReqData,
    auth,
    logTokenData,
    csvDownloadController.employeeCsv);


// Transaction  csv download 
router.post('/transaction',
    logReqData,
    auth,
    logTokenData,
    csvDownloadController.transactionsCsv);


// Attendance  csv download 
router.post('/attendance',
    logReqData,
    auth,
    logTokenData,
    csvDownloadController.attendanceCsv);


// Module exports
module.exports = router