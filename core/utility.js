const nodeRsa = require('node-rsa');
const speakEasy = require("speakeasy");
const moment = require('moment');
const jwt = require('jsonwebtoken');
const _randomString = require('randomstring');
const _enum = require('./enum');

const { rupyoAdminLogger } = require('./rupyoAdminLogger');
const { employerLogger } = require('./employerLogger');
const { employeeLogger } = require('./employeeLogger');
const { attendanceLogger } = require('./attendanceLogger');
const { transactionLogger } = require('./transactionLogger');
const { notificationLogger } = require('./notificationLogger');
const { enquiryLogger } = require('./enquiryLogger');
const { workShiftLogger } = require('./workShiftLogger');
const { reportLogger } = require('./reportLogger');
const { historyLogger } = require('./historyLogger');
const { schedulerLogger } = require('./schedulerLogger');
const { logger } = require('./logger');

const privateKey = global.env.PRIVATEKEY;
const jwt_secret = global.env.JWT_SECRET;
const expireTime = global.env.EXPIRE_IN;


// Greater than 500 and multiple by 8
const key = new nodeRsa(privateKey);

let toDate = moment().utc().format("DD-MM-YYYY");


// Encryption bank_details
encryptData = (bankDetail) => {
    let _stringFormat = _enum.stringFormat.get('base_64').value;

    return {
        // partnership_firm_company_id: bankDetail.partnership_firm_company_id ? key.encrypt(bankDetail.partnership_firm_company_id, _stringFormat) : "",
        company_cin: bankDetail.company_cin ? key.encrypt(bankDetail.company_cin, _stringFormat) : "",
        pan_card: key.encrypt(bankDetail.pan_card, _stringFormat),
        bank_name: key.encrypt(bankDetail.bank_name, _stringFormat),
        account_number: key.encrypt(bankDetail.account_number, _stringFormat),
        ifsc_code: key.encrypt(bankDetail.ifsc_code, _stringFormat),
        branch_name: bankDetail.branch_name ? key.encrypt(bankDetail.branch_name, _stringFormat) : "",
        bank_account_type: bankDetail.bank_account_type ? key.encrypt(bankDetail.bank_account_type, _stringFormat) : "",
        name_in_bank: bankDetail.name_in_bank ? key.encrypt(bankDetail.name_in_bank, _stringFormat) : ""
    }
};


// Decryption bank_details
decryptData = (bankDetail) => {
    let _stringFormat = _enum.stringFormat.get('utf_8').value;

    return {
        // partnership_firm_company_id: bankDetail.partnership_firm_company_id ? key.decrypt(bankDetail.partnership_firm_company_id, _stringFormat) : "",
        company_cin: bankDetail.company_cin ? key.decrypt(bankDetail.company_cin, _stringFormat) : "",
        pan_card: bankDetail.pan_card ? key.decrypt(bankDetail.pan_card, _stringFormat) : "",
        bank_name: bankDetail.bank_name ? key.decrypt(bankDetail.bank_name, _stringFormat) : "",
        account_number: bankDetail.account_number ? key.decrypt(bankDetail.account_number, _stringFormat) : "",
        ifsc_code: bankDetail.ifsc_code ? key.decrypt(bankDetail.ifsc_code, _stringFormat) : "",
        branch_name: bankDetail.branch_name ? key.decrypt(bankDetail.branch_name, _stringFormat) : "",
        bank_account_type: bankDetail.bank_account_type ? key.decrypt(bankDetail.bank_account_type, _stringFormat) : "",
        name_in_bank: bankDetail.name_in_bank ? key.decrypt(bankDetail.name_in_bank, _stringFormat) : ""
    }
};


// Print logger
printLogger = (type, message, moduleName) => {

    let moduleEnum = _enum.loggerModuleName.get(moduleName); //.value;
    switch (type) {

        case 0:
            (moduleEnum == 1) ?
                rupyoAdminLogger.error(message) :
                (moduleEnum == 2) ?
                    employerLogger.error(message) :
                    (moduleEnum == 3) ?
                        employeeLogger.error(message) :
                        (moduleEnum == 4) ?
                            attendanceLogger.error(message) :
                            (moduleEnum == 5) ?
                                transactionLogger.error(message) :
                                (moduleEnum == 6) ?
                                    notificationLogger.error(message) :
                                    (moduleEnum == 7) ?
                                        enquiryLogger.error(message) :
                                        (moduleEnum == 8) ?
                                            workShiftLogger.error(message) :
                                            (moduleEnum == 9) ?
                                                reportLogger.error(message) :
                                                (moduleEnum == 10) ?
                                                    historyLogger.error(message) :
                                                    (moduleEnum == 11) ?
                                                        schedulerLogger.error(message) :
                                                        logger.error(message);
            break;

        case 1:
            (moduleEnum == 1) ?
                rupyoAdminLogger.warn(message) :
                (moduleEnum == 2) ?
                    employerLogger.warn(message) :
                    (moduleEnum == 3) ?
                        employeeLogger.warn(message) :
                        (moduleEnum == 4) ?
                            attendanceLogger.warn(message) :
                            (moduleEnum == 5) ?
                                transactionLogger.warn(message) :
                                (moduleEnum == 6) ?
                                    notificationLogger.warn(message) :
                                    (moduleEnum == 7) ?
                                        enquiryLogger.warn(message) :
                                        (moduleEnum == 8) ?
                                            workShiftLogger.warn(message) :
                                            (moduleEnum == 9) ?
                                                reportLogger.warn(message) :
                                                (moduleEnum == 10) ?
                                                    historyLogger.warn(message) :
                                                    (moduleEnum == 11) ?
                                                        schedulerLogger.warn(message) :
                                                        logger.warn(message);
            break;


        case 2:
            (moduleEnum == 1) ?
                rupyoAdminLogger.info(message) :
                (moduleEnum == 2) ?
                    employerLogger.info(message) :
                    (moduleEnum == 3) ?
                        employeeLogger.info(message) :
                        (moduleEnum == 4) ?
                            attendanceLogger.info(message) :
                            (moduleEnum == 5) ?
                                transactionLogger.info(message) :
                                (moduleEnum == 6) ?
                                    notificationLogger.info(message) :
                                    (moduleEnum == 7) ?
                                        enquiryLogger.info(message) :
                                        (moduleEnum == 8) ?
                                            workShiftLogger.info(message) :
                                            (moduleEnum == 9) ?
                                                reportLogger.info(message) :
                                                (moduleEnum == 10) ?
                                                    historyLogger.info(message) :
                                                    (moduleEnum == 11) ?
                                                        schedulerLogger.info(message) :
                                                        logger.info(message);
            break;

        case 4:
            (moduleEnum == 1) ?
                rupyoAdminLogger.debug(message) :
                (moduleEnum == 2) ?
                    employerLogger.debug(message) :
                    (moduleEnum == 3) ?
                        employeeLogger.debug(message) :
                        (moduleEnum == 4) ?
                            attendanceLogger.debug(message) :
                            (moduleEnum == 5) ?
                                transactionLogger.debug(message) :
                                (moduleEnum == 6) ?
                                    notificationLogger.debug(message) :
                                    (moduleEnum == 7) ?
                                        enquiryLogger.debug(message) :
                                        (moduleEnum == 8) ?
                                            workShiftLogger.debug(message) :
                                            (moduleEnum == 9) ?
                                                reportLogger.debug(message) :
                                                (moduleEnum == 10) ?
                                                    historyLogger.debug(message) :
                                                    (moduleEnum == 11) ?
                                                        schedulerLogger.debug(message) :
                                                        logger.debug(message);
            break;
    }
};


