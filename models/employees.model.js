const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const moment = require('moment');

const db = require('../database');
const otpModel = require('./otp.model');
const userModel = require('./user.model');
const companiesModel = require('./employer.model');
const notificationsController = require('../controllers/notifications.controller');
const { printLogger, sorting, notification, enumValue, thisMonth } = require('../core/utility');
const notificationsModel = require('./notifications.model');


// Employee schema
const employeesSchema = mongoose.Schema({});


// Employee sign in with aggregation
employeesSchema.statics.signInAdvance = (reqBody) => {
    return new Promise((resolve, reject) => {

        // let query = reqBody;
        let matchQuery = {
            $match: {
                $and: [
                    { "mobile_number": reqBody.mobile_number },
                    { "role_id": enumValue.employeeRoleId },
                    { "status": { $ne: enumValue.archiveStatus } }
                ]
            }
        }

        if (reqBody._id) {
            matchQuery = {
                $match: {
                    $and: [
                        { "_id": ObjectId(reqBody._id) },
                        { "role_id": enumValue.employeeRoleId },
                        { "status": { $ne: enumValue.archiveStatus } }
                    ]
                }
            }
        }

        let query = [
            matchQuery,
            {
                $addFields: { "company_id": { "$toObjectId": "$company_id" } }
            },
            {
                $lookup: {
                    from: "companies",
                    localField: "company_id",
                    foreignField: "_id",
                    as: "Company"
                }
            },

            { $unwind: "$Company" },
            {
                $project: {
                    "_id": 1,
                    "first_name": 1,
                    "last_name": 1,
                    "middle_name": 1,
                    "father_mother_name": 1,
                    "mobile_number": 1,
                    "password": 1,
                    //  "district":1,
                    "cibil_score": 1,
                    "gender": 1,
                    "basic_pay": 1,
                    "dob": 1,
                    "additional_pay": 1,
                    "selfie": 1,
                    "dob": 1,
                    "father_mother_name": 1,
                    "employee_payout_activation_date": 1,
                    "company_name": "$Company.company_name",
                    "employee_sys_id": 1,
                    "employee_id": 1,
                    "role_id": 1,
                    "email": 1,
                    "status": 1,
                    "last_swipe": 1, "calculated_last_swipe": 1, "company_id": 1, "work_shift_id": 1,
                    "employee_type": 1, "rupyo_credit_limit": 1, "credit_limit_type": 1,
                    "credit_limit_percent": 1, "firebase_device_token": 1, "aadhar_card": 1,
                    "pan_card": 1, "bank_details": 1, "address": 1, "opening_balance": 1, "net_deductions": 1,
                    "net_salary": 1, "salary_cycle": 1, "verification_status": 1,
                    "Company._id": 1,
                    "Company.set_payout_limit": 1, "Company.weekly_holiday": 1, "Company.company_logo": 1,
                    "Company.rupyo_company_code": 1, "Company.status": 1,
                    "Company.pan_card": 1, "Company.company_cin": 1,
                    "Company.gst_number": 1,
                    "Company.incorporation_date": 1,
                    "Company.gurantor_name": 1,
                    // "Company.partnership_firm_company_id": 1,
                    "Company.address": 1, "Company.rupyo_credit_limit": 1, "Company.company_size": 1,
                    "Company.employee_id_generation_method": 1, "Company.company_name": 1,
                    "Company.roc_type": 1,
                    "Company.transaction_charge_setting": 1,
                    "Company.employee_credit_limit_setting": 1,
                    //"address":1
                }
            },
            { "$sort": { created_at: -1 } },
        ]

        // Actual query
        db.collection('users').aggregate(query).toArray((error, result) => {
            if (error) {

                reject(error);
            }
            else {
                resolve(result);
            }
        })
    });
};


