// Init code
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const db = require('../database');
const { sorting, enumValue } = require('../core/utility');

// User Schema
const userSchema = mongoose.Schema({

    // Common fields
    role_id: {
        type: Number,
        required: true
    },

    first_name: {
        type: String,
        required: true
    },

    middle_name: {
        type: String
    },

    last_name: {
        type: String,
        required: true
    },
    father_mother_name: {
        type: String,
        // required: true,
        required: function () {
            return this.role_id === enumValue.employeeRoleId ? true : false
        },
        default: null
    },

    dob: {
        type: Date,
        default: null
    },
    gender: {
        type: String,
        enum: ['M', 'F', 'O']
    },
    selfie: {
        type: String
    },

    email: {
        type: String,
        unique: true,
        required: function () {
            return this.role_id === enumValue.employeeRoleId ? false : true
        }
    },

    mobile_number: {
        type: Number,
        required: true,
    },

    password: {
        type: String
    },

    status: {
        type: Number
    },

    company_status: {
        type: Number
    },

    firebase_device_token: {
        type: String
    },

    last_swipe: {
        type: Date
    },

    // Run automatic attendance also
    calculated_last_swipe: {
        type: Date
    },

    // Punch in & punch out
    is_punch_in_punch_out: {
        type: Boolean
    },

    // Aadhar card for new employee
    aadhar_card: {
        type: Number,
        unique: true,
        required: function () {
            return this.role_id === enumValue.employeeRoleId ? true : false
        }
    },
    
    cibil_score: {
        type: String,
        default: null
    },

    security_question_id: {
        type: Number
    },

    security_answer: {
        type: String
    },

    company_id: {
        type: String
    },

    company_name: {
        type: String
    },

    // Employee fields
    employee_id: {
        type: String,
        required: false,
        default: null
    },

    employee_sys_id: {
        type: String,
        required: false,
        unique: true,
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
        },
        district: {
            type: String,
            default: null
        }
    },

    bank_details: {
        bank_name: {
            type: String
        },

        account_number: {
            type: String
        },

        ifsc_code: {
            type: String
        },

        branch_name: {
            type: String
        },

        bank_account_type: {
            type: String
        },

        name_in_bank: {
            type: String
        }
    },

    pan_card: {
        type: String
    },

    work_shift_id: {
        type: String
    },


    employee_type: {
        type: Number,
        default: 1
    },

    rupyo_credit_limit: {
        type: Number,
        default: 0
    },

    verification_status: {
        type: Number,
        default: 0
    },

    salary_cycle: {
        type: String
    },

    net_salary: {
        type: Number,
        default: 0
    },

    net_deductions: {
        type: Number,
        default: 0
    },

    basic_pay: {
        type: Number,
        default: 0
    },

    additional_pay: {
        type: Number,
        default: 0
    },

    opening_balance: {
        type: Number,
        default: 0
    },

    // type and percent fields for calculate employees rupyo credit limit 
    credit_limit_type: {
        type: Number,
        default: 1
    },

    credit_limit_percent: {
        type: Number,
        default: 50
    },

    employee_signup_step: {
        type: Number
    },

    employee_payout_activation_date: {
        type: Date
    },

    credit_limit_per_employee: {
        type: Number
    },

    employee_amount: {
        type: Number
    },

    presents_count: {
        type: Number,
        default: 0
    },

    absents_count: {
        type: Number,
        default: 0
    },

    leaves_count: {
        type: Number,
        default: 0
    },

    half_days_count: {
        type: Number,
        default: 0
    },

    missed_punch_count: {
        type: Number,
        default: 0
    },

    late_in: {
        type: Number,
        default: 0
    },

    early_out: {
        type: Number,
        default: 0
    },

    deficit_hours: {
        type: Number
    },

    total_work_hours: {
        type: Number
    },

    days_worked_till_now: {
        default: 0,
        type: Number
    },

    average_work_hours_per_day: {
        type: Number
    },

    // Monthly basis
    payout_credited: {
        type: Number,
        default: 0
    },

    // Monthly basis
    earned_amount: {
        type: Number,
        default: 0
    },

    // For admin
    have_payout_approve_access: {
        type: Boolean,
        default: false
    },

    // For admin
    have_payout_credit_access: {
        type: Boolean,
        default: false
    },

    created_by: String,

    updated_by: String
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });


// User login
userSchema.statics.find = (data) => {
    return new Promise((resolve, reject) => {

        let query;
        if (data.email) {
            query = { 'email': data.email }
        }
        else if (data.user_id) {
            query = { '_id': ObjectId(data.user_id) }
        }
        else {
            query = data;
        }

        // Find user email id
        db.collection('users').findOne(query, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        });
    });
};


// Create Rupyo Admin
userSchema.statics.createRupyoAdmin = (rupyoAdminData) => {
    return new Promise((resolve, reject) => {

        // userSchema object
        let RupyoAdmin = mongoose.model('users', userSchema);

        let rupyoAdmin = new RupyoAdmin(rupyoAdminData);

        // Save rupyo admin data
        rupyoAdmin.save((error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        });
    });
};


// Rupyo admin list
userSchema.statics.rupyoAdminList = (reqBody) => {
    return new Promise((resolve, reject) => {

        /** 
        * Pagination and searching page size 20
        * let sort_by_column and order -1 or 1 
        * 1 (ascending order) and -1 (descending order);
       */

        let query = {};
        let currentPage = reqBody.page ? reqBody.page : 1;
        let perPage = reqBody.page_size ? reqBody.page_size : 10;
        let skip = (currentPage - 1) * perPage;
        let sortBy = reqBody.sort_by === 'ascending' ? 1 : -1;
        let sortByColumn = reqBody.sort_by_column;

        // Searching by first name, last name, email
        if (reqBody.search_name) {
            query = {
                $and: [
                    { role_id: enumValue.rupyoAdminRoleId },
                    { status: { $ne: enumValue.archiveStatus } },
                    // { email: { $ne: "admin@rupyo.in" } },
                    // { email: { $ne: "support@rupyo.in" } },
                    {
                        $or: [
                            { first_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                            { middle_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                            { last_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                            { full_name: { $regex: `^${reqBody.search_name}`, $options: "i" } }
                        ]
                    }
                ]
            }
        }
        else {
            query = {
                $and: [
                    { role_id: enumValue.rupyoAdminRoleId },
                    { status: { $ne: enumValue.archiveStatus } },
                    // { email: { $ne: "admin@rupyo.in" } },
                    // { email: { $ne: "support@rupyo.in" } },
                ]
            }
        }

        // Sorting
        let sortQuery = sorting(sortByColumn, sortBy);

        // Aggregation query
        let aggregateQuery = [
            {
                "$project": {
                    '_id': 1,
                    'role_id': 1,
                    'first_name': 1,
                    'last_name': 1,
                    "full_name": { $concat: ["$first_name", " ", "$last_name"] },
                    'email': 1,
                    'mobile_number': 1,
                    'status': 1,
                    "have_payout_approve_access": {
                        $cond: {
                            if: "$have_payout_approve_access",
                            then: "$have_payout_approve_access",
                            else: false
                        }
                    },
                    "have_payout_credit_access": {
                        $cond: {
                            if: "$have_payout_credit_access",
                            then: "$have_payout_credit_access",
                            else: false
                        }
                    }
                }
            },
            { "$match": query },
            // { "$sort": sortQuery },
            // { "$skip": skip },
            // { "$limit": perPage },
        ]

        // Count Document
        db.collection("users").aggregate(aggregateQuery).toArray((error, result) => {
            if (error) {

                reject(error);
            }
            else {
                let total = result[0] === undefined ? 0 : result.length;

                aggregateQuery.push({ "$sort": sortQuery })
                aggregateQuery.push({ "$skip": skip })
                aggregateQuery.push({ "$limit": perPage })

                // get admin list 
                db.collection("users").aggregate(aggregateQuery).toArray((error, result) => {
                    if (error) {

                        reject(error);
                    }
                    else {

                        let _result = { "total": total, "result": result };
                        resolve(_result);
                    }
                })
            }
        })
    })
};


// Find rupyo admin and already register email, mobile number  
userSchema.statics.findRupyoAdmin = (reqBody) => {
    return new Promise((resolve, reject) => {
        let rupyoAdmin = mongoose.model('users', userSchema);
        let query;

        // Convert object id
        if (reqBody.url == '/createrupyoadmin') {
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
                    "role_id": { $in: [enumValue.rupyoAdminRoleId, enumValue.superAdminRoleId,] }
                }]
            };
        }
        else if (reqBody.user_id) {
            query = {
                $and: [{
                    "_id": ObjectId(reqBody.user_id),
                    "role_id": { $in: [enumValue.rupyoAdminRoleId, enumValue.superAdminRoleId,] }
                },
                {
                    "status": { $ne: enumValue.archiveStatus }
                }]
            }
        }
        else {
            query = {
                "mobile_number": reqBody.mobile_number,
                "status": { $ne: enumValue.archiveStatus }
            };
        }

        // Projection key : 0 (not show) or 1 (show)
        let projection = { '__v': 0, 'created_at': 0, 'updated_at': 0, 'created_by': 0, 'updated_by': 0, 'password': 0 }

        // Find  one particular id
        rupyoAdmin.findOne(query, projection, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })
};


// Update rupyo admin
userSchema.statics.updateRupyoAdmin = (reqBody, userData) => {
    return new Promise((resolve, reject) => {
        let rupyoAdmin = mongoose.model('users', userSchema);

        // Convert object id
        const query = { "_id": ObjectId(reqBody.user_id) };
        const data = {
            $set: {
                "first_name": reqBody.first_name,
                "last_name": reqBody.last_name,
                "mobile_number": parseInt(reqBody.mobile_number),
                "updated_by": userData._id
            }
        };

        // Update Rupyo admin
        rupyoAdmin.findOneAndUpdate(query, data, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })

    })
};