/**
 * Generate random string
 *  @param {Number} _length = length
 *  @param {String} alphanumeric  = digit and character
 *  @param {String} uppercase = Capital
 */
randomString = (_length) => {
    return _randomString.generate({
        length: _length,
        charset: 'alphanumeric',
        capitalization: 'uppercase'
    });
};


/**
* Otp generate
* @param {Number} digit six
* @param {String} set specialChars false
* @param {String} set upperCase false
* @param {String} Set alphabets false
* Expiry time 1 minutes
*/

// Secret key generate
let _secret = speakEasy.generateSecret({ length: 20 });

// Generate otp
otpGenerate = () => {
    return speakEasy.totp({
        secret: _secret.base32,
        encoding: "base32",
        digits: 6,
        step: 600, // 10 minute
        window: 0
    });
};


// Verify otp expiry time
verifyOtp = (token) => {

    return speakEasy.totp.verifyDelta({
        secret: _secret.base32,
        encoding: "base32",
        token: token,
        step: 600, // 10 minute
        window: 0
    });
};


/**
* Generate JWToken
* _id is user's Object id
* role_id is users's role id
* email is user's email id
* user_name is user's first_name and last_name
*/
jwtTokenGenerate = (result) => {
    return token = jwt.sign({
        _id: result._id,
        role_id: result.role_id,
        email: result.email,
        employer_user_id: result._id,
        company_id: result.company_id,
        company_name: result.company_name,
        user_name: result.first_name + ' ' + result.last_name
    },
        jwt_secret,
        {
            expiresIn: "36500d"// expireTime
        })
};


// JWT token for short time
shortJwtToken = (data) => {

    return token = jwt.sign({

        "_id": data.user_id
    },
        jwt_secret,
        {
            // Expiration time define in seconds
            expiresIn: "600s" // 10 minute
        })
};


// JWT token verification
let jwtVerify = async (token) => {
    let tokenResult
    try {

        tokenResult = await jwt.verify(token, jwt_secret)
        return tokenResult
    }
    catch (error) {
        return null
    }
};


// Set error response
errData = (statusCode, message, data) => {

    const error = new Error(message)
    error.statusCode = statusCode
    error.data = data
    return error
};