// Find employee all ready register email
employeesSchema.statics.findAlreadyExistEmployee = (reqBody) => {
    return new Promise((resolve, reject) => {


        // Log database query
        printLogger(2, "*******  Database Param  ********", 'employee');
        printLogger(2, `reqBody:-  ${reqBody}`, 'employee');

        let query = {};

        if (reqBody.url == '/createemployee' || reqBody.url == '/csvupload') {

            if (reqBody.email) {
                query.email = reqBody.email;
                query.role_id = { $in: [enumValue.rupyoAdminRoleId, enumValue.employerRoleId, enumValue.employeeRoleId] };
            }
        }
        else if (reqBody.email) {

            query.email = reqBody.email;
            query.role_id = enumValue.employeeRoleId;
        }
        else if (reqBody.employee_id) {

            query._id = ObjectId(reqBody.employee_id);
            query.role_id = enumValue.employeeRoleId;
        }
        else if (reqBody.employee_manual_id) {

            query.employee_id = reqBody.employee_manual_id;
            query.company_id = reqBody.company_id;
            query.role_id = enumValue.employeeRoleId;
        }


        // Projection
        let projection = { "__v": 0, "password": 0 };

        // Log database query
        printLogger(2, "*******  Database Query  ********", 'employee');
        printLogger(2, `Query:-  ${query}`, 'employee');


        if ((reqBody.url == '/createemployee' || reqBody.url == '/csvupload') && !reqBody.email) {
            resolve(null)
        }
        else {

            userModel.findOne(query, projection, (error, result) => {
                if (error) {

                    printLogger(0, error, 'employee');
                    reject(error);
                }
                else {

                    printLogger(2, result, 'employee');
                    resolve(result);
                }
            })
        }
    })
};


// Bulk insert employee and create employee
employeesSchema.statics.bulkInsertEmployee = (employeeData) => {
    return new Promise((resolve, reject) => {

        userModel.insertMany(employeeData, (error, result) => {
            if (error) {

                reject(error);
            }
            else {
                resolve(result);
            }

        });
    });
};


