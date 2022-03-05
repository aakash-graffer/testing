
// Init code
const router = require('express').Router();
const bodyParser = require('body-parser');

const auth = require('../core/auth');
const validation = require('../core/validation');
const notificationController = require('../controllers/notifications.controller');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');
const { enumValue } = require('../core/utility');
const permit = require('../core/authorization');

// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));



// Create notifications 
router.post('/createnotification',
    logReqData,
    [
        // Check not empty fields
        validation.userId,
        validation.firstName,
        validation.lastName,
        validation.middleName,
        validation.companyId,
        validation.companyName,
        validation.resourceType,
        validation.message,
        validation.status
    ],
    auth,
    logTokenData,
    notificationController.createNotification);


// Update notifications
router.put('/upadtenotification',
    logReqData,
    [
        // Check not empty fields
        validation.userId
    ],
    auth,
    logTokenData,
    notificationController.updateNotification);


// Update notifications status
router.post('/updatestatus',
    logReqData,
    [
        // Check not empty fields
        validation.notificationId
    ],
    auth,
    logTokenData,
    notificationController.updateStatus);



// Get notifications count
router.get('/notifications_count',
    logReqData,
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId]),
    logTokenData,
    notificationController.getNotificationsCount);


// Notifications for employee (with filter)
router.get('/employeefilternotification',
    logReqData,
    auth,
    permit([enumValue.employeeRoleId]),
    logTokenData,
    notificationController.employeeFilterNotification);


// Notifications for rupyo admin and employer (with filter)
router.post('/filternotification',
    logReqData,
    auth,
    logTokenData,
    notificationController.filterList);


// Employer  and rupyo admin filter notifications
router.post('/employees/mark_read',
    logReqData,
    [
        // Check not empty fields
        validation.Id
    ],
    auth,
    permit([enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId, enumValue.employeeRoleId]),
    logTokenData,
    notificationController.readNotificationsMark);


// Module exports
module.exports = router