// Sorting (common for whole project) 
sorting = (sortByColumn, sortBy) => {
    try {

        let sortQuery;

        // Check sort by column
        if (sortByColumn === '_id') {
            sortQuery = {
                '_id': sortBy
            };
        }
        else if (sortByColumn === 'first_name') {
            sortQuery = {
                'first_name': sortBy,
                'Users.first_name': sortBy
            };
        }
        else if (sortByColumn === 'middle_name') {
            sortQuery = {
                'middle_name': sortBy,
                'Users.middle_name': sortBy
            };
        }
        else if (sortByColumn === 'last_name') {
            sortQuery = {
                'last_name': sortBy,
                'Users.last_name': sortBy
            };
        } else if (sortByColumn === 'job_title') {
            sortQuery = {
                'job_title': sortBy
            };
        } else if (sortByColumn === 'company_name') {
            sortQuery = {
                'company_name': sortBy,
                'Company.company_name': sortBy
            };
        } else if (sortByColumn === 'company_size') {
            sortQuery = {
                'company_size': sortBy,
                'Company.company_size': sortBy
            };
        } else if (sortByColumn === 'phone_number') {
            sortQuery = {
                'phone_number': sortBy
            };
        } else if (sortByColumn === 'work_email') {
            sortQuery = {
                'work_email': sortBy
            };
        } else if (sortByColumn === 'message') {
            sortQuery = {
                'message': sortBy
            };
        } else if (sortByColumn === 'email') {
            sortQuery = {
                'email': sortBy
            };
        } else if (sortByColumn === 'password') {
            sortQuery = {
                'password': sortBy
            };
        } else if (sortByColumn === 'mobile_number') {
            sortQuery = {
                'mobile_number': sortBy
            };
        } else if (sortByColumn === 'status') {
            sortQuery = {
                'status': sortBy
            };
        } else if (sortByColumn === 'shift_name') {
            sortQuery = {
                'shift_name': sortBy
            };
        } else if (sortByColumn === 'shift_start_time')
            sortQuery = {
                'shift_start_time': sortBy
            };
        else if (sortByColumn === 'shift_end_time') {
            sortQuery = {
                'shift_end_time': sortBy
            };
        } else if (sortByColumn === 'employee_id') {
            sortQuery = {
                'employee_id': sortBy
            };
        } else if (sortByColumn === 'employee_sys_id') {
            sortQuery = {
                'employee_sys_id': sortBy
            };
        } else if (sortByColumn === 'work_shift') {
            sortQuery = {
                'work_shift': sortBy
            };
        } else if (sortByColumn === 'employee_type') {
            sortQuery = {
                'employee_type': sortBy
            };
        } else if (sortByColumn === 'rupyo_credit_limit') {
            sortQuery = {
                'rupyo_credit_limit': sortBy,
                'Company.rupyo_credit_limit': sortBy
            }
        } else if (sortByColumn === 'verification_status') {
            sortQuery = {
                'verification_status': sortBy
            };
        } else if (sortByColumn === 'salary_cycle') {
            sortQuery = {
                'salary_cycle': sortBy
            };
        } else if (sortByColumn === 'opening_balance') {
            sortQuery = {
                'opening_balance': sortBy
            };
        } else if (sortByColumn === 'address_1') {
            sortQuery = {
                'address_1': sortBy
            };
        } else if (sortByColumn === 'address_2') {
            sortQuery = {
                'address_2': sortBy
            };
        } else if (sortByColumn === 'city') {
            sortQuery = {
                'city': sortBy
            };
        } else if (sortByColumn === 'state') {
            sortQuery = {
                'state': sortBy
            };
        } else if (sortByColumn === 'country') {
            sortQuery = {
                'country': sortBy
            };
        } else if (sortByColumn === 'pin_code') {
            sortQuery = {
                'pin_code': sortBy
            };
        } else if (sortByColumn === 'account_number') {
            sortQuery = {
                'account_number': sortBy
            };
        } else if (sortByColumn === 'bank_name') {
            sortQuery = {
                'bank_name': sortBy
            };
        } else if (sortByColumn === 'ifsc_code') {
            sortQuery = {
                'ifsc_code': sortBy
            };
        } else if (sortByColumn === 'pan_card') {
            sortQuery = {
                'pan_card': sortBy
            };
        } else if (sortByColumn === 'role_id') {
            sortQuery = {
                'role_id': sortBy
            };
        } else if (sortByColumn === 'company_status') {
            sortQuery = {
                'company_status': sortBy
            };
        } else if (sortByColumn === 'set_payout_limit') {
            sortQuery = {
                'set_payout_limit': sortBy,
                'Company.set_payout_limit': sortBy
            };
        } else if (sortByColumn === 'rupyo_company_code') {
            sortQuery = {
                'rupyo_company_code': sortBy,
                'Company.rupyo_company_code': sortBy
            };
        } else if (sortByColumn === 'company_cin') {
            sortQuery = {
                'company_cin': sortBy,
                'Company.company_cin': sortBy
            };
            // } else if (sortByColumn === 'partnership_firm_company_id') {
            //     sortQuery = {
            //         'partnership_firm_company_id': sortBy,
            //         'Company.partnership_firm_company_id': sortBy
            //     };
        } else if (sortByColumn === 'punch_in') {
            sortQuery = {
                'punch_in': sortBy
            };
        }
        else if (sortByColumn === 'punch_out') {
            sortQuery = {
                'punch_out': sortBy
            };
        }
        else if (sortByColumn === 'actual_working_hour') {
            sortQuery = {
                'actual_working_hour': sortBy
            };

        } else if (sortByColumn === 'user_id') {
            sortQuery = {
                'user_id': sortBy
            };
        } else if (sortByColumn === 'resource_type') {
            sortQuery = {
                'resource_type': sortBy
            };
        } else if (sortByColumn === 'request_type') {
            sortQuery = {
                'request_type': sortBy
            };
        } else if (sortByColumn === 'details') {
            sortQuery = {
                'details': sortBy
            };
        } else if (sortByColumn === 'settlement_id') {
            sortQuery = {
                'settlement_id': sortBy
            };
        } else if (sortByColumn === 'year') {
            sortQuery = {
                'year': sortBy
            };
        } else if (sortByColumn === 'month') {
            sortQuery = {
                'month': sortBy
            };
        } else if (sortByColumn === 'total_number_of_payout') {
            sortQuery = {
                'total_number_of_payout': sortBy
            };
        } else if (sortByColumn === 'requested_amount') {
            sortQuery = {
                'requested_amount': sortBy
            };
        } else if (sortByColumn === 'date_time') {
            sortQuery = {
                'date_time': sortBy
            };
        } else if (sortByColumn === 'amount') {
            sortQuery = {
                'amount': sortBy
            };
        } else if (sortByColumn === 'request_id') {
            sortQuery = {
                'request_id': sortBy
            };
        } else if (sortByColumn === 'remaining_credit_limit') {
            sortQuery = {
                'remaining_credit_limit': sortBy
            };
        } else if (sortByColumn === 'remaining_amount') {
            sortQuery = {
                'remaining_amount': sortBy
            };
        }
        else {
            sortQuery = {
                'created_at': sortBy
            };
        }
        return sortQuery;
    }
    catch {
        return 0;
    }
}


// This month filter
thisMonth = () => {
    let startDay = moment().startOf('month').format("YYYY-MM-DD");
    let endDay = moment().utc();

    return created_at = {
        $gte: new Date(startDay + "T00:00:00.000Z"),
        $lte: new Date(endDay)
    };
};


// Today filter
toDay = () => {
    let today = moment().utc().format("YYYY-MM-DD");

    return created_at = {
        $gte: new Date(today + "T00:00:00.000Z"),
        $lte: new Date(today + "T23:59:59.000Z")
    };
};


// Last week filter
lastWeek = () => {
    let startDay = moment().day(-7).toDate();
    let endDay = moment().startOf('week').toDate();

    return created_at = {
        $gte: startDay,
        $lte: endDay
    };
};


// Last year filter
lastYear = () => {
    let startLastYear = moment().subtract(1, 'years').startOf('year').format("YYYY-MM-DD");
    let endLastYear = moment().subtract(1, 'years').endOf('year').format("YYYY-MM-DD");

    return created_at = {
        $gte: new Date(startLastYear + "T00:00:00.000Z"),
        $lte: new Date(endLastYear + "T23:59:59.000Z")
    };

};


// Year filter
thisYear = () => {
    let startDay = moment().startOf('year').format('YYYY-MM-DD');
    let endDay = moment().utc();

    return created_at = {
        $gte: new Date(startDay + "T00:00:00.000Z"),
        $lte: new Date(endDay)
    };
};


// Filter by last month 
lastMonth = () => {

    // Filter by previous month
    let previousMonthStart = new moment().startOf('month').subtract(1, 'months').format("YYYY-MM-DD");
    let previousMonthEnd = moment().endOf('month').subtract(1, 'months').format("YYYY-MM-DD");

    return created_at = {
        $gte: new Date(previousMonthStart + "T00:00:00.000Z"),
        $lte: new Date(previousMonthEnd + "T23:59:59.000Z")
    }
};


// Last three month filter
lastThreeMonth = () => {

    // Filter by last three month
    let lastThreeMonth = new moment().startOf('month').subtract(2, 'months').format("YYYY-MM-DD");
    let endDay = moment().utc();

    return created_at = {
        $gte: new Date(lastThreeMonth + "T00:00:00.000Z"),
        $lte: new Date(endDay)
    }
};


