const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const util = require('util');
const moment = require('moment');

const userModel = require('./user.model');
const db = require('../database');
const { notification, sorting, enumValue } = require('../core/utility');
const notificationsModel = require('./notifications.model');
const WorkShiftModel = require('./workshift.model');


// Company Schema
const companySchema = mongoose.Schema({

    company_name: {
        type: String,
        required: true
    },

    company_logo: {
        type: String
    },

    rupyo_company_code: {
        type: String,
        required: true,
        unique: true
    },

    status: {
        type: Number
    },

    bank_details: {
        bank_name: {
            type: String,
            required: true
        },

        account_number: {
            type: String,
            required: true
        },

        ifsc_code: {
            type: String,
            required: true
        },
        branch_name: {
            type: String,
            required: true
        },

        bank_account_type: {
            type: String,
            required: true
        }
    },

    pan_card: {
        type: String,
        required: true
    },

    company_cin: {
        type: String,
        required: true
    },

    // Registrar of Companies type
    roc_type: {
        type: Number,
        required: true
    },

    address: {
        address_1: {
            type: String
        },

        address_2: {
            type: String
        },

        pincode: {
            type: Number
        },

        city: {
            type: String
        },

        state: {
            type: String
        },

        country: {
            type: String
        }
    },

    rupyo_credit_limit: {
        type: Number,
        required: true
    },

    // company_size: {
    //     type: String,
    //     required: true
    // },

    // employee_payout_count
    set_payout_limit: {
        type: Number,
        default: 1
    },

    // 1 = auto-generated,  2 = employer-allocated
    employee_id_generation_method: {
        type: Number
    },

    weekly_holiday: {
        type: Array,
        required: true
    },

    payout_credited_count: {
        default: 0,
        type: Number
    },

    payout_credited_amount: {
        default: 0,
        type: Number
    },
    gst_number: {
        type: String
    },
    incorporation_date: {
        type: Date
    },
    gurantor_name: {
        type: String
    },

    // transaction charge (Rupyo v2)
    transaction_charge_setting: [
        {
            year: Number,

            month: Number,

            employer_pay_transaction_charge: {
                type: Boolean,
                default: false,
            },

            transaction_deduction_percent: {
                type: Number,
                default: global.env.TRANSACTION_DEDUCTION_PERCENT
            },

            activation_date: Date,

            last_changed_date: Date
        }
    ],


    // Employee credit limit (Rupyo v2)
    employee_credit_limit_setting: [
        {
            year: Number,

            month: Number,

            credit_limit_type: {
                type: Number,
                default: enumValue.monthWiseCreditLimit
            },

            credit_limit_percent: {
                type: Number,
                default: 50
            },

            activation_date: Date,

            last_changed_date: Date
        }
    ],


    // // Transaction deduction percent (Rupyo v2)
    // transaction_deduction_setting: [
    //     {
    //         year: Number,

    //         month: Number,

    //         transaction_deduction_percent: {
    //             type: Number,
    //             default: global.env.TRANSACTION_DEDUCTION_PERCENT
    //         },

    //         activation_date: Date,

    //         last_changed_date: Date
    //     }
    // ],

    created_by: String,

    updated_by: String
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });


// Find company
companySchema.statics.findEmployer = (reqBody) => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- findEmployer **************** `, "employer");

        let query;
        if (reqBody.url == '/createemployer') {
            query = {
                $and: [{
                    "email": reqBody.email,
                    "role_id": { $in: [enumValue.rupyoAdminRoleId, enumValue.employerRoleId, enumValue.employeeRoleId] }
                }]
            };
        }
        else if (reqBody.email) {
            query = {
                $and: [{
                    "email": reqBody.email,
                    "role_id": enumValue.employerRoleId
                }]
            };
        }
        else if (reqBody.mobile_number) {
            query = {
                $and: [{
                    "mobile_number": reqBody.mobile_number,
                    "role_id": enumValue.employerRoleId
                }]
            };
        }
        else {
            query = {
                $and: [{
                    "company_id": reqBody.company_id,
                    "role_id": enumValue.employerRoleId
                }]
            };
        }

        printLogger(2, `Query:- ${util.inspect(query)}`, "employer");

        userModel.findOne(query, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })
};


// Create company
companySchema.statics.createCompany = (companyData) => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- createCompany **************** `, "employer");

        // Company object
        let Company = mongoose.model('companies', companySchema);

        // Create company
        let company = Company(companyData);
        company.save((error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        })
    })
};


