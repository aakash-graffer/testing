const enumValue = require('enum');

// Define an enum with own values
// Employee type
const employeeType = new enumValue({
    'full_time': 1,
    'part_time': 2,
    'daily': 3,
    'weekly': 4
}, { ignoreCase: true });


// Verifications status
const verificationStatus = new enumValue({
    'new_register': 0,
    'otp_verify': 1,
    'pin': 2,
    'check_bank_details': 3,
    'selfie': 4,
    'login': 5
}, { ignoreCase: true });


// All status
const status = new enumValue({
    'active': 1,
    'deactive': 2,
    'pause': 3,
    'archive': 4,
    'correct': 5,
    'not_correct': 6,
    'present': 7,
    'absent': 8,
    'half_day': 9,
    'leave': 10,
    'pending': 11,
    'approved': 12,
    'credited': 13,
    'rejected': 14,
    'hold': 15,
    'request': 16,
    'account': 17,
    'resolved': 18,
    'generated': 19,
    'paid': 20,
    'missed_punch': 21,
    'partial_paid': 22,
    'paid_holiday': 23,
    'unpaid_holiday': 24,
    'weekly_off': 25,

}, { ignoreCase: true });


// Role id
const roleId = new enumValue({
    'rupyo_admin': 1,
    'employer': 2,
    'employee': 3,
    'super_admin':4
}, { ignoreCase: true });


// Resource type
const resourceType = new enumValue({
    'bank_detail': 1,
    'credit_limit': 2,
    'account_status': 3,
    'payout': 4,
    'attendance': 5,
    'request': 6,
    'transaction': 7,
    'forgot_password': 8,
    'enquiries': 9,
    'administration': 10,
    'approved': 12,
    'rejected': 13,
    'hold': 14,
    'account': 15,
    'credit_limit_request': 16,
    'account_create': 17,
    'change_password': 18,
    'pause': 19,
    'deactive': 20,
    'settlement': 21
}, { ignoreCase: true });


// Employee generation method
const employeeIdGenerationMethod = new enumValue({
    'random_generate': 1,
    'user_create': 2,
}, { ignoreCase: true });


// String format
const stringFormat = new enumValue({
    'base_64': 'base64',
    'utf_8': 'utf8',
    'base_32': 'base32'
}, { ignoreCase: true });


// Logger module name
const loggerModuleName = new enumValue({
    'rupyo_admin': 1,
    'employer': 2,
    'employee': 3,
    'attendance': 4,
    'transaction': 5,
    'notification': 6,
    'enquiry': 7,
    'work_shift': 8,
    'report': 9,
    'history': 10,
    'scheduler': 11,
    'request': 12
}, { ignoreCase: true });


// Filter by duration
const filterByDuration = new enumValue({
    'this_month': 0,
    'last_month': 1,
    'last_year': 2,
    'last_three_months': 3,
    'this_year': 4
});


// Sort by 
const sortBy = new enumValue({
    'ascending': 1,
    'dascending': -1
}, { ignoreCase: true });


// Attendance filter
const attendanceFilter = new enumValue({
    "today": 1,
    "last_week": 2,
    "this_month": 3,
    "last_month": 4,
    "this_year": 5,
    "last_year": 6,
    "this_week": 7,
    "last_three_months": 8,
}, { ignoreCase: true });


// Weekly holi day
const weeklyHoliday = new enumValue({
    "Monday": 1,
    "Tuesday": 2,
    "Wednesday": 3,
    "Thursday": 4,
    "Friday": 5,
    "Saturday": 6,
    "Sunday": 7
}, { ignoreCase: true });


// Rupyo credit limit
const rupyoCreditLimit = new enumValue({
    'fix_amount': 1,
    'percent_base': 2
}, { ignoreCase: true });


// Push notification type
const pushNotificationType = new enumValue({

    'BANK_DETAILS_UPDATED': 1,
}, { ignoreCase: true });


// Company CIN Partnership firm type
const rocType = new enumValue({
    'company_cin': 1,
    'partnership_firm_company_id': 2
})


// Employer credit limit type for its employee
const employerCreditLimitType = new enumValue({
    'day_wise': 1,
    'month_wise': 2
})

// Module exports multiple
module.exports = {
    employeeType,
    verificationStatus,
    status,
    roleId,
    sortBy,
    resourceType,
    stringFormat,
    loggerModuleName,
    filterByDuration,
    attendanceFilter,
    employeeIdGenerationMethod,
    weeklyHoliday,
    rupyoCreditLimit,
    pushNotificationType,
    rocType,
    employerCreditLimitType
};