// This week filter
thisWeek = () => {
    let startDay = moment().startOf('week').format("YYYY-MM-DD");

    // moment().day(7).toDate();
    let endDay = moment().utc();
    //  moment().startOf('week').toDate();
    return created_at = {
        $gte: new Date(startDay + "T00:00:00.000Z"),
        $lte: new Date(endDay)
    };
};


// Date filter
dateFilter = (start_date) => {
    let startDay = moment(start_date).format('YYYY-MM-DD');

    return created_at = {
        $gte: new Date(startDay + "T00:00:00.000Z"),
        $lte: new Date(startDay + "T23:59:59.000Z")
    };
}


// Custom date filter
customDateFilter = (start_date, end_date) => {
    let startDay = moment(start_date).format('YYYY-MM-DD');
    let lastDay = moment(end_date).format('YYYY-MM-DD');

    return created_at = {
        $gte: new Date(startDay + "T00:00:00.000Z"),
        $lte: new Date(lastDay + "T23:59:59.000Z")
    };
}


// Validation csv file
validationCsvFile = (validationData) => {

    let msg = [];
    if (validationData.first_name === '') {

        msg.push('First name is required.');
    }

    if (validationData.last_name === '') {

        msg.push('Last name is required.');
    }
    if (validationData.gender === '') {
        msg.push('Gender is required.');
    }
    let genderVlidation = ["M", "F", "O"];
    if (!genderVlidation.includes(validationData.gender)) {
        msg.push('Gender type is incorrect.');
    }

    /*   if (validationData.gender !== 'M' || validationData.gender !== 'F' || validationData.gender !== 'O') {
           msg.push('Gender is required.');
       }*/
    if (validationData.dob === '') {
        msg.push('DOB is required.');
    }
    if (validationData.father_mother_name === '') {
        msg.push('Father mother name is required.');
    }
    if (validationData.mobile_number === '') {

        msg.push('Mobile number is required.');
    }


    if (validationData.mobile_number && validationData.mobile_number.length != 10) {

        msg.push('Mobile number should be 10 digit.');
    }

    if (validationData.employee_type === '') {

        msg.push('Employee type is required.');
    }

    if (validationData.salary_cycle === '') {

        msg.push('Salary cycle is required.');
    }

    if (validationData.basic_pay === '') {

        msg.push('Basic pay is required.');
    }

    if (validationData.net_pay === '') {

        msg.push('Net salary is required.');
    }

    if (validationData.opening_balance === '') {

        msg.push('Opening balance is required.');
    }

    if (validationData.address_1 === '') {

        msg.push('Address 1 is required.');
    }

    if (validationData.city === '') {

        msg.push('City is required.');
    }

    if (validationData.pincode === '') {

        msg.push('Pin code is required.');
    }
    if (validationData.district === '') {

        msg.push('District is required.');
    }
    if (validationData.state === '') {

        msg.push('State is required.');
    }

    if (validationData.country === '') {

        msg.push('Country is required.');
    }

    if (validationData.bank_name === '') {

        msg.push('Bank name is required.');
    }
    if (validationData.branch_name === '') {

        msg.push('Branch name is required.');
    }

    if (validationData.account_number === '') {

        msg.push('Account number is required.');
    }
    else if (validationData.account_number && (validationData.account_number.length < 9 || validationData.account_number.length > 25)) {

        msg.push('Invalid account number.');
    }

    if (validationData.ifsc_code === '') {

        msg.push('IFSC code is required.');
    }
    else if (validationData.ifsc_code && validationData.ifsc_code.length !== 11) {

        msg.push('Invalid IFSC code.');
    }

    if (validationData.pan_card === '') {

        msg.push('Pan card is required.');
    }
    if (validationData.name_in_bank === '') {

        msg.push('Name in bank is required.');
    }
    if (validationData.bank_account_type === '') {

        msg.push('Bank account type is required.');
    }
    /* if (validationData.bank_account_type !== 'C' || validationData.bank_account_type !== 'S' || validationData.bank_account_type !== 'O') {
 
         msg.push('Bank account type is required.');
     }*/
    let bank_account_typeVlidation = ["C", "S", "O"];
    if (!bank_account_typeVlidation.includes(validationData.bank_account_type)) {
        msg.push('Bank account type is incorrect.');
    }

    if (validationData.employee_id_generation_method === '') {

        msg.push('Employee id generation method is required.');
    }

    if (validationData.aadhar_card === '') {

        msg.push('Aadhar card  is required.');
    }
    else if (validationData.aadhar_card && validationData.aadhar_card.length !== 12) {

        msg.push('Invalid aadhar card number.');
    }

    printLogger(0, "*******  CSV validation error  ********", 'employee');
    printLogger(0, `CSV validation error message:-  ${msg}`, 'employee');

    return msg;
}