// Create employer
companySchema.statics.createEmployer = (employerData) => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- createEmployer **************** `, "employer");

        // User object
        let employer = userModel(employerData);
        employer.save((error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};


// Delete company details
companySchema.statics.deleteCompanyDetails = (companyDetails) => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- deleteCompanyDetails **************** `, "employer");

        let query = companyDetails

        // Company object
        let Company = mongoose.model('companies', companySchema);

        Company.deleteOne(query, (error, result) => {

            if (error) {

                reject(error)
            }
            else {

                resolve(result)
            }
        })
    })
};


// Update employer
companySchema.statics.updateEmployer = (reqBody, data) => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- updateEmployer **************** `, "employer");

        let query = {
            "_id": ObjectId(reqBody.user_id)
        };

        let _data = {
            $set: {
                "first_name": reqBody.first_name,
                "middle_name": reqBody.middle_name,
                "last_name": reqBody.last_name,
                "mobile_number": reqBody.mobile_number,
                "company_name": reqBody.company_name,
                "updated_by": data.userData._id
            }
        };

        // Update employer data
        userModel.findOneAndUpdate(query, _data, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                if (result == null && result == undefined) {
                    reject(error)
                }
                else {
                    let query = {
                        "_id": ObjectId(result.company_id)
                    };
                    let _data = {
                        $set: {
                            "company_name": reqBody.company_name,
                            "gurantor_name":reqBody.gurantor_name,
                            "incorporation_date":reqBody.incorporation_date,
                            "gst_number":reqBody.gst_number,                            
                            "bank_details": {
                                "bank_name": data.encrypted_field.bank_name,
                                "account_number": data.encrypted_field.account_number,
                                "ifsc_code": data.encrypted_field.ifsc_code,
                                "branch_name": data.encrypted_field.branch_name,
                                "bank_account_type": data.encrypted_field.bank_account_type
                            },
                            "pan_card": data.encrypted_field.pan_card,
                            "company_cin": data.encrypted_field.company_cin,
                            "roc_type": reqBody.roc_type,
                            "address": {
                                "address_1": reqBody.address_1,
                                "address_2": reqBody.address_2,
                                "pincode": reqBody.pincode,
                                "city": reqBody.city,
                                "state": reqBody.state,
                                "country": reqBody.country
                            },
                            "set_payout_limit": reqBody.set_payout_limit,
                            "rupyo_credit_limit": reqBody.rupyo_credit_limit,
                            "updated_by": data.userData._id,
                            "weekly_holiday": reqBody.weekly_holiday,
                            "employee_id_generation_method": reqBody.employee_id_generation_method,
                            "transaction_charge_setting": reqBody.transaction_charge_setting,
                            "employee_credit_limit_setting": reqBody.employee_credit_limit_setting
                        }
                    };

                    // Company Object
                    let Company = mongoose.model('companies', companySchema);

                    // Update company data
                    Company.findOneAndUpdate(query, _data, (error, result) => {
                        if (error) {
                            reject(error);
                        }
                        else {
                            resolve(result);
                        }
                    })
                }
            }
        });
    })
};


// Employers list
companySchema.statics.employersList = (reqBody) => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- employersList **************** `, "employer");

        /** 
         * Pagination and searching page size 20
         * let sort_by_column and order -1 or 1 
         * 1 (ascending order) and -1 (descending order);
         */

        let currentPage = reqBody.page ? parseInt(reqBody.page) : 1;
        let perPage = reqBody.page_size ? parseInt(reqBody.page_size) : 10;
        let skipRecord = (currentPage - 1) * perPage;
        let sortBy = reqBody.sort_by === 'ascending' ? 1 : -1;
        let sortByColumn = reqBody.sort_by_column;

        // Sorting
        let sortQuery = sorting(sortByColumn, sortBy);

        let matchQuery = {};

        // Searching by first name, company name rupyo company code
        if (reqBody.search_name) {

            matchQuery = {
                $or: [
                    { rupyo_company_code: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { company_name: { $regex: `^${reqBody.search_name}`, $options: "i" } }
                ]
            }
        }

        matchQuery.role_id = { $eq: enumValue.employerRoleId };
        matchQuery.status = { $ne: enumValue.archiveStatus };


        // Employer list filter by status
        if (reqBody.status_filter) {

            // Status_filter has 0 return all values
            if (reqBody.status_filter == 0) {
                matchQuery.status = { $ne: enumValue.archiveStatus };
            }
            else {
                matchQuery.status = { $eq: parseInt(reqBody.status_filter) };
            }
        }

        // console.log("matchQuery:- ", matchQuery)

        // Query for count document
        let countQuery = [
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
                    "role_id": 1,
                    "first_name": 1,
                    "middle_name": 1,
                    "last_name": 1,
                    "email": 1,
                    "mobile_number": 1,
                    "employer_status": "$status",
                    "company_id": 1,
                    "company_name": "$Company.company_name",
                    "status": "$Company.status",
                    "company_logo": "$Company.company_logo",
                    "selfie": 1,
                    "rupyo_company_code": "$Company.rupyo_company_code",
                    "rupyo_credit_limit": "$Company.rupyo_credit_limit",
                    "company_size": "$Company.company_size",
                    "created_at": "$Company.created_at",
                    "employee_id_generation_method": "$Company.employee_id_generation_method",
                    "set_payout_limit": "$Company.set_payout_limit",
                    "address": "$Company.address",
                    "weekly_holiday": "$Company.weekly_holiday",
                    "gurantor_name":"$Company.gurantor_name",
                    "incorporation_date":"$Company.incorporation_date",
                    "gst_number":"$Company.gst_number"
                }
            },
            {
                $match: matchQuery,
            },
        ]

        printLogger(2, `countQuery:- ${util.inspect(countQuery)}`, "employer");

        // Count document
        userModel.aggregate(countQuery, (error, result) => {

            if (error) {
                reject(error);
            }
            else {
                total = result[0] === undefined ? 0 : result.length;

                countQuery.push({ $sort: sortQuery });
                countQuery.push({ $skip: skipRecord });
                countQuery.push({ $limit: parseInt(perPage) });

                // Actual query
                db.collection('users').aggregate(countQuery, { collation: { locale: 'en_US', strength: 2 } }).toArray((error, result) => {

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
                })
            }
        })
    })
};


