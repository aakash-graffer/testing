const routes = require('express').Router();
const bodyParser = require('body-parser');

const validation = require('../core/validation');
const histroyController = require('../controllers/histroy.controller');
const auth = require('../core/auth');
const router = require('./attendance.routes');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');

// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));


// Update company name multiple collection
router.post('/updatecompanyname',
    logReqData,
    [
        // Validation check
        validation.companyId,
        validation.companyName
    ],
    auth,
    logTokenData,
    histroyController.updateCompanyName);


// Update first name and last name multiple collection
router.post('/updatefullname',
    logReqData
    [
    // Validation check
    validation.userId,
    validation.firstName,
    validation.lastName

    ],
    auth,
    logTokenData,
    histroyController.updateFullName);


// Module exports
module.exports = router