// Enum base file 
const enumValue = {

    // Get the value roleId using enum 
    rupyoAdminRoleId: _enum.roleId.get('rupyo_admin').value, // 1
    employerRoleId: _enum.roleId.get("employer").value, // 2
    employeeRoleId: _enum.roleId.get('employee').value, // 3
    superAdminRoleId: _enum.roleId.get('super_admin').value, // 4

    // Get the value status using enum 
    activeStatus: _enum.status.get("active").value, // 1
    deactiveStatus: _enum.status.get("deactive").value, // 2
    pauseStatus: _enum.status.get('pause').value, // 3
    archiveStatus: _enum.status.get('archive').value, // 4
    correctStatus: _enum.status.get('correct').value,  //5
    notCorrectStatus: _enum.status.get('not_correct').value, //6
    presentStatus: _enum.status.get('present').value, // 7
    absentStatus: _enum.status.get('absent').value, // 8
    halfDayStatus: _enum.status.get('half_day').value, // 9
    leaveStatus: _enum.status.get('leave').value, // 10
    pendingStatus: _enum.status.get('pending').value, // 11    
    approvedStatus: _enum.status.get('approved').value, // 12
    creditedStatus: _enum.status.get('credited').value, // 13
    rejectedStatus: _enum.status.get('rejected').value, // 14
    holdStatus: _enum.status.get('hold').value, // 15    
    accountStatus: _enum.status.get('account').value, // 17
    generatedStatus: _enum.status.get('generated').value, // 19       
    paidStatus: _enum.status.get('paid').value, // 20 
    missedPunch: _enum.status.get('missed_punch').value, // 21
    partialPaidStatus: _enum.status.get('partial_paid').value, // 22
    paidHolidayStatus: _enum.status.get('paid_holiday').value, // 23
    unpaidHolidayStatus: _enum.status.get('unpaid_holiday').value, // 24
    weeklyOffStatus: _enum.status.get('weekly_off').value, // 25

    // Get the value verificationStatus using enum 
    new_register: _enum.verificationStatus.get('new_register').value, // 0
    verify_otp: _enum.verificationStatus.get('otp_verify').value, // 1
    pinStatus: _enum.verificationStatus.get('pin').value, // 2
    _bankdetails: _enum.verificationStatus.get('check_bank_details').value, // 3
    selfie: _enum.verificationStatus.get('selfie').value, // 4
    loginStatus: _enum.verificationStatus.get('login').value, // 5

    // Get the value rupyoCreditLimit using enum 
    fixAmountType: _enum.rupyoCreditLimit.get('fix_amount').value, // 1
    percentBaseType: _enum.rupyoCreditLimit.get('percent_base').value, // 2

    // Get the value resourceType using enum     
    bankDetailResourceType: _enum.resourceType.get('bank_detail').value, // 1    
    changeStatus: _enum.resourceType.get('account_status').value, // 3    
    payoutStatus: _enum.resourceType.get("payout").value, // 4
    _payout: _enum.resourceType.get('payout').value, // 4
    attendanceStatus: _enum.resourceType.get('attendance').value, // 5
    _attendance: _enum.resourceType.get('attendance').value, // 5
    requestResourceType: _enum.resourceType.get('request').value, // 6
    _account: _enum.resourceType.get('account').value, // 15
    forgetPasswordRequest: _enum.resourceType.get('forgot_password').value, // 8    
    _administration: _enum.resourceType.get('administration').value, // 10
    creditLimit: _enum.resourceType.get('credit_limit_request').value, // 16
    changePassword: _enum.resourceType.get('change_password').value, // 18
    accountCreate: _enum.resourceType.get('account_create').value, // 17
    pauseResourceType: _enum.resourceType.get('pause').value, // 19
    deactiveResourceType: _enum.resourceType.get('deactive').value, // 20
    settlementResourceType: _enum.resourceType.get('settlement').value, // 21


    // Get the value attendanceFilter using enum 
    today: _enum.attendanceFilter.get('today').value, // 1
    _lastWeek: _enum.attendanceFilter.get("last_week").value, // 2    
    _thisMonth: _enum.attendanceFilter.get("this_month").value, // 3    
    _lastMonth: _enum.attendanceFilter.get('last_month').value, // 4
    _thisYear: _enum.attendanceFilter.get('this_year').value, // 5
    _lastYear: _enum.attendanceFilter.get('last_year').value, // 6    
    _thisWeek: _enum.attendanceFilter.get("this_week").value, // 7
    _lastThreeMonths: _enum.attendanceFilter.get('last_three_months').value, // 8

    // Get the value filterNoticationBy using enum
    thisMonth: _enum.filterByDuration.get('this_month').value, // 0
    lastMonth: _enum.filterByDuration.get('last_month').value, // 1    
    lastYear: _enum.filterByDuration.get('last_year').value, // 2
    lastThreeMonths: _enum.filterByDuration.get('last_three_months').value, // 3
    thisYear: _enum.filterByDuration.get('this_year').value, // 4


    // Employee id generation method
    randomGeneratedMethod: _enum.employeeIdGenerationMethod.get("random_generate").value, //1
    userCreateMethod: _enum.employeeIdGenerationMethod.get("user_create").value, //2


    // Get the value pushNotificationType using enum
    bankDetailUpdateEnum: _enum.pushNotificationType.get('BANK_DETAILS_UPDATED').value, // 1

    // String format
    stringFormat: _enum.stringFormat.get('utf_8').value, // utf8

    // Registrar of company type (roc_type) enum
    companyCinType: _enum.rocType.get('company_cin').value,  // 1
    partnershipFirmType: _enum.rocType.get('partnership_firm_company_id').value,  // 2


    // Employer credit limit type for its employees
    dayWiseCreditLimit: _enum.employerCreditLimitType.get('day_wise').value,  // 1
    monthWiseCreditLimit: _enum.employerCreditLimitType.get('month_wise').value,  // 2
};