// Get employer
companySchema.statics.getEmployer = (reqBody) => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- getEmployer **************** `, "employer");

        // Projection
        let projection = {
            $project: {
                'password': 0,
                'created_by': 0,
                '__v': 0,
                'updated_by': 0,
                'created_at': 0,
                'updated_at': 0,
                'Company.created_by': 0,
                'Company.updated_by': 0,
                'Company.created_at': 0,
                'Company.updated_at': 0,
                'Company.__v': 0,
            }
        };


        // Match query
        let matchQuery = {
            $and: [{
                "_id": { $eq: ObjectId(reqBody.user_id) }
            },
            {
                "role_id": { $eq: enumValue.employerRoleId }
            }]
        };

        if (reqBody.email) {
            matchQuery = {
                $and: [{
                    "email": { $eq: reqBody.email }
                },
                {
                    "role_id": { $in: [enumValue.superAdminRoleId, enumValue.rupyoAdminRoleId, enumValue.employerRoleId] }
                }]
            };
        }

        let query = [
            {
                $match: matchQuery
            },
            {
                "$addFields": { "company_id": { "$toObjectId": "$company_id" } }
            },
            {
                $lookup: {
                    from: "companies",
                    localField: "company_id",
                    foreignField: "_id",
                    as: "Company"
                }
            },
            // matchQuery,
            // { $unwind: "$Company" },
            projection
        ]

        printLogger(2, `query:- ${util.inspect(query)}`, "employer");

        userModel.aggregate(query, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                let _result = [];
                if (result.length >= 1) {
                    _result = result;
                    if (result[0].Company.length >= 1) {
                        _result[0].Company = result[0].Company[0];
                    }
                }
                resolve(_result);
            }
        })
    })
};


// Change employer status
companySchema.statics.changeStatus = (reqBody, userData) => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- changeStatus **************** `, "employer");

        let employer_id = reqBody.user_id;
        let employerId = [];

        for (let i = 0; i < employer_id.length; i++) {
            employerId.push(ObjectId(employer_id[i]));
        }

        db.collection('users').aggregate([
            {
                $match: { _id: { $in: employerId } }
            },
            {
                "$addFields": {
                    "company_id": { "$toObjectId": "$company_id" }
                }
            },
            {
                $lookup: {
                    from: "companies",
                    localField: "company_id",
                    foreignField: "_id",
                    as: "Company"
                }
            },
            {
                $project: { 'Company._id': 1, '_id': 0 }
            },
            {
                $unwind: "$Company"
            }
        ]).toArray((error, result) => {
            if (error) {
                reject(error)
            }
            else {

                let companyId = [];

                for (let i = 0; i < result.length; i++) {
                    companyId.push(ObjectId(result[i].Company._id));
                }

                let statusObj = {
                    $set: {
                        "status": reqBody.status,
                        "updated_by": userData._id
                    }
                };

                // Change user status
                userModel.updateMany({ _id: { $in: employerId } }, statusObj, (error, employerStatusResult) => {
                    if (error) {

                        reject(error);
                    }
                    else {

                        let Company = mongoose.model('companies', companySchema);
                        Company.updateMany({ _id: { $in: companyId } }, statusObj, (error, companyStatusResult) => {

                            if (error) {
                                reject(error)
                            }
                            else {

                                let saveNotification = statusNotificationSave(employerId, userData);
                                resolve(companyStatusResult);
                            }
                        })

                    }
                })
            }
        })
    })
};


