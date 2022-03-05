const router = require('express').Router();
const bodyParser = require('body-parser');

const validation = require('../core/validation');
const attendanceController = require('../controllers/attendance.controller');
const auth = require('../core/auth');
const permit = require('../core/authorization');
const { enumValue } = require('../core/utility');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');


// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// Punch in and punch out
router.post('/punchin',
    logReqData,
    auth,
    permit([enumValue.employeeRoleId]),
    logTokenData,
    attendanceController.punchIn);


// Attendance list
router.post('/list',
    logReqData,
    [
        validation.searchName
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId, enumValue.employeeRoleId]),
    logTokenData,
    attendanceController.attendanceList);



// Edit employee attendance status
router.post('/editattendance',
    logReqData,
    auth,
    permit(([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId])),
    logTokenData,
    attendanceController.editAttendance);



// Module exports
module.exports = router