// Notification 
const notification = {

    // Email and mobile app  notifications
    subAdminCreation: (params) => {
        return `Rupyo has activated your Admin Account. <a href="https://portal.rupyo.in/#/">Please click here to login.</a>  Please contact Rupyo Administrator for any changes. Login id: ${params.login_id} Password: ${params.password}.`;
    },

    employerCreation: (params) => {
        return `Your account on Rupyo has been successfully created by Team Rupyo on ${params.date} at ${params.time}. <a href="https://portal.rupyo.in/#/">Please click here to login and access the employer portal</a>
        Login id: ${params.login_id}
        Password: ${params.password}
        
        Please re-set your password after first login for security reasons`;
    },

    // Bank details incorrect notification mesage for employer
    employeeInCorrectBankdeatils: (params) => {

        return `Please be informed that ${params.employee_name} ${params.employee_id} of ${params.company_name} ${params.company_id} company has notified us of a discrepancy with their PAN and/or Bank Details on ${params.date} at ${params.time} and they were unable to complete their employee registration process. Please Contact ${params.employee_name} on Mobile: ${params.mobile_number}.`;
    },


    // Transaction notifications for employee side
    payoutApproved: (params) => {
        return `As per request ID ${params.request_id}, Your payout request for Rs. ${params.requested_amount} has been APPROVED on ${params.date} at ${params.time}.`;
    },

    payoutCredited: (params) => {

        return `Dear, ${params.employee_name} ${params.employee_id}, As per your request ID ${params.request_id} for amount Rs. ${params.requested_amount}, Rupyo has CREDITED Rs. ${params.credited_amount} after ${params.deduction_percent}% deducting transaction fees into your ${params.bank_name} Bank Account ${params.account_number} on ${params.date} at ${params.time} on behalf of your employer ${params.company_name} ${params.company_code} as earned and accrued salary payout.`;

    },

    payoutRejected: (params) => {

        return `As per request ID ${params.request_id}, Your payout request for Rs. ${params.requested_amount} has been REJECTED on ${params.date} at ${params.time}. Please contact your employer for more information.`;
    },

    // Transaction notifications for employer side
    payoutApprovedMessageForEmployer: (params) => {

        return `As per request ID ${params.request_id} from your employee ${params.employee_name} ${params.employee_id}, Rupyo has APPROVED a payout of Rs. ${params.requested_amount} on ${params.date} at ${params.time}`;
    },

    payoutCreditedMessageForEmployer: (params) => {

        return `As per request ID ${params.request_id} from your employee ${params.employee_name} ${params.employee_id}, Rupyo has CREDITED a payout of Rs. ${params.requested_amount} on ${params.date} at ${params.time}.`;
    },

    payoutRejectedMessageForEmployer: (params) => {

        return `As per request ID ${params.request_id} from your employee ${params.employee_name} ${params.employee_name}, Rupyo has REJECTED a payout of Rs. ${params.requested_amount} on ${params.date} at ${params.time}. Please contact Rupyo team for more information.`;
    },

    // Bank details incorrect notification mesage for rupyo admin
    rupyoAdminInformed: (params) => {

        return `Please be informed that ${params.employee_name} ${params.employee_id} of ${params.company_name} ${params.company_id} company has notified us of a discrepancy with their PAN and/or Bank Details on ${params.date} at ${params.time} and they were unable to complete their employee registration process. Please Contact ${params.employee_name} on Mobile: ${params.mobile_number}.`;
    },


    employerResetPassword: (params) => {

        return `Password for your Rupyo account  is ${params.password}. You are good to go! `;
    },


    employerForgetPassword: (params) => {

        return `${params.employer_name} from ${params.company_name} ${params.company_code} has requested for password recovery. Please get in touch with their administrator.`;
    },


    employerCreditLimit: (params) => {

        return `${params.employer_name} from ${params.company_name} ${params.company_code} has requested for Change in credit limit form  ${params.previous_amount} to ${params.requested_amount} credit limit. Please get in touch with their administrator.`;
    },


    payoutRequestNotificationForAdmin: (params) => {

        return `${params.employee_name} ${params.employee_id} of ${params.company_name} ${params.company_id} has requested for an amount: Rs. ${params.amount} on ${params.date} at ${params.time}
        Please click here to process the payout request`;
    },

    payoutRequestNotificationForEmployer: (params) => {

        return `${params.employee_name} ${params.employee_id} has requested for amount: ${params.amount} on ${params.date} at ${params.time}
        The payout request is under processing by the Rupyo Team.`;
    },


    payoutRequestNotificationForEmployee: (params) => {

        return `As per request ID ${params.request_id}, Rupyo has received a payout request of Rs. ${params.amount} on ${params.date} at ${params.time} from you. The same is under processing by Rupyo Team.`;
    },

    employeeAttandanceModifiedByRupyoAdmin: (params) => {
        return `Attandance for ${params.first_name} has been modified as ${params.attendance_update} for ${params.created_at}.`;
    },

    employerAccountWhenPaused: (params) => {
        return `Your credit limit has been ${params.pause} by Rupyo admin. To know more, get in touch with us.`;
    },


    employerAccountWhenInactive: (params) => {
        return `Your account has been ${params.deactivated}. For any assistance, get in touch with Rupyo admin.`;
    },


    pauseOfCreditByEmployer: (params) => {
        return `${params.company_name} has paused your credits for this month. Contact your employer for further clarification.`;
    },

    updatedCreditLimitOfEmployer: (params) => {

        return `Dear, ${params.employer_name} from ${params.company_name} ${params.company_code}, your companies credit limit has been UPDATED form ${params.previous_amount} to ${params.requested_amount} credit limit by Rupyo team. To know more, please get in touch with us.`;
    },

    updateCreditLimitOfEmployee: (params) => {

        return `Dear, ${params.employee_name} ${params.employee_id}, your credit limit has been UPDATED form ${params.previous_amount} to ${params.requested_amount} credit limit by your Employer. To know more, please get in touch with us.`;
    },


    settlementGenerated: (params) => {

        return `Dear, ${params.employer_name} from ${params.company_name} ${params.company_code}, Rupyo Team has requested for your Ledger Settlement for ${params.month}-${params.year}, for the amount of Rs. ${params.amount} on ${params.date} at ${params.time}. Please click here to proceed with settlement.`;
    },

    settlementPaid: (params) => {

        return `${params.company_name} ${params.company_code} as per Settlement request ${params.settlement_id} has made a settlement payment of Rs.${params.amount} on ${params.date} at ${params.time}.`;
    }
};