// Employer forgot password (change by rupyo admin)
companySchema.statics.forgotPassword = (data) => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- forgotPassword **************** `, "employer");

        let query = {
            "email": data.email
        };

        let _data = {
            $set: {
                "password": data.hashedPassword,
                "updated_at": data._id
            }
        };

        userModel.findOneAndUpdate(query, _data, (error, result) => {
            if (result) {

                resolve(result);
            }
            else {
                reject(error);
            }
        })
    })
};


// Change credit limit
companySchema.statics.changeCreditLimit = (reqBody, userData) => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- changeCreditLimit **************** `, "employer");

        let query = { "_id": ObjectId(reqBody.company_id) }
        let creditLimitObj = {
            $set: {
                "transaction_charge_setting": reqBody.transaction_charge_setting,
                "employee_credit_limit_setting": reqBody.employee_credit_limit_setting,
                "rupyo_credit_limit": reqBody.rupyo_credit_limit,
                "updated_by": userData._id
            }
        };

        // Company Object
        let Company = mongoose.model('companies', companySchema);
        Company.findOneAndUpdate(query, creditLimitObj, (error, result) => {

            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        });

    })
};


// Company name and Id
companySchema.statics.companyName = () => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- companyName **************** `, "employer");

        let sortQuery = { company_name: 1 };

        let matchQuery = {
            $match: {
                $and: [
                    { role_id: { $eq: enumValue.employerRoleId } },
                    { status: { $ne: enumValue.archiveStatus } }
                ]
            }
        };
        // Main query
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
                    "_id": 0,
                    "employer_id": "$_id",
                    "company_id": "$Company._id",
                    "company_name": "$company_name",
                    "rupyo_company_code": "$Company.rupyo_company_code",
                    "employee_id_generation_method": "$Company.employee_id_generation_method",
                    "employee_credit_limit_setting": "$Company.employee_credit_limit_setting"
                }
            },
            { "$sort": sortQuery },
        ]

        printLogger(2, `query:- ${util.inspect(query)}`, "employer");

        // Actual query
        userModel.aggregate(query, (error, result) => {
            if (error) {
                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })
};


// Get credit limit employer 
companySchema.statics.companyCreditLimitCount = () => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- companyCreditLimitCount **************** `, "employer");

        let aggregateQuery = [
            {
                $addFields: { "_id": { "$toString": "$_id" } }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "company_id",
                    as: "Employer"
                }
            },
            { $unwind: "$Employer" },
            {
                $project: {
                    _id: 1,
                    status: 1,
                    company_name: 1,
                    rupyo_credit_limit: 1,
                    employer_id: "$Employer._id",
                    employer_role_id: "$Employer.role_id"
                }
            },
            {
                $match: {
                    employer_role_id: enumValue.employerRoleId,
                    status: { $ne: enumValue.archiveStatus }
                },
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: "$rupyo_credit_limit" }
                }
            },
        ]

        printLogger(2, `aggregateQuery:- ${util.inspect(aggregateQuery)}`, "employer");

        db.collection('companies').aggregate(aggregateQuery)
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


