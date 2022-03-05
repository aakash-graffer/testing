const { check, body } = require('express-validator');
const { checkGender, checkBankAccountType } = require('./utility');

// Module exports
module.exports = {

  firstName: check('first_name').not().isEmpty().trim().isLength({max:100}).withMessage('Maximum length must be 100.').custom((value) => {
    return value.match(/^[A-Za-z0-9]+$/);
  }).withMessage('First name is required'),
  lastName: check('last_name').not().isEmpty().trim().isLength({max:100}).withMessage('Maximum length must be 100.').custom((value) => {
    return value.match(/^[A-Za-z0-9]+$/);
  }).withMessage('Last name is required'),
  middleName: check('middle_name').trim().isLength({max:100}).withMessage('Maximum length must be 100.'),
  companyId: check('company_id').not().isEmpty().trim().withMessage('Company id is required'),
  companyName: check('company_name').not().isEmpty().trim().not().isNumeric().withMessage('Company name is required').isLength({max:200}).withMessage('Maximum length must be 200.'),
  aadharCard: check('aadhar_card').not().isEmpty().trim().withMessage('Aadhar card number is required').isNumeric().withMessage('Invalid aadhar card number').isLength({ min: 12, max: 12 }).withMessage('Invalid aadhar card number'),
  gst_number: check('gst_number').not().isEmpty().trim().withMessage('GST Number is required').isAlphanumeric().isLength({max:15}).withMessage('Maximum length must be 15.'),
  incorporation_date: check('incorporation_date').not().isEmpty().trim().withMessage('Incorporation Date is required'),
  gurantor_name: check('gurantor_name').not().isEmpty().trim().withMessage('Gurantor Name is required').isLength({max:200}).withMessage('Maximum length must be 200.'),
  dob: check('dob').not().isEmpty().trim().withMessage('DOB is required'),
  father_mother_name: check('father_mother_name').not().isEmpty().trim().withMessage('Father/Mother is required').isLength({max:100}).withMessage('Maximum length must be 100.'),
  gender: check('gender').not().isEmpty().trim().withMessage('Gender is required').custom((value, { req }) => checkGender(value)).withMessage('Invalid gender.'),

  address_1: check('address_1').trim().isLength({max:250}).withMessage('Maximum length must be 250.'),
  address_2: check('address_2').trim().isLength({max:250}).withMessage('Maximum length must be 250.'),
  pinCode: check('pincode').not().isEmpty().withMessage('Pincode is required').trim().isNumeric().withMessage('Invalid Pin code'),
  city: check('city').not().isEmpty().trim().withMessage('City is required'),
  state: check('state').not().isEmpty().trim().isLength({ min: 2 }).withMessage('State is required'),
  country: check('country').not().isEmpty().trim().withMessage('Country is required'),
  creditLimit: check('rupyo_credit_limit').not().isEmpty().trim().withMessage('Rupyo credit limit is required'),

  workShift: check('work_shift_id').not().isEmpty().trim().withMessage('Work shift is required'),
  employeeType: check('employee_type').not().isEmpty().trim().withMessage('Employee type is required'),
  employeeIdGenerationMethod: check('employee_id_generation_method').not().isEmpty().trim().withMessage('Employee id generation method is required'),
  rupyoCreditLimit: check('rupyo_credit_limit').trim(),
  salaryCycle: check('salary_cycle').trim(),
  basicSalary: check('basic_salary').trim(),
  deductions: check('deductions').trim(),
  openingBalance: check('opening_balance').trim(),
  bankName: check('bank_name').not().isEmpty().trim().isString().isLength({ min: 2, max: 100 }).withMessage('Bank name is required'),
  branch_name: check('branch_name').not().isEmpty().trim().isString().withMessage('Branch Name is required'),
  nameInBank: check('name_in_bank').not().isEmpty().trim().isString().withMessage('Employee name in bank is required').isLength({max:100}).withMessage('Maximum length must be 100.'),
  accountNumber: check('account_number').not().isEmpty().trim().withMessage('Account number is required').isNumeric().isLength({max: 50 }).withMessage('Invalid account number'),
  bankAccountType: check('bank_account_type').not().isEmpty().trim().withMessage('Bank account type is required').custom((value, { req }) => checkBankAccountType(value)).withMessage('Invalid Bank Account Type.'),
  ifscCode: check('ifsc_code').not().isEmpty().trim().withMessage('IFSC code is required').isAlphanumeric().isLength({ min: 11, max: 11 }).withMessage('Invalid IFSC code'),
  // .custom((value) => {
  //   // IFSC code validation
  //   return value.match(/^[A-Z]{4}0[A-Z0-9]{6}$/);
  // })
  // .withMessage('Ifsc code is required'),
  panCard: check('pan_card').not().isEmpty().trim().isLength(10).custom((value) => {

    // Pan card validation
    return value.match(/^([a-zA-Z]){5}([0-9]){4}([a-zA-Z]){1}?$/);
  }).withMessage('Pancard is required'),
  companyCin: check('company_cin').not().isEmpty().withMessage('Company CIN or Partnership Id is required').trim().isLength({max:21}).withMessage('Maximum length must be 21.'),
  rocType: check('roc_type').not().isEmpty().withMessage('Please select company type'),
  email: check('email').isEmail().normalizeEmail().withMessage('Email is required').isLength({max:100}).withMessage('Maximum length must be 100.'),
  mobileNumber: check('mobile_number').not().isEmpty().withMessage('Mobile number is required')
    .trim().isNumeric().withMessage('Only digit').isLength(10).withMessage('Mobile number must be ten digit'),
  mobileNumberString: check('mobile_number').not().isEmpty().withMessage('Mobile number is required')
    .trim().isLength(10).withMessage('Mobile number must be ten digit'),
  password: check('password').not().isEmpty().trim().isLength({ min: 8, max: 20 }).withMessage('Password is required'),
  newPassword: check('new_password').not().isEmpty().trim().isLength({ min: 8, max: 20 }).withMessage('New password is required'),
  confirmPassword: check('confirm_password').not().isEmpty().trim().isLength({ min: 8, max: 20 }).withMessage('Confirm password is required'),
  companyCode: check('company_code').not().isEmpty().withMessage('Company code required').trim().isLength(8).withMessage('Company code must be eight digit'),
  userId: check('user_id').not().isEmpty().trim().withMessage('User id is required'),
  arrayUserId: check('user_id').not().isEmpty().withMessage('User id array is required'),
  pin: check('pin').not().isEmpty().withMessage('Pin is required').trim().isLength({ min: 4, max: 4 }).withMessage('Pin must be four digit'),
  newPin: check('new_pin').not().isEmpty().withMessage('New pin is required').trim().isLength({ min: 4, max: 4 }).withMessage('New pin must be four digit'),
  verifyPin: check('verify_pin').not().isEmpty().withMessage('Verify pin is required').trim().isNumeric().isLength({ min: 4, max: 4 }).withMessage('Verify pin must be four digit'),
  oldPin: check('old_pin').not().isEmpty().withMessage('Old pin is required').trim().isNumeric().isLength({ min: 4, max: 4 }).withMessage('Old pin must be four digit'),
  employeeId: check('employee_id').not().isEmpty().trim().withMessage('Employee id is required'),
  employeesId: check('employee_id').trim(),
  verificationStatus: check('verificationstatus').trim().isNumeric(),
  verificationsStatus: check('verifications_status').trim().isNumeric(),
  selfie: check('selfie').not().isEmpty().trim().withMessage('Selfie is required'),
  otp: check('otp').not().isEmpty().withMessage('OTP is required').trim().isNumeric().isLength(6).withMessage('OTP must be six digit'),
  shiftName: check('shift_name').not().isEmpty().trim().withMessage('Shift name is required'),
  workShiftId: check('workshift_id').not().isEmpty().trim().withMessage('Work shift id is required'),
  resourceType: check('resource_type').not().isEmpty().trim().isNumeric().withMessage('Resource type is required'),
  message: check('message').not().isEmpty().trim().isLength({ max: 1000 }).withMessage('Message is required'),
  status: check('status').not().isEmpty().trim().isNumeric().withMessage('Status is required'),
  setPayoutLimit: check('set_payout_limit').trim(),
  companySize: check('company_size').not().isEmpty().trim().isNumeric().withMessage('Company size is required'),
  employerEmail: check('employer_email').isEmail().normalizeEmail().withMessage('Employer email is required'),
  jobTitle: check('job_title').not().isEmpty().trim().withMessage('Job title is required'),
  phoneNumber: check('phone_number').not().isEmpty().withMessage('Mobile number is required').trim().isNumeric().isLength(10).withMessage('Mobile number must be ten digit'),
  workEmail: check('work_email').isEmail().normalizeEmail().withMessage('Work email is required'),
  year: check('year').not().isEmpty().trim().withMessage('Year is required'),
  month: check('month').not().isEmpty().trim().withMessage('Month is required'),
  shiftEndTime: check('shift_end_time').not().isEmpty().trim().withMessage('Shift end time is required'),
  shiftStartTime: check('shift_start_time').not().isEmpty().trim().withMessage('Shift start time is required'),
  searchName: check('search_name').trim(),
  howYouAre: check('how_you_are').not().isEmpty().trim().withMessage('How you are is required'),
  designation: check('designation').not().isEmpty().trim().withMessage('Designation is required'),
  typeOf: check('type_of').not().isEmpty().trim().withMessage('Type of is required'),
  amount: check('amount').not().isEmpty().withMessage('Please add amount').trim().isFloat({ min: 1 }).withMessage('Please enter valid amount'),
  yearNum: check('year').trim().isInt({ min: 2020, max: 2050 }).withMessage('Enter valid year'),
  monthNum: check('month').trim().isInt({ min: 1, max: 12 }).withMessage('Enter valid month'),
  notificationsId: check('notifications_id').not().isEmpty().trim().withMessage('Enter valid notifications id'),
  requestId: check('request_id').not().isEmpty().trim().withMessage('Enter valid request id'),
  requestType: check('request_type').not().isEmpty().trim().withMessage('Enter valid request type'),
  details: check('details').not().isEmpty().trim().withMessage('Enter valid details').isLength({ min: 1, max: 500 }).withMessage('Maximum message length should be 500 character'),
  Id: check('id').not().isEmpty().trim().withMessage('Enter valid notifications id'),
  key: check('s3_key').not().isEmpty().trim().withMessage('Enter valid s3 key'),

  // Csv file validtion
  csvBook: check('csv_book').not().isEmpty().withMessage('Csv file is required'),

  // Array value validation 
  _employeesId: body('employee_id', 'employee_id is required!').if((value, { req }) => req.body.employee_id !== "false").isArray().notEmpty(),
  employerId: body('_id', '_id is required!').if((value, { req }) => req.body._id !== "false").isArray().notEmpty(),
  rupyoAdminId: body('user_id', 'user_id is required!').if((value, { req }) => req.body.user_id !== "false").isArray().notEmpty(),
  notificationId: body('notifications_id', 'notifications_id is required!').if((value, { req }) => req.body.notifications_id !== "false").isArray().notEmpty(),
  enquiriesId: body('enquiries_id', 'enquiries_id is required!').if((value, { req }) => req.body.enquiries_id !== "false").isArray().notEmpty(),

  percentNum: check('percent').trim().isInt({ min: 0, max: 100 }).withMessage('Enter valid percentage'),
}