// Region Generic Message
const message = {

    validationError: () => {
        return `Please check validations.`;
    },

    noDataFound: () => {
        return `No data found.`;
    },

    dataFound: () => {
        return `Data found.`;
    },

    insertSuccessfully: (params) => {
        return `${params} created successfully.`;
    },

    noInsertSuccessfully: (params) => {
        return `${params} not created.`;
    },

    csvResponseForEmployees: (params) => {
        if (params.successCount == 0) {
            return `${params.failureCount} Employees not added due to invalid data.`;
        }
        else if (params.failureCount == 0) {
            return `${params.successCount} Employees added successfully.`;
        }
        else {
            return `${params.successCount} Employees added successfully. ${params.failureCount} Employees not added due to invalid data.`;
        }
    },


    passwordUpdatedSuccessfully: (params) => {
        return `${params} updated successfully. Please check your email.`;
    },

    updateSuccessfully: (params) => {
        return `${params} updated successfully.`;
    },

    deleteSuccessfully: (params) => {
        return `${params} deleted successfully.`;
    },

    changesReflectedNextMonth: () => {
        return `Your changes saved and reflected will be next month.`;
    },

    keyStore: (params) => {
        return `${params} key inserted successfully.`;
    },

    validWorkShiftId: () => {
        return `Please valid work shift id.`;
    },

    workShiftNotFound: () => {
        return `Workshift not found.`;
    },


    notComapanyCode: () => {
        return `Employee not register company code.`;
    },

    invalidComapanyCode: () => {
        return `Invalid company code.`;
    },

    notMobileNumber: () => {
        return `Mobile number not registered.`;
    },

    mobileNumberNotRegistered: () => {
        return `Mobile number not registered.`;
    },

    mobileNumberNotLinked: () => {
        return `Mobile number not linked with given company code.`;
    },

    mobileNumberNotAllowed: () => {
        return `Mobile number is not allowed to login`;
    },

    companyNotExists: () => {
        return `Company not exist on rupyo platform.`;
    },

    registrationProcessIncomplete: () => {
        return `Your registration process is incomplete.`;
    },

    alreadyRegistered: () => {
        return `Employee already registered. Please login.`;
    },

    dataCouldNotBeInserted: (params) => {
        return `Data could not be inserted. ${params}.`;
    },

    loggedIn: () => {
        return `You have logged in.`;
    },

    notUpdateVerificationStatus: () => {
        return `Your verifications status not update.`;
    },

    userNotRegistered: () => {
        return `User not registered.`;
    },

    notAuthorizedToResetPassword: () => {
        return `You are not authorised to reset password.`;
    },

    unableToUpdate: (params) => {
        return `Unable to update ${params}.`;
    },

    unableDelete: () => {
        return `Notifications not delete.`;
    },

    unableExportCsv: (params) => {
        return `Unable to export ${params} csv file.`;
    },

    exportCsv: (params) => {
        return `${params} csv file Export successfully.`;
    },

    passwordNotMatch: () => {
        return `New password and confirm password not match.`;
    },

    pinNotMatch: () => {
        return `New pin and verify pin not match.`;
    },

    deletedSuccessfully: (params) => {
        return `${params} deleted successfully.`;
    },

    otpVerifyInComplete: () => {
        return `Please verify OTP`;
    },

    validEmployeeId: () => {
        return `Validation error. Employee id should be 14 digit.`;
    },

    employeeId: () => {
        return `Employee id already taken.`
    },

    correctNetPay: () => {
        return `Net pay should be greater than zero.`
    },

    invalidEmailId: () => {
        return `Invalid email id.`;
    },

    otpSendSuccessfully: (params) => {
        return `${params} send successfully.`;
    },

    invalidMobileNumber: () => {
        return `Invalid mobile number.`;
    },

    invalidPassword: () => {
        return `Invalid credentials.`;
    },

    wrongPassword: () => {
        return `Old password is incorrect.`;
    },

    invalidPin: () => {
        return `Invalid pin.`
    },

    invalidLoginMessage: () => {
        return `User name or password does not match.`
    },

    emailIdAlreadyTaken: () => {
        return `Email id already taken.`;
    },

    mobileNumberIdAlreadyTaken: () => {
        return `Mobile number already taken.`;
    },


    creditLimitExceed: () => {
        return `Credit limit can not exceed the net monthly salary.`;
    },

    error: (params) => {
        return `Internal server error please try again. ${params}.`;
    },

    validNumber: () => {
        return `Please provide a valid number.`;
    },

    invaildRoleId: () => {
        return `Invalid role id.`;
    },

    validCompanyCode: () => {
        return `Please provide a valid company code.`;
    },

    inValidOtp: () => {
        return `Invalid OTP`;
    },

    otpDoNotMatch: () => {
        return `OTP do not match.`;
    },

    otpExpiry: () => {
        return `OTP valid only for 60 seconds.`;
    },

    otpExpired: () => {
        return `OTP expired.`;
    },

    matchOtp: () => {
        return `OTP verified`;
    },

    resendOtp: (params) => {
        return ` ${params} send. `;
    },

    bankDetails: (params) => {
        return `${params} data.`
    },

    verifyDetail: () => {
        return `Details verified.`
    },

    validDetail: () => {
        return `Valid details.`
    },

    inValidDetail: () => {
        return `Invalid details.`
    },

    statusWrong: () => {
        return `Provided status is wrong.`
    },

    notLoggedIn: () => {
        return `You logged out. Please contact to your company.`
    },


    validId: () => {
        return `Valid employee id.`;
    },

    notValid: () => {
        return `Valid details.`;
    },


    validSelfie: () => {
        return `Selfie uploaded successful.`
    },


    notValidSelfie: () => {
        return `Selfie could not be uploaded.`;
    },

    // invalidMobileNumber: () => {
    //     return `Invalid mobile number.`;
    // },

    mobilePinDoNotMatch: () => {
        return `Login Failed - Mobile Number/PIN do not match.`;
    },

    pageIndex: () => {
        return ` Please provide a page index.`;
    },

    pageSize: () => {
        return `Please provide a page size.`;
    },

    unableToSave: (params) => {
        return `Unable to save ${params}.`;
    },

    requiredStatus: (params) => {
        return `Please provide ${params}.`;
    },

    saveSuccessfully: (params) => {
        return `${params} saved successfully.`;
    },

    unableSave: (params) => {
        return `Unable to save your ${params}. Please try again.`;
    },

    punchedIn: () => {
        return `Employee punched in.`
    },

    punchedInAfter30Minutes: (params) => {
        return `You have punched in 30 minutes after the start of your shift, so we have marked your today's attendance as missed punch. For regularization please get in touch with your employer.`
    },

    punchedOut: () => {
        return `Employee punched out.`;
    },

    punchedOutAfter2Hours: () => {
        return `You have punched out 2 hours after the end of the shift, so we have marked missed punch for your today's attendance. Please get in touch with your employer for regularization.`;
    },

    markedAttendance: () => {
        return `You already marked attendance.`;
    },

    cantChangeTodaysAttendance: () => {
        return `You can't change today's attendance.`;
    },

    requestSent: () => {
        return `Request sent successfully.`;
    },

    createEmployee: () => {
        return `Your sign up process not complete.`;
    },

    otpVerify: () => {
        return `Please verify mobile number.`;
    },

    pinGenerate: () => {
        return `Please pin generate.`;
    },

    notActive: () => {
        return `User not active.`;
    },

    yourCompanyNotActive: () => {
        return `Your company is not active.`;
    },

    notAuthorizeAcess: () => {
        return `You are not authorized user.`;
    },

    workShiftCount: () => {
        return `Maximum five workshift only.`;
    },

    unauthorizedUser: () => {
        return `You are not authorized user.`;
    },

    canNotRequest: () => {
        return `Your requested amount is not sufficient, please get in touch with your employer.`;
    },

    employerCreditLimitExhausted: () => {
        return `You cannot approve this request because the employer's credit limit for this employee is less than the requested amount.`;
    },

    companyNotActive: () => {
        return `You cannot make new payout request. Company or employee are not active.`;
    },

    lastDayMessage: () => {
        return `You cannot make new payout request. Since today is last day of the month.`;
    },

    payoutInactiveMessage: () => {
        return `You're not authorized to request payout in this month. Your payout process will activated on the 1st of the next month.`;
    },

    payoutRequestAfter15Min: () => {
        return `You can make request after 15 minutes of last request.`;
    },

    updateOnlyCurrentMonthRequest: () => {
        return `You can update only current month payout request.`;
    },

    alreadyPendingRequest: () => {
        return `You cannot make new payout request. Since you have already one pending payout request.`;
    },

    punchInTimeNotCorrect: () => {
        return `You can not punch in one hour before shift start time and after shift end time`;
    },

    punchOutTimeNotCorrect: () => {
        return `You can not punch out before shift start time`;
    },

    inValidToken: () => {
        return `Invalid token.`;
    },

    tokenExpired: () => {
        return `Token expired.`;
    },

    uploadReceipt: () => {
        return `Please upload receipt.`;
    },

    unableToSetPin: () => {
        return 'Unable to set pin.';
    },

    generalFailure: () => {
        return `General failure`;
    },

    rupyoAdminNotRegister: () => {
        return `Rupyo admin not registerd`;

    },

    workShiftNotRegister: () => {
        return ` Work shift not available`;
    },

    openShiftNotDeleted: () => {
        return `This work shift can not be deleted.`;
    },

    openShiftNotEdited: () => {
        return `This work shift can not be edited.`;
    },

    workShiftNotDelete: (params) => {
        return `You can't delete this shift, ${params} employee is connected with this shift.`;
    },

    readSuccessfully: (params) => {
        return `${params} read successfully.`;
    },

    payoutNotCredited: () => {
        return `Their employees does not credited payout for that month.`;
    },

    settlementGenerated: () => {
        return `settlement already generated for that month.`;
    },

    settlementAmountGreater: () => {
        return `Your settlement amount is greater than remaining amount.`;
    },

    amountShouldBeGreaterThanZero: () => {
        return `Amount should be greater than zero.`;
    },


    dontHaveAccessToApprovePayout: () => {
        return `You don’t have access to approve the payout request.`;
    },

    dontHaveAccessToCreditPayout: () => {
        return `You don’t have access to credit the payout request.`;
    },

    // SMS
    otpMessage: (otp) => {
        return `${otp} is your Rupyo one time password (OTP) to complete your transaction on Rupyo. The OTP is valid for 1 min. Do not share it with anyone. If not requested, contact Rupyo team.`;
    },

    // Employee welcome email
    employeeWelcomeEmail: (emailData) => {
        return `Dear ${emailData.employee_name} Welcome to the Rupyo, 
        your ${emailData.company_name} has activated Rupyo at your workplace, 
        please download the app to withdraw your earned salary on demand to make any day a payday. Android: ${global.env.PLAY_STORE_LINK}, Ios: ${global.env.APP_STORE_LINK}. Your employee ID is ${emailData.employee_id}.`;
    },

    // Employee welcome email to employer
    employeeWelcomeEmailToEmployer: (emailData) => {
        return `Dear ${emailData.company_name} your employee ${emailData.employee_name} has been added to the Rupyo App for ${emailData.company_name} on  ${emailData.date} and  ${emailData.time} with ${emailData.employee_id}.`;
    },

    // Employee welcome sms
    employeeWelcomeSMS: (smsData) => {

        return `Dear ${smsData.employee_name} Welcome to the Rupyo,  your employer ${smsData.company_name} ${smsData.rupyo_company_code} has activated Rupyo at your workplace, please download the app to withdraw your earned salary on demand and make any day a payday! Android: ${global.env.PLAY_STORE_LINK},  Ios: ${global.env.APP_STORE_LINK}`;
    },

    employerWelcomeSMS: (smsData) => {

        return `Dear ${smsData.employer_name} from  ${smsData.company_name} ${smsData.rupyo_company_code}, Welcome to the Rupyo! We are so glad to be able to help you support your employees and make any day a payday for them! To login to your account please click the link : https://portal.rupyo.in`;
    },

    updatedAttendance: (smsData) => {

        return `Dear, ${smsData.employee_name} ${smsData.employee_id}, your attendance has been updated. Please login to the Rupyo app for more details.`;
    },

    payoutCreditedSMS: (smsData) => {

        return `Dear, ${smsData.employee_name} ${smsData.employee_id}, as per your request ID ${smsData.request_id} for Rs. ${smsData.requested_amount}, Rupyo has CREDITED Rs. ${smsData.credited_amount} after deducting fees into your ${smsData.bank_name} Bank A/C ${smsData.account_number} on ${smsData.date} and ${smsData.time}. Please login to the Rupyo app for more details.`;
    }
};