// Find company
companySchema.statics.findCompany = (data) => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- findCompany **************** `, "employer");

        // Company object
        let Company = mongoose.model('companies', companySchema);

        let query = {};

        if (data.company_id) {
            query = { "_id": ObjectId(data.company_id) };
            Company.findOne(query, (error, result) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(result);
                }
            })

        }
        else {
            Company.find(query, (error, result) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(result);
                }
            })
        }
    })
};


// Find highest ten company credit limit
companySchema.statics.highestCreditLimitTenEmployer = () => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- highestCreditLimitTenEmployer **************** `, "employer");

        let sortQuery = { rupyo_credit_limit: -1 }
        let topCreditLimit = 10;

        let aggregateQuery = [
            {
                $addFields: { "_id": { "$toString": "$_id" } }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "company_id",
                    as: "Employer"
                }
            },
            { $unwind: "$Employer" },
            {
                $project: {
                    _id: 1,
                    status: 1,
                    company_name: 1,
                    rupyo_credit_limit: 1,
                    employer_id: "$Employer._id",
                    employer_role_id: "$Employer.role_id"
                }
            },
            {
                $match: {
                    employer_role_id: enumValue.employerRoleId,
                    status: { $ne: enumValue.archiveStatus }
                },
            },
            {
                $sort: sortQuery
            },
            {
                $limit: topCreditLimit
            }
        ]

        printLogger(2, `aggregateQuery:- ${util.inspect(aggregateQuery)}`, "employer");

        db.collection('companies').aggregate(aggregateQuery)
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


// Employers status (Rupyo admin dashboard)
companySchema.statics.employerStatus = () => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- employerStatus **************** `, "employer");

        let matchQuery = {
            $match: {
                $and: [
                    { role_id: { $eq: enumValue.employerRoleId } },
                    { "status": { "$in": [enumValue.activeStatus, enumValue.deactiveStatus, enumValue.pauseStatus] } }

                ]
            }
        }

        printLogger(2, `matchQuery:- ${util.inspect(matchQuery)}`, "employer");

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



// Employeer status filter 
companySchema.statics.employerStatusFilter = (reqBody) => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- employerStatusFilter **************** `, "employer");

        let query = {
            "role_id": enumValue.employerRoleId
        };

        // Searching by first name, last name 
        if (reqBody.search_name) {
            query = {
                $and: [
                    { role_id: enumValue.employerRoleId },
                    { status: { $ne: enumValue.archiveStatus } },
                    { first_name: { $regex: `^${reqBody.search_name}`, $options: "i" } }
                ]
            };
        }
        else {
            query = {
                $and: [
                    { role_id: enumValue.employerRoleId },
                    { status: { $ne: enumValue.archiveStatus } }
                ]
            };
        }

        printLogger(2, `query:- ${util.inspect(query)}`, "employer");

        db.collection('users').find(query).sort({ "created_at": -1 }).toArray((error, result) => {
            if (error) {
                reject(error);
            } else {

                resolve(result);
            }
        })
    })
};