// EmployeeList get
employeesSchema.statics.employeesList = (reqBody, companyId) => {
    return new Promise((resolve, reject) => {

        /** Pagination and searching page size 20
         * let sort_by_column and order -1 or 1 
         * 1 (ascending order) and -1 (descending order);
         */

        let currentPage = reqBody.page ? parseInt(reqBody.page) : 1;
        let perPage = reqBody.page_size ? parseInt(reqBody.page_size) : 20;
        let skip = (currentPage - 1) * perPage;

        // Sorting
        let sortBy = reqBody.sort_by === 'ascending' ? 1 : -1;
        let sortByColumn = reqBody.sort_by_column;
        let sortQuery = sorting(sortByColumn, sortBy);


        let currentYear = parseInt(moment().utc().format('YYYY'));
        let currentMonth = parseInt(moment().utc().format('M'));
        let today = parseInt(moment().utc().format('D'));
        let lastDate = parseInt(moment().utc().endOf('month').format('D'));

        let query = {
            role_id: enumValue.employeeRoleId,
            status: { $ne: enumValue.archiveStatus }
        };

        // Searching by first name, middle name, last name 
        if (reqBody.search_name) {
            query = {
                $or: [
                    { first_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { middle_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { last_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { full_name: { $regex: `^${reqBody.search_name}`, $options: "i" } }
                ]
            };
            query.role_id = enumValue.employeeRoleId
            query.status = { $ne: enumValue.archiveStatus }
        }

        // Filter by status and employee type
        if (reqBody.status_filter || reqBody.employee_type || companyId) {

            if (reqBody.status_filter) {
                query.status = parseInt(reqBody.status_filter)
            }

            if (reqBody.employee_type) {
                query.employee_type = parseInt(reqBody.employee_type)
            }
            if (companyId) {
                query.company_id = companyId
            }
        }


        let matchQuery = [
            {
                $addFields: { "company_id": { "$toObjectId": "$company_id" } }
            },
            {
                $lookup: {
                    from: "companies",
                    localField: "company_id",
                    foreignField: "_id",
                    as: "Company"
                }
            },
            { $unwind: "$Company" },
            {
                $addFields: { "company_id": { "$toString": "$company_id" } }
            },
            {
                $project: {
                    "_id": 1,
                    "first_name": 1,
                    "middle_name": 1,
                    "last_name": 1,
                    "mobile_number": 1,
                    "selfie": 1,
                    "dob": {
                        $cond: {
                            if: {
                                $eq: ["$dob", undefined]
                            },
                            then: "",
                            else: "$dob"
                        }
                    },
                    "father_mother_name": 1,
                    "last_swipe": 1,
                    // "district":1,
                    "cibil_score": 1,
                    "gender": 1,
                    "calculated_last_swipe": 1,
                    "created_at": 1,
                    "company_name": "$Company.company_name",
                    "employee_sys_id": 1,
                    "employee_id": 1,
                    "role_id": 1,
                    "email": 1,
                    "status": 1,
                    "company_id": 1,
                    "employee_payout_activation_date": 1,
                    "work_shift_id": 1,
                    "employee_type": 1,
                    "rupyo_credit_limit": {
                        $cond: {
                            if: {
                                $eq: ["$credit_limit_type", enumValue.percentBaseType]
                            },
                            then: { $toInt: { $divide: [{ $toInt: { $multiply: [{ $toInt: "$net_salary" }, { $toInt: "$credit_limit_percent" }] } }, 100] } },
                            else: "$rupyo_credit_limit"
                        }
                    },
                    "credit_limit_type": 1,
                    "credit_limit_percent": 1,
                    "net_salary": 1,
                    "net_deductions": 1,
                    "opening_balance": 1,
                    "net_pay_per_day": { $toInt: { $divide: [{ $toInt: "$net_salary" }, lastDate] } },
                    "firebase_device_token": 1,
                    "basic_pay": 1,
                    "additional_pay": 1,
                    "address": 1,
                    "salary_cycle": 1,
                    "verification_status": 1,
                    "payout_till_now": { $toInt: "$payout_credited" },
                    "present_total": "$presents_count",
                    "absent_total": "$absents_count",
                    "half_total": "$half_days_count",
                    "leave_total": "$leaves_count",
                    "amount_earned": {
                        $cond: {
                            if: {
                                $eq: ["$earned_amount", NaN]
                            },
                            then: 0,
                            else: { $toInt: "$earned_amount" }
                        }
                    },
                    "Company": 1,
                    "full_name": {
                        $cond: {
                            if: {
                                $eq: ["$middle_name", ""]
                            },
                            then: { $concat: ["$first_name", " ", "$last_name"] },
                            else: { $concat: ["$first_name", " ", "$middle_name", " ", "$last_name"] }
                        }
                    }
                }
            },
            { $match: query }//,
            // { $sort: sortQuery },
            // { $skip: skip },
            // { $limit: perPage },
        ]

        // Count Document
        db.collection("users").aggregate(matchQuery).toArray((error, countResult) => {
            if (error) {
                reject(error);
            }
            else {
                let total = countResult[0] === undefined ? 0 : countResult.length;

                // Add sort, skip and limit condition in match query
                matchQuery.push({ $sort: sortQuery })
                matchQuery.push({ $skip: skip })
                matchQuery.push({ $limit: perPage })

                db.collection('users').aggregate(matchQuery, { collation: { locale: 'en_US', strength: 2 } }).toArray((error, result) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        let _result = {
                            "total": total,
                            "result": result
                        };
                        resolve(_result);
                    }
                });
            }
        })
    });
};


// Employee find
employeesSchema.statics.findEmployee = (data) => {
    return new Promise((resolve, reject) => {

        let query = {};

        // Check employee id and mobile number 

        if (data.url === '/findemployee') {
            query = {
                $and: [{
                    "_id": ObjectId(data.employee_id),
                    "role_id": enumValue.employeeRoleId
                }]
            };
        }
        else if (data.employee_id) {

            query = {
                $and: [{
                    "_id": ObjectId(data.employee_id),
                    "role_id": enumValue.employeeRoleId,
                    "status": { $ne: enumValue.archiveStatus }
                }]
            };
        }
        else {

            query = {
                $and: [{
                    "mobile_number": parseInt(data.mobile_number),
                    "role_id": enumValue.employeeRoleId
                }]
            };
        }

        let matchQuery = [
            { $match: query },
            {
                $addFields: { "company_id": { "$toObjectId": "$company_id" } }
            },
            {
                $lookup: {
                    from: "companies",
                    localField: "company_id",
                    foreignField: "_id",
                    as: "Company"
                }
            },

            { $unwind: "$Company" },
            {
                $project: {
                    "_id": 1,
                    "first_name": 1,
                    "middle_name": 1,
                    "last_name": 1,
                    "mobile_number": 1,
                    "email": 1,
                    "password": 1,
                    "selfie": 1,
                    "dob": 1,
                    // "district":1,
                    "cibil_score": 1,
                    "gender": 1,
                    "father_mother_name": 1,
                    "company_name": "$Company.company_name",
                    "rupyo_company_code": "$Company.rupyo_company_code",
                    "employee_sys_id": 1,
                    "employee_payout_activation_date": 1,
                    "employee_id": 1,
                    "role_id": 1,
                    "status": 1,
                    "verification_status": 1,
                    "company_id": 1,
                    "work_shift_id": 1,
                    "employee_type": 1,
                    "rupyo_credit_limit": 1,
                    "credit_limit_type": 1,
                    "basic_pay": 1,
                    "additional_pay": 1,
                    "net_deductions": 1,
                    "net_salary": 1,
                    "credit_limit_percent": 1,
                    "firebase_device_token": 1,
                    "pan_card": 1,
                    "aadhar_card": 1,
                    "bank_details": 1,
                    "address": 1,
                    "opening_balance": 1,
                    "salary_cycle": 1,
                    "payout_credited": 1,
                    "earned_amount": 1,
                    "Company": 1,
                    "last_swipe": 1,
                    "calculated_last_swipe": 1,
                }
            }

        ]


        db.collection('users').aggregate(matchQuery).toArray((error, result) => {
            if (error) {
                reject(error);
            }
            else {
                let _result = result.length > 0 ? result[0] : null;
                resolve(_result);
            }
        })
    })
};


// Find employee status
employeesSchema.statics.employeeStatus = (result) => {
    return new Promise((resolve, reject) => {
        let matchQuery;
        if (result) {
            matchQuery = {
                $match: {
                    $and: [
                        { "company_id": result.company_id },
                        { "role_id": { $eq: enumValue.employeeRoleId } },
                        { "status": { "$in": [enumValue.activeStatus, enumValue.deactiveStatus, enumValue.pauseStatus] } }

                    ]
                }
            }
        }
        else {
            matchQuery = {
                $match: {
                    $and: [
                        { "role_id": { $eq: enumValue.employeeRoleId } },
                        { "status": { "$in": [enumValue.activeStatus, enumValue.deactiveStatus, enumValue.pauseStatus] } }
                    ]
                }
            }
        }

        // Employee status
        db.collection('users')
            .aggregate([
                matchQuery,
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                },
                { $sort: { status: -1 } }
            ]).toArray((error, result) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(result);
                }
            });
    })
};