// Update rupyo admin
userSchema.statics.updateStatus = (reqBody, userData) => {
    return new Promise((resolve, reject) => {

        let user_id = reqBody.user_id;
        let userId = [];
        for (let i = 0; i < user_id.length; i++) {
            userId.push(ObjectId(user_id[i]));
        }

        let statusObj = { $set: { "status": reqBody.status, "updated_by": userData._id } };

        let rupyoAdmin = mongoose.model('users', userSchema);
        rupyoAdmin.updateMany({ _id: { $in: userId } }, statusObj, (error, result) => {

            if (error) {

                reject(error);
            } else {

                resolve(result);
            }
        });

    })

};


// Change password
userSchema.statics.changePassword = (reqQuery, password) => {
    return new Promise((resolve, reject) => {
        const query = { "email": reqQuery.email };
        const data = { $set: { "password": password } };

        let userModel = mongoose.model('users', userSchema);
        userModel.updateOne(query, data, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        });
    });
};


// Update firebase_device_token
userSchema.statics.updateFirebaseDeviceToken = (data) => {
    return new Promise((resolve, reject) => {

        let query = { _id: data.user_id };
        let updateData = {
            $set: {
                firebase_device_token: data.firebase_device_token
            }
        };

        db.collection('users').updateOne(query, updateData, (error, result) => {
            if (error) {

                reject(error)
            }
            else {

                resolve(result)
            }
        })
    })
};



// User find by mobile number
userSchema.statics.findByMobileNumber = (data) => {
    return new Promise((resolve, reject) => {

        let query = {
            "mobile_number": parseInt(data.mobile_number),
            "status": { $ne: enumValue.archiveStatus }
        }

        // Projection
        let projection = { "__v": 0, "password": 0 };

        // Find mobile number in user collection
        db.collection('users').findOne(query, projection, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })
};



// S3 key store
userSchema.statics.keyStore = (data) => {
    return new Promise((resolve, reject) => {

        let query = { "_id": ObjectId(data.user_id) };
        let updateData = {
            $set: {
                "selfie": data.s3_key,
                "updated_by": data.updated_by
            }
        };

        let userModel = mongoose.model('users', userSchema);
        userModel.findOneAndUpdate(query, updateData, (error, result) => {
            if (error) {

                reject(error)
            }
            else {

                resolve(result)
            }
        })
    })
};


// Update payout approve, credit access for rupyo admin
userSchema.statics.updatePayoutApproveCreditAccess = (adminId, updateData) => {
    return new Promise((resolve, reject) => {

        let query = { "_id": ObjectId(adminId) };

        let updateFields = { $set: updateData };

        let userModel = mongoose.model('users', userSchema);
        userModel.findOneAndUpdate(query, updateFields, (error, result) => {
            if (error) {

                reject(error)
            }
            else {

                resolve(result)
            }
        })
    })
};


// Module exports
module.exports = mongoose.model('users', userSchema);