// Get status value in string
let getStatusString = function (statusValue) {

    if (statusValue == _enum.status.get("active").value) {
        return "Active";
    }
    else if (statusValue == _enum.status.get("deactive").value) {
        return "Deactive";
    }
    else if (statusValue == _enum.status.get("pause").value) {
        return "Pause";
    }
    else if (statusValue == _enum.status.get("archive").value) {
        return "Archive"
    }
    else {
        return "";
    }
};


// Get month name
let getMonthName = (month) => {
    if (month == 1) {
        return "January";
    }
    else if (month == 2) {
        return "February";
    }
    else if (month == 3) {
        return "March";
    }
    else if (month == 4) {
        return "April";
    }
    else if (month == 5) {
        return "May";
    }
    else if (month == 6) {
        return "June";
    }
    else if (month == 7) {
        return "July";
    }
    else if (month == 8) {
        return "August";
    }
    else if (month == 9) {
        return "September";
    }
    else if (month == 10) {
        return "October";
    }
    else if (month == 11) {
        return "November";
    }
    else if (month == 12) {
        return "December";
    }
    else {
        return ""
    }
};



// Check gender
let checkGender = (gender) => {
    if (gender !== 'M' && gender !== 'F' && gender !== 'O') {
        throw new Error('Invalid Gender!')
    }
    return true
}


// Check Bank Account Type
let checkBankAccountType = (value) => {
    if (value !== 'S' && value !== 'C' && value !== 'O') {
        throw new Error('Invalid Bank Account Type!')
    }
    return true
}


// Module exports
module.exports = {
    message,
    notification,
    jwtTokenGenerate,
    shortJwtToken,
    otpGenerate,
    verifyOtp,
    randomString,
    encryptData,
    decryptData,
    printLogger,
    sorting,
    thisMonth,
    toDay,
    lastWeek,
    thisYear,
    lastYear,
    lastMonth,
    lastThreeMonth,
    thisWeek,
    dateFilter,
    customDateFilter,
    validationCsvFile,
    enumValue,
    getStatusString,
    getMonthName,
    jwtVerify,
    errData,
    checkGender,
    checkBankAccountType
}