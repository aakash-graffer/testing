const router = require('express').Router();
const bodyParser = require('body-parser');

const validation = require('../core/validation');
const schedulerController = require('../controllers/scheduler.controller');
const auth = require('../core/auth');
const { logReqData, logTokenData } = require('../core/loggerMiddleware');


// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));


// Punchin reminder employee list
// run in every hour
router.post('/missed_punchin_reminder',
    logReqData,
    schedulerController.missedPunchinReminder);


// Punchout reminder employee list
// run in every hour
router.post('/missed_punchout_reminder',
    logReqData,
    schedulerController.missedPunchoutReminder);


// Pause employee list
// run in every month end
router.post('/pause_employee_activation',
    logReqData,
    schedulerController.pauseEmployeeList);


// Total credit limit consume employee list
// run in every 12 hour
router.post('/consumed_credit_limit_notification',
    logReqData,
    schedulerController.creditLimitEmployeesList);


// Absent mark on not mark today attendance
// If user not punch in today then we marked as absent after shift end
// run in every hour
router.post('/attendance_mark_absents',
    logReqData,
    schedulerController.punchinMarkAbsents);


// Absent mark on not missed punch out
// If user not punch out today then we marked as absent after 3 hours of shift end
// run in every hour
router.post('/punchin_but_not_punchout_mark_absent',
    logReqData,
    schedulerController.punchinButNotPunchoutMarkAbsent);



// Reset employee monthly data
// run in every month end
router.post('/reset_employee_monthly_data',
    logReqData,
    schedulerController.resetEmployeeMonthlyData);



// Reset employers monthly data
// run in every month end
router.post('/reset_employer_monthly_data',
    logReqData,
    schedulerController.resetEmployerMonthlyData);



// Set holiday in attendance
// run everyday
router.post('/set_holiday',
    logReqData,
    schedulerController.setHoliday);



// Set weekly off in attendance
// run everyday
router.post('/set_weekly_off',
    logReqData,
    schedulerController.setWeeklyOff);



// Set employee credit limit if employer month setting is day wise
// run every first day of month
router.post('/set_employees_credit_limit',
    logReqData,
    schedulerController.setEmployeesCreditLimit);

// Employees transaction details (by payout request id)
router.post('/get_all_loan_application_status',
  logReqData,
  schedulerController.getAllLoanApplicationStatus);

// Get loan status by loan id
router.get('/get_loan_status',
    logReqData,
    schedulerController.getLoanData);

// Get loan status by loan id
router.post('/sent_loan_request',
    logReqData,
    schedulerController.sentLoanRequest);


// Module exports
module.exports = router