// Find Company single and multiple
companySchema.statics.findCompanyFilter = (reqBody) => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- findCompanyFilter **************** `, "employer");

        let query = {};
        let companyId = [];

        for (let i = 0; i < reqBody.company_id.length; i++) {
            companyId.push(ObjectId(reqBody.company_id[i]));
        }

        // Projection
        let projection = { _id: 1, rupyo_credit_limit: 1 };
        if (reqBody.status || reqBody.search_name || companyId) {

            //  Filter by status
            if (reqBody.status_filter.length > 0) {
                query.status = { "$in": reqBody.status_filter };
            }

            if (companyId.length > 0) {
                query._id = { "$in": companyId };

            }

            // Searching by company name and company id
            if (reqBody.search_name) {
                query = {
                    $or: [
                        { company_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                        { company_id: { $regex: `^${reqBody.search_name}`, $options: "i" } }
                    ]
                };
            }

        }

        printLogger(2, `query:- ${util.inspect(query)}`, "employer");

        db.collection('companies').find(query).sort({ "created_at": -1 }).project(projection).toArray((error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
        // }
    })
};


// Employer profile
companySchema.statics.employerProfile = (reqBody) => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- employerProfile **************** `, "employer");

        let matchQuery = {

            "company_id": reqBody.company_id,
            "role_id": { $eq: enumValue.employerRoleId },
        };

        // Query for count document
        let query = [
            {
                $match: matchQuery,
            },
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
                    "role_id": 1,
                    "first_name": 1,
                    "middle_name": 1,
                    "last_name": 1,
                    "email": 1,
                    "mobile_number": 1,
                    "selfie": 1,
                    "employer_status": "$status",
                    "created_at": 1,
                    "company_id": 1,
                    "company_name": "$Company.company_name",
                    "status": "$Company.status",
                    "company_logo": "$Company.company_logo",
                    "rupyo_company_code": "$Company.rupyo_company_code",
                    "rupyo_credit_limit": "$Company.rupyo_credit_limit",
                    "company_size": "$Company.company_size",
                    "employee_id_generation_method": "$Company.employee_id_generation_method",
                    "set_payout_limit": "$Company.set_payout_limit",
                    "address": "$Company.address",
                    "weekly_holiday": "$Company.weekly_holiday",
                    "bank_details": "$Company.bank_details",
                    "pan_card": "$Company.pan_card",
                    "company_cin": "$Company.company_cin",
                    "roc_type": "$Company.roc_type",
                    "Company": "$Company"
                    // "partnership_firm_company_id": "$Company.partnership_firm_company_id",
                }
            },
        ]

        printLogger(2, `query:- ${util.inspect(query)}`, "employer");

        db.collection('users').aggregate(query).toArray((error, result) => {
            if (error) {
                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })
};


// Save notifications
statusNotificationSave = async (new_arr, userData) => {

    printLogger(2, `*************** MODEL:- statusNotificationSave **************** `, "employer");

    let notificationsData = [];

    for (let i = 0; i < new_arr.length; i++) {
        let query = { "_id": ObjectId(new_arr[i]) };

        let matchQuery = [
            { "$match": query },
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
                    "status": 1,
                    "company_name": "$Company.company_name",
                    "_id": 1,
                    "company_id": 1,
                }
            },
            { "$sort": { created_at: -1 } },
        ]

        printLogger(2, `matchQuery:- ${util.inspect(matchQuery)}`, "employer");

        // Actual query
        let _result = await db.collection('users').aggregate(matchQuery).toArray();

        let result = _result[0] == undefined || _result[0] == null ? '' : _result[0];

        let statusResult = parseInt(result.status);

        // Check the status pause
        if (statusResult === enumValue.pauseStatus) {

            // Notications Calling and send
            let pausedData = {
                "pause": "Pause",
                "company_name": result.company_name
            };

            //  company inform app and email
            let pausedNotifications = notification.employerAccountWhenPaused(pausedData);

            // Employee inform app 
            let _pausedNotifications = notification.pauseOfCreditByEmployer(pausedData);

            // Notification store employer
            notificationsData.push({
                "user_id": userData._id,
                "company_id": result.company_id,
                "message": pausedNotifications,
                "resource_type": enumValue.changeStatus,
                "status": result.status,
                "request_id": result._id,
                "for_notifications": enumValue.employerRoleId,
                "created_by": result._id
            });

            // Notification store employee
            notificationsData.push({
                "user_id": result._id,
                "company_id": result.company_id,
                "message": _pausedNotifications,
                "resource_type": enumValue.changeStatus,
                "status": result.status,
                "request_id": result._id,
                "for_notifications": enumValue.employeeRoleId,
                "created_by": userData._id
            });

            // Check the status deactive
        }
        if (statusResult === enumValue.deactiveStatus) {

            // Notications Calling and send
            let deactiveData = {
                "deactivated": "Deactive"
            };

            // Employer infrom app and email
            let deactiveNotifications = notification.employerAccountWhenInactive(deactiveData);


            // Notification store employer
            notificationsData.push({
                "user_id": userData._id,
                "company_id": result.company_id,
                "message": deactiveNotifications,
                "resource_type": enumValue.changeStatus,
                "status": result.status,
                "request_id": result._id,
                "for_notifications": enumValue.employerRoleId,
                "created_by": result._id
            });
        }
    }

    notificationsModel.bulkInsert(notificationsData);
};