// Find employee status (filter and search)
employeesSchema.statics.employeeStatusFilter = (reqBody) => {
    return new Promise((resolve, reject) => {

        let query = {};
        let userId = [];

        // Projections
        let projections = { first_name: 1, middle_name: 1, last_name: 1, rupyo_credit_limit: 1, _id: 1, status: 1, company_id: 1, employee_id: 1 };


        query.role_id = enumValue.employeeRoleId;
        query.status = { "$in": [enumValue.activeStatus, enumValue.deactiveStatus, enumValue.pauseStatus] };

        // Filters
        // Searching by employee name and company name
        if (reqBody.search_name) {
            query = {
                $and: [
                    { role_id: enumValue.employeeRoleId }, {
                        $or: [
                            { first_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                            { middle_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                            { last_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                            { company_name: { $regex: `^${reqBody.search_name}`, $options: "i" } }]
                    }
                ]
            };
        }

        if (reqBody.status_filter.length > 0) {
            query.status = { "$in": reqBody.status_filter };
        }

        if (reqBody.company_id.length > 0) {
            query.company_id = { "$in": reqBody.company_id };
        }

        if (userId.length > 0) {
            query._id = { "$in": userId };
        }


        db.collection('users')
            .find(query)
            .sort({ "created_at": -1 })
            .project(projections)
            .toArray((error, result) => {
                if (error) {

                    reject(error);
                }
                else {

                    resolve(result);
                }
            })
    })
};


// Update employee
employeesSchema.statics.updateEmployee = (reqBody, data) => {
    return new Promise((resolve, reject) => {
        //  console.log("data", reqBody.father_mother_name);
        // Convert to object id
        let query = {
            "_id": ObjectId(reqBody.employee_object_id)
        };
        let details = {
            $set: {
                "first_name": reqBody.first_name,
                "middle_name": reqBody.middle_name,
                "last_name": reqBody.last_name,
                "father_mother_name": reqBody.father_mother_name,
                "dob": reqBody.dob,
                "gender": reqBody.gender,
                "cibil_score": reqBody.cibil_score,
                //  "district": reqBody.district,
                //     "mobile_number": reqBody.mobile_number,
                "salary_cycle": reqBody.salary_cycle,
                "net_salary": reqBody.net_salary,
                "net_deductions": reqBody.net_deductions,
                "basic_salary": reqBody.basic_salary,
                "opening_balance": reqBody.opening_balance,
                "rupyo_credit_limit": reqBody.rupyo_credit_limit,
                "credit_limit_type": reqBody.credit_limit_type,
                "credit_limit_percent": reqBody.credit_limit_percent,
                "basic_pay": reqBody.basic_pay,
                "additional_pay": reqBody.additional_pay,
                "work_shift_id": reqBody.work_shift_id,
                "employee_type": reqBody.employee_type,
                "aadhar_card": reqBody.aadhar_card,

                "address": {
                    "address_1": reqBody.address_1,
                    "address_2": reqBody.address_2,
                    "pincode": reqBody.pincode,
                    "city": reqBody.city,
                    "state": reqBody.state,
                    "country": reqBody.country,
                    "district": reqBody.district,
                },
                "bank_details": {
                    "bank_name": data.encryptDetail.bank_name,
                    "account_number": data.encryptDetail.account_number,
                    "ifsc_code": data.encryptDetail.ifsc_code,
                    "branch_name": data.encryptDetail.branch_name,
                    "bank_account_type": data.encryptDetail.bank_account_type,
                    "name_in_bank": data.encryptDetail.name_in_bank
                },
                "pan_card": data.encryptDetail.pan_card,
                "updated_by": data.userData._id
            }
        }
        userModel.findOneAndUpdate(query, details, (error, result) => {
            if (error) {

                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};


// Update creditlimit
employeesSchema.statics.employeeCreditLimit = (reqBody, employeeId, userData) => {
    return new Promise((resolve, reject) => {

        let rupyoCreditLimit = reqBody.rupyo_credit_limit;

        if (parseInt(reqBody.type) === enumValue.percentBaseType) {

            rupyoCreditLimit = parseInt((reqBody.net_salary * reqBody.percent) / 100) || 1;
        }

        if (reqBody.percent == "") {
            reqBody.percent = 0;
        }

        let creditLimitObj = {
            $set: {
                "rupyo_credit_limit": rupyoCreditLimit,
                "credit_limit_type": parseInt(reqBody.type),
                "credit_limit_percent": parseInt(reqBody.percent),
                "updated_by": userData._id
            }
        };

        // console.log("creditLimitObj:- ",creditLimitObj)

        userModel.updateMany({ _id: { $in: employeeId } }, creditLimitObj, (error, result) => {

            if (error) {

                // console.log(error)
                reject(error);
            }
            else {
                let notifications = saveNotificationCreditLimit(employeeId, userData, reqBody);

                resolve(result);
            }
        });
    })
};


// Change employee status
employeesSchema.statics.changeStatus = (reqBody, userData) => {
    return new Promise((resolve, reject) => {

        let employee_id = reqBody.employee_id;
        let employeeId = [];
        for (let i = 0; i < employee_id.length; i++) {
            employeeId.push(ObjectId(employee_id[i]));
        }

        let statusObj = { $set: { status: reqBody.status, "updated_by": userData._id } };

        userModel.updateMany({ _id: { $in: employeeId } }, statusObj, (error, result) => {

            if (error) {

                reject(error);
            }
            else {

                let notifications = saveNotificationChangeStatus(employeeId, userData)
                resolve(result);
            }
        });

    })
};


// Rupyo mobile app
// Create employee registeration and otp generate
// Check company code
employeesSchema.statics.employeeCompanyCode = (reqBody) => {
    return new Promise((resolve, reject) => {

        let query = { rupyo_company_code: reqBody.company_code };

        // Projection
        let projection = { "__v": 0, "password": 0 };

        // Find company code in companies collection
        companiesModel.findOne(query, projection, (error, result) => {
            if (error) {
                reject(error);
            } else {

                resolve(result);
            }
        })
    })
};


// Check mobile number
employeesSchema.statics.employeeMobileNumber = (reqBody) => {
    return new Promise((resolve, reject) => {

        let query = {
            "mobile_number": reqBody.mobile_number,
            "role_id": enumValue.employeeRoleId,
            "status": { $ne: enumValue.archiveStatus }
        }

        if (reqBody.company_id) {
            query.company_id = reqBody.company_id
        }

        // Projection
        let projection = { "__v": 0, "password": 0 };

        // Find mobile number in user collection
        userModel.findOne(query, projection, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })

};


// Employee update verifications status
employeesSchema.statics.updateVerificationStatus = (result) => {
    return new Promise((resolve, reject) => {

        // Verify otp status using enum 
        let verificationStatus = {
            $set: {
                verification_status: result.verification_status
            }
        };

        let query = {};
        if (result._id) {
            query = {
                "_id": ObjectId(result._id),
                "role_id": enumValue.employeeRoleId
            };
        }
        else {
            query = {
                "mobile_number": result.mobile_number,
                "status": { $ne: enumValue.archiveStatus },
                "role_id": enumValue.employeeRoleId
            }
        }

        // Find mobile number in user collection and update verification status 
        userModel.findOneAndUpdate(query, verificationStatus, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })
    });
};


// Employee create pin || Employee reset pin
employeesSchema.statics.generatePin = (data) => {
    return new Promise((resolve, reject) => {

        let query;
        let _data;

        if (data.mobile_number) {
            query = {
                "mobile_number": parseInt(data.mobile_number),
                "status": { $ne: enumValue.archiveStatus }
            };

            _data = {
                $set: {
                    password: data.password,
                    verification_status: enumValue.pinStatus
                }
            };
        }
        else {

            // Convert to objectId
            query = {
                "_id": ObjectId(data.user_id)
            };
            _data = {
                $set: {
                    password: data.password
                }
            };
        }


        // Update the password 
        userModel.findOneAndUpdate(query, _data, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        });
    });
};


// Signin employee
employeesSchema.statics.signIn = (reqBody) => {
    return new Promise((resolve, reject) => {

        let query = reqBody;
        if (reqBody._id) {
            query = {
                "_id": ObjectId(reqBody._id)
            }
        }

        query.role_id = enumValue.employeeRoleId
        query.status = { $ne: enumValue.archiveStatus }

        // Find company code in companies collection
        userModel.findOne(query, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })
    });
};


// Bank details employee // Dont use plzz check remve this method
employeesSchema.statics.bankDetails = (data) => {
    return new Promise((resolve, reject) => {

        // Query
        let query = {
            _id: ObjectId(data.user_id),
            role_id: enumValue.employeeRoleId
        };

        // Projection
        let projection = { "__v": 0, "password": 0 };

        // Find by _id
        userModel.findOne(query, projection, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        });
    });
};


// Employee verify details
employeesSchema.statics.verifyBankDetail = (data) => {
    return new Promise((resolve, reject) => {

        // Convert the object id
        let query = {
            _id: ObjectId(data.user_id)
        };

        let _data = {
            $set: {
                verification_status: data.verificationstatus,
                status: data.status
            }
        };

        // Find one and update 
        userModel.findOneAndUpdate(query, _data, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })
    });
};


// Employee selfie
employeesSchema.statics.takeSelfie = (data) => {
    return new Promise((resolve, reject) => {

        // Convert the object id
        let query = {
            "_id": ObjectId(data.user_id)
        };

        // Set verification status by using enum
        let _data = {
            $set:
            {
                "selfie": data.filename,
                "verification_status": enumValue.selfie
            }
        };

        // Find one  and update 
        userModel.findOneAndUpdate(query, _data, (error, result) => {

            if (error) {

                reject(error);
            } else {

                resolve(result);
            }
        })
    })
};


// Employee profile get data
employeesSchema.statics.employeeProfile = (data) => {
    return new Promise((resolve, reject) => {

        // Query
        let query = { "_id": ObjectId(data.user_id) };

        // Projection
        let projection = { "__v": 0, "password": 0 };

        // Find by _id
        userModel.findOne(query, projection, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        });
    });
};


// Change pin
employeesSchema.statics.changePin = (reqData, _newPin) => {
    return new Promise((resolve, reject) => {

        let query = {
            "_id": ObjectId(reqData._id)
        };

        let data = {
            $set: { "password": _newPin }
        }

        userModel.findOneAndUpdate(query, data, (error, result) => {
            if (error) {

                reject(error);
            } else {

                resolve(result);
            }
        })
    })
};


// This shift register employee check
employeesSchema.statics.shiftRegisterEmployeeCheck = (data) => {
    return new Promise((resolve, reject) => {

        let matchQuery = {
            $match: {
                $and: [
                    { "work_shift_id": data.work_shift_id },
                    { "role_id": { $eq: enumValue.employeeRoleId } }
                ]
            }
        }

        // Employee status
        db.collection('users')
            .aggregate([
                matchQuery,
                {
                    $group: {
                        _id: "$work_shift_id",
                        count: { $sum: 1 }
                    }
                },
                { $sort: { work_shift_id: -1 } }
            ]).toArray((error, result) => {
                if (error) {
                    reject(error);
                }
                else {

                    resolve(result);
                }
            });
    })

};

// Update work shift name by employee // At a time dont use
employeesSchema.statics.workShiftName = (reqBody, userData) => {
    return new Promise((resolve, reject) => {

        // Convert to object id
        let query = {
            "_id": ObjectId(reqBody.user_id)
        };
        let details = {
            $set: {

                "work_shift_name": reqBody.shift_name,
                "work_shift_id": reqBody.workshift_id,
                "updated_by": userData._id
            }
        }
        userModel.findOneAndUpdate(query, details, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })
};



// Update manual employee registation process
employeesSchema.statics.updateManualEmployeeRegistation = (query, updateData) => {
    return new Promise((resolve, reject) => {

        let _updateData = {
            $set: updateData
        }

        userModel.findOneAndUpdate(query, _updateData, (error, result) => {
            if (error) {

                reject(error);
            } else {

                resolve(result);
            }
        })
    })
};


//  Save notifications change status
saveNotificationChangeStatus = async (employeeId, userData) => {

    let notificationsData = [];
    for (let i = 0; i < employeeId.length; i++) {
        let query = { "_id": ObjectId(employeeId[i]), "role_id": enumValue.employeeRoleId };

        let result = await userModel.findOne(query);
        let statusResult = parseInt(result.status)

        let status = statusResult === enumValue.pauseStatus ? "Paused" : statusResult === enumValue.deactiveStatus ? "Deactive" : statusResult === enumValue.archiveStatus ? "Archive" : statusResult === enumValue.activeStatus ? "Active" : "Paused";

        let statusData = {
            "deactivated": status
        };

        // Notications Calling and send
        // Employee infrom
        let changeStatusNotifications = notification.employerAccountWhenInactive(statusData);

        // Notification store rupyoadmin
        notificationsData.push({
            "user_id": result._id,
            "company_id": result.company_id,
            "message": changeStatusNotifications,
            "request_id": result._id,
            "resource_type": enumValue.changeStatus,
            "status": enumValue.accountStatus,
            "for_notifications": enumValue.employeeRoleId,
            "created_by": userData._id

        });
    }
    notificationsModel.bulkInsert(notificationsData);
};


//  Save notifications credit limit
saveNotificationCreditLimit = async (employeeId, userData, reqBody) => {

    let notificationsData = [];
    for (let i = 0; i < employeeId.length; i++) {
        let query = { "_id": ObjectId(employeeId[i]) };

        let result = await userModel.findOne(query);


        let creditLimitData = { "rupyo_credit_limit": reqBody.rupyo_credit_limit };

        // Notications Calling and send
        // Employee infrom
        let updateCreditLimitNotifications = notification.updateCreditLimitOfEmployee(creditLimitData);

        // Notification store rupyoadmin
        notificationsData.push({
            "user_id": result._id,
            "company_id": result.company_id,
            "message": updateCreditLimitNotifications,
            "resource_type": enumValue.creditLimit,
            "request_id": result._id,
            "status": result.status,
            "for_notifications": enumValue.employeeRoleId,
            "created_by": userData._id

        });
    }
    notificationsModel.bulkInsert(notificationsData);
};


// Update last swipe time
employeesSchema.statics.updateEmployeeLastSwipe = (data) => {
    return new Promise((resolve, reject) => {

        let query = { _id: ObjectId(data.employee_id) };


        let updateData = {
            $set: {
                is_punch_in_punch_out: data.isPunch,
                calculated_last_swipe: data.calculatedLastSwipe
            }
        };

        if (data.lastSwipe) {

            updateData = {
                $set: {
                    is_punch_in_punch_out: data.isPunch,
                    last_swipe: data.lastSwipe,
                    calculated_last_swipe: data.calculatedLastSwipe
                }
            };
        }

        //db.collection('users')
        userModel.updateOne(query, updateData, (error, result) => {
            if (error) {

                reject(error)
            }
            else {

                resolve(result)
            }
        })
    })
};


// Number of employee count
employeesSchema.statics.employeeCount = (result) => {
    return new Promise((resolve, reject) => {
        let query = {
            "status": { $ne: enumValue.archiveStatus },
            "company_id": result.company_id,
            "role_id": enumValue.employeeRoleId
        }

        // Employee  count
        db.collection('users')
            .aggregate([
                {
                    $match: query
                },

                { $count: "company_id" },

                { "$sort": { payout_credited: -1 } }
            ]).toArray((error, result) => {

                if (error) {
                    reject(error);
                }
                else {
                    resolve(result);
                }
            })
    })
};



// Number of employee count
employeesSchema.statics.companyEmployeesStatus = (result) => {
    return new Promise((resolve, reject) => {
        let query = {
            "status": { $ne: enumValue.archiveStatus },
            "company_id": result.company_id,
            "role_id": enumValue.employeeRoleId
        }

        // Employee  count
        db.collection('users')
            .aggregate([
                {
                    $match: query
                },
                {
                    $facet: {

                        // Total employee count
                        employee_count: [
                            { $count: "company_id" },
                        ],

                        // Total active employee count                        
                        active_employee: [
                            {
                                $match: { status: enumValue.activeStatus }
                            },
                            { $count: "company_id" }
                        ],

                        // Number of employee payout
                        number_of_payout: [

                            // { $count: "payout_credited" }
                            {
                                $group:
                                {
                                    _id: "$payout_credited",
                                    payout_credited: { $sum: 1 }
                                }
                            }
                        ],

                        // Total amount paid this company
                        total_amount_paid: [
                            {
                                $group:
                                {
                                    _id: null,
                                    payout_credited: { $sum: "$payout_credited" }
                                }
                            }
                        ]
                    }
                },


                { "$sort": { created_at: -1 } }
            ]).toArray((error, result) => {

                if (error) {
                    reject(error);
                }
                else {

                    resolve(result);
                }
            })
    })
};


// Update many
employeesSchema.statics.updateMultiple = (reqBody, setData) => {
    return new Promise((resolve, reject) => {

        let employee_id = reqBody.employee_id;
        let employeeId = [];

        for (let i = 0; i < employee_id.length; i++) {
            employeeId.push(ObjectId(employee_id[i]));
        }

        let setDataObj = { $set: setData };

        userModel.updateMany({ _id: { $in: employeeId } }, setDataObj, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        });
    })
};


// Employees report (Employer wise)
employeesSchema.statics.companyWiseEmployeeReport = (reqFilter) => {
    return new Promise((resolve, reject) => {

        let query = {
            "role_id": enumValue.employeeRoleId
        };

        // Filter by company id
        if (reqFilter.company_id) {
            query.company_id = reqFilter.company_id;
        }

        // Filter by status
        if (reqFilter.status) {
            query.status = parseInt(reqFilter.status);
        }

        // console.log("query:- ", query)


        let aggregateQuery = [
            { $match: query },
            {
                $addFields: { "company_id": { "$toObjectId": "$company_id" } }
            },
            {
                $lookup: {
                    from: "companies",
                    localField: "company_id",
                    foreignField: "_id",
                    as: "Company"
                }
            },

            { $unwind: "$Company" },
            {
                $project: {
                    "_id": 1,
                    "employee_id": 1,
                    "first_name": 1,
                    "middle_name": 1,
                    "last_name": 1,
                    "dob": 1,
                    //"district": 1,
                    "cibil_score": 1,
                    "gender": 1,
                    "father_mother_name": 1,
                    "company_name": "$Company.company_name",
                    "company_id": 1,
                    "email": 1,
                    "mobile_number": 1,
                    "role_id": 1,
                    "status": 1,
                    "basic_pay": 1,
                    "additional_pay": 1,
                    "net_deductions": 1,
                    "net_salary": 1,
                    "salary_cycle": 1,
                    "bank_name": "$bank_details.bank_name",
                    "account_number": "$bank_details.account_number",
                    "ifsc_code": "$bank_details.ifsc_code",
                    "name_in_bank": "$bank_details.name_in_bank",
                    "bank_account_type": "$bank_details.bank_account_type",
                    "branch_name": "$bank_details.branch_name",
                    "pan_card": 1,
                    "earned_amount": 1,
                    "payout_credited": 1,
                    "days_worked_till_now": 1,
                    "aadhar_card": 1,
                    "address": 1
                }
            }
        ]

        // userModel.find(query, (error, result) => {
        db.collection('users').aggregate(aggregateQuery)
            .toArray((error, result) => {
                if (error) {

                    reject(error);
                }
                else {

                    resolve(result);
                }
            });
    })
};



// All employees
employeesSchema.statics.allEmployees = (reqFilter) => {
    return new Promise((resolve, reject) => {

        let query = {
            "role_id": enumValue.employeeRoleId
        };

        db.collection('users').find(query)
            .project({ "employee_id": 0, }).toArray((error, result) => {
                if (error) {
                    reject(error);
                }
                else {

                    resolve(result);
                }
            })
    })
};




// Find employees by company id
employeesSchema.statics.findEmployeesByCompanyId = (reqData) => {
    return new Promise((resolve, reject) => {
        let query = {
            "company_id": (reqData.company_id).toString(),
            "role_id": enumValue.employeeRoleId,
            "status": { $ne: enumValue.archiveStatus }
        }

        db.collection('users').find(query).toArray((error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};




// Module exports
module.exports = mongoose.model('employee', employeesSchema);