// Update company data
companySchema.statics.updateCompanyData = (company_id, data) => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- updateCompanyData **************** `, "employer");

        let query = { "_id": ObjectId(company_id) }

        let updateDataObj = {
            $set: data
        };

        // Company Object
        let Company = mongoose.model('companies', companySchema);
        Company.findOneAndUpdate(query, updateDataObj, (error, result) => {

            if (error) {

                reject(error);
            } else {

                resolve(result);
            }
        });

    })
};



// Update many
companySchema.statics.updateMultiple = (reqBody, setData) => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- updateMultiple **************** `, "employer");

        let company_id = reqBody.company_id;
        let companiesId = [];

        for (let i = 0; i < company_id.length; i++) {
            companiesId.push(ObjectId(company_id[i]));
        }

        let setDataObj = { $set: setData };

        // Company Object
        let Company = mongoose.model('companies', companySchema);

        Company.updateMany({ _id: { $in: companiesId } }, setDataObj, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        });
    })
};



// All companies
companySchema.statics.allCompanies = (reqFilter) => {
    return new Promise((resolve, reject) => {

        printLogger(2, `*************** MODEL:- allCompanies **************** `, "employer");

        let query = {};

        // Actual query
        db.collection('companies').find(query).toArray((error, result) => {
            if (error) {
                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })
};


// Create open shift for existing employer
companySchema.statics.updateFire = async (req, res, next) => {
    try {

        let bulkDatas = [];

        db.collection('companies').aggregate(
            [
                {
                    $addFields: { "_id": { "$toString": "$_id" } }
                },
                {
                    $lookup: {
                        from: "workshifts",
                        localField: "_id",
                        foreignField: "company_id",
                        as: "Workshifts"
                    }
                },
                // { $unwind: "$Workshifts" },
                {
                    $project: {
                        "_id": 1,
                        "company_name": 1,
                        "comapny_id": "$Workshifts.company_id",
                        "is_open_shift": "$Workshifts.is_open_shift"
                    }
                },
                {
                    $match: {
                        is_open_shift: { $nin: [true] }
                    }
                }
            ]
        ).toArray((error, result) => {
            if (error) {
                console.log(error);
            }
            else {
               // console.log("result__Length:- ", result.length);

                for (let i = 0; i < result.length; i++) {
                    bulkDatas.push({
                        "company_id": result[i]._id,
                        "shift_name": "Open shift",
                        "shift_start_time": "18:30:00",
                        "shift_end_time": "17:00:00",
                        "is_open_shift": true
                    })
                }

//console.log("bulkDatas length:- ", bulkDatas.length)

                WorkShiftModel.insertMany(bulkDatas, (error, result) => {
                    if (error) {

                        return res.status(500).json({
                            success: false,
                            message: "Internal server error",
                            data: error
                        })
                    }
                    else {

                        return res.status(200).json({
                            success: true,
                            message: "Insertion successful",
                            data: result
                        })
                    }
                })
            }
        })

    }
    catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            data: error
        })
    }
}


// Module exports
module.exports = mongoose.model('companies', companySchema);