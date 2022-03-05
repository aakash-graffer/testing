const mongoose = require('mongoose');
const moment = require('moment');
const { ObjectId } = require('mongodb');

const { sorting, thisMonth, thisYear, lastYear, lastMonth, lastThreeMonth, toDay, lastWeek, thisWeek, enumValue } = require('../core/utility');
const db = require('../database');


// Transaction schema
const transactionSchema = mongoose.Schema({

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

    company_name: {
        type: String,
        required: true
    },

    company_id: {
        type: String,
        required: true
    },

    user_id: {
        type: String,
        required: true
    },

    date_time: {
        type: Number,
        required: true
    },

    request_id: {
        type: String,
        required: true,
        unique: true
    },

    loan_id: {
        type: String,
        // required: true,
        // unique: true
    },

    amount: {
        type: Number,
        required: true
    },

    transaction_charge: {
        type: Number
    },

    imps_receipt_number: {
        type: String
    },

    imps_receipt_link: {
        type: String
    },

    transaction_message: {
        type: String
    },

    status: {
        type: Number,
        required: true
    },

    remaining_amount: {
        type: Number,
        required: true
    },

    status_tracker: [
        {
            status: Number,
            status_made: Date,
            status_made_by: String,
            imps_receipt_link: String
        }
    ],
    loan_status_tracker: [
        {
            status_made: Date,
            message: String
        }
    ],

    created_by: String,

    updated_by: String
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });


// Employee payout request
transactionSchema.statics.payoutRequest = (data) => {
    return new Promise((resolve, reject) => {

        // Transaction schema object
        let Transaction = mongoose.model('transactions', transactionSchema);

        let transaction = Transaction(data)
        transaction.save((error, result) => {
            if (error) {
                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })
};


// Last transaction of employee
transactionSchema.statics.lastPayoutRequest = (data) => {
    return new Promise((resolve, reject) => {

        db.collection('transactions').find(data).sort({ "created_at": -1 }).limit(1).toArray((error, result) => {
            if (error) {

                reject(error)
            }
            else {

                resolve(result)
            }
        })
    })
};


// Employee transactions list (with filters)
transactionSchema.statics.transactionsList = (reqFilter, companyId) => {
    return new Promise((resolve, reject) => {

        // let year = parseInt(moment().utc().format('YYYY'));
        // let month = parseInt(moment().utc().format('M'));

        let matchQuery = {};
        let total = 0;

        // Searching
        if (reqFilter.search_name) {
            matchQuery = {
                $or: [
                    { "first_name": { $regex: `^${reqFilter.search_name}`, $options: "i" } },
                    { "middle_name": { $regex: `^${reqFilter.search_name}`, $options: "i" } },
                    { "last_name": { $regex: `^${reqFilter.search_name}`, $options: "i" } },
                    { "company_name": { $regex: `^${reqFilter.search_name}`, $options: "i" } },
                    { "request_id": { $regex: `^${reqFilter.search_name}`, $options: "i" } },
                    { "full_name": { $regex: `^${reqFilter.search_name}`, $options: "i" } }
                ]
            }
        }

        // Filter by company id
        if (companyId) {
            matchQuery.company_id = companyId;
        }

        // Filter by employee id
        if (reqFilter.user_id) {
            matchQuery.user_id = ObjectId(reqFilter.user_id);
        }

        // Filter by status
        if (reqFilter.status) {
            matchQuery.status = parseInt(reqFilter.status);
        }

        // Filter by year
        if (reqFilter.year) {
            matchQuery.year = parseInt(reqFilter.year);
        }

        // Filter by month
        if (reqFilter.month) {
            matchQuery.month = parseInt(reqFilter.month);
        }

        // console.log("matchQuery:- ",matchQuery)


        // Pagination
        let currentPage = reqFilter.page ? parseInt(reqFilter.page) : 1;
        let perPage = reqFilter.page_size ? parseInt(reqFilter.page_size) : 20;
        let skip = (currentPage - 1) * perPage;

        //   console.log("reqFilter.page:->",reqFilter.page);
        // console.log("reqFilter.page:->",reqFilter.page_size);


        // Sorting
        let sortBy = reqFilter.sort_by === 'ascending' ? 1 : -1;
        let sortByColumn = reqFilter.sort_by_column ? reqFilter.sort_by_column : 'created_at';


        // Sorting
        let sortQuery = sorting(sortByColumn, sortBy);

        //  Query for count document
        countQuery = [
            {
                $addFields: { "user_id": { "$toObjectId": "$user_id" } }
            },

            // Lookup users
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "User"

                }
            },
            { $unwind: "$User" },
            {
                $addFields: {
                    "company_id": { "$toObjectId": "$company_id" }
                }
            },

            // Lookup company
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
                    "full_name": {
                        $cond: {
                            if: {
                                $eq: ["$middle_name", ""]
                            },
                            then: { $concat: ["$first_name", " ", "$last_name"] },
                            else: { $concat: ["$first_name", " ", "$middle_name", " ", "$last_name"] }
                        }
                    },
                    "company_id": 1,
                    "company_name": 1,
                    "amount": 1,
                    "user_id": 1,
                    "status": 1,
                    "request_id": 1,
                    "loan_id": 1,
                    "date_time": 1,
                    "created_at": 1,
                    "transaction_message": 1,
                    "transaction_charge": 1,
                    "imps_receipt_number": 1,
                    "imps_receipt_link": 1,
                    // "employee_id": 1,
                    "employee_status": "$User.status",
                    "employer_status": "$Company.status",
                    "net_salary": { $toInt: "$User.net_salary" },
                    "credit_limit": "$User.rupyo_credit_limit",
                    "payout_credited": "$User.payout_credited",
                    "remaining_credit_limit": { $subtract: ["$User.rupyo_credit_limit", "$User.payout_credited"] },
                    "employee_id": "$User.employee_id",
                    "status_tracker": 1,
                    "updated_at": 1,
                    // "year": { $toInt: { $year: "$updated_at" } },
                    // "month": { $toInt: { $month: "$updated_at" } }
                    // comment https://rupyo-tech.atlassian.net/browse/RUP-665  
                    "year": { $toInt: { $year: "$created_at" } },
                    "month": { $toInt: { $month: "$created_at" } }
                }
            },
            {
                $match: matchQuery,
            }
        ]

        // Count document
        db.collection('transactions').aggregate(countQuery).toArray((error, result) => {

            if (error) {
                reject(error);
            }
            else {

                total = result[0] === undefined ? 0 : result.length;

                countQuery.push({ $sort: sortQuery });
                countQuery.push({ $skip: skip });
                countQuery.push({ $limit: parseInt(perPage) === 0 ? total : parseInt(perPage) });

                // Actual query
                db.collection('transactions').aggregate(countQuery).toArray((error, result) => {
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

// Employee transactions list (with filters)
transactionSchema.statics.transactionsListById = (reqFilter) => {
    return new Promise((resolve, reject) => {

        /*         let matchQuery = {};
                matchQuery._id = ObjectId(reqFilter._id);
              //  matchQuery.employer_role_id = enumValue.employerRoleId;
                matchQuery.employer_role_id = { $eq: enumValue.employerRoleId };
         */
        // Match query
        let matchQuery = {
            $and: [{
                "_id": { $eq: ObjectId(reqFilter._id) }
            },
            {
                "company_role_id": { $eq: enumValue.employerRoleId }
            }]
        };

        //  Query for count document
        countQuery = [
            {
                $addFields: { "user_id": { "$toObjectId": "$user_id" } }
            },

            // Lookup users
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "User"

                }
            },
            { $unwind: "$User" },
            {
                $addFields: {
                    "company_id": { "$toObjectId": "$company_id" }
                }
            },

            // Lookup company
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
            // Lookup users
            {
                $lookup: {
                    from: "users",
                    localField: "company_id",
                    foreignField: "company_id",
                    as: "employer"

                }
            },
            { $unwind: "$employer" },
            {
                $project: {
                    "_id": 1,
                    "first_name": 1,
                    "middle_name": 1,
                    "last_name": 1,
                    "email": "$User.email",

                    "full_name": {
                        $cond: {
                            if: {
                                $eq: ["$middle_name", ""]
                            },
                            then: { $concat: ["$first_name", " ", "$last_name"] },
                            else: { $concat: ["$first_name", " ", "$middle_name", " ", "$last_name"] }
                        }
                    },
                    "gender": "$User.gender",
                    "dob": "$User.dob",
                    "employee_pan_card": "$User.pan_card",
                    "employee_aadhar_card": "$User.aadhar_card",
                    "employee_mobile_number": "$User.mobile_number",
                    "employee_father_mother_name": "$User.father_mother_name",
                    "employee_address": "$User.address",
                    "bank_details": "$User.bank_details",

                    "company_id": 1,


                    "company_name": 1,
                    "company_pan_card": "$Company.pan_card",
                    "company_gst_number": "$Company.gst_number",
                    "company_cin": "$Company.company_cin",
                    "company_incorporation_date": "$Company.incorporation_date",
                    "company_gurantor_name": "$Company.gurantor_name",
                    "company_first_name": "$employer.first_name",
                    "company_middle_name": "$employer.middle_name",
                    "company_last_name": "$employer.last_name",
                    "company_email": "$employer.email",
                    "company_mobile_number": "$employer.mobile_number",
                    /* "company_address_1": "$employer.address_1",
                       "company_address_2": "$employer.address_2",
                       "company_pin_code": "$employer.pin_code",
                       "company_city": "$employer.city",
                       "company_state": "$employer.state",
                       "company_country": "$employer.country",
                       "company_bank_name": "$employer.bank_name",
                        "company_account_number": "$employer.account_number",
                        "company_ifsc_code": "$employer.ifsc_code",
                        "company_branch_name": "$employer.branch_name",
                        "company_bank_account_type": "$employer.bank_account_type", */
                    "company_role_id": "$employer.role_id",
                    "amount": 1,
                    "created_at": 1,
                    "user_id": 1,
                    "status": 1,
                    "request_id": 1,
                    "date_time": 1,
                    "created_at": 1,
                    "transaction_message": 1,
                    "transaction_charge": 1,
                    "imps_receipt_number": 1,
                    "imps_receipt_link": 1,
                    // "employee_id": 1,
                    "employee_status": "$User.status",
                    "employer_status": "$Company.status",
                    "net_salary": { $toInt: "$User.net_salary" },
                    "credit_limit": "$User.rupyo_credit_limit",
                    "payout_credited": "$User.payout_credited",
                    "remaining_credit_limit": { $subtract: ["$User.rupyo_credit_limit", "$User.payout_credited"] },
                    "employee_id": "$User.employee_id",
                    "status_tracker": 1,
                    "loan_status_tracker": 1,
                    "updated_at": 1,
                    "Company": 1,
                    "loan_id": 1
                    // "year": { $toInt: { $year: "$updated_at" } },
                    // "month": { $toInt: { $month: "$updated_at" } }
                }
            },
            {
                $match: matchQuery,
            }
        ]
        //console.log("matchQuery", matchQuery);
        // Actual query
        db.collection('transactions').aggregate(countQuery).toArray((error, result) => {
            if (error) {

                reject(error);
            }
            else {

                // let _result = {
                //     // "total": total,
                //     "result": result
                // };
                //resolve(_result);
                //    console.log("result", result);
                resolve(result);
            }
        })
    })
};


// Employees transaction details (by Status)
transactionSchema.statics.transactionDetailsList = (status) => {
    return new Promise((resolve, reject) => {

        let aggregateQuery = [
            {
                $match: { status: status, $and: [{ "loan_id": { $nin: [null, ""] } }] }
            }
        ]
        // let matchQuery = {};
        // matchQuery._id = ObjectId(reqFilter._id);

        //  Query for count document
        countQuery = [
            {
                $addFields: { "user_id": { "$toObjectId": "$user_id" } }
            },

            // Lookup users
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "User"

                }
            },
            { $unwind: "$User" },
            {
                $addFields: {
                    "company_id": { "$toObjectId": "$company_id" }
                }
            },

            // Lookup company
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
                    "email": "$User.email",

                    "full_name": {
                        $cond: {
                            if: {
                                $eq: ["$middle_name", ""]
                            },
                            then: { $concat: ["$first_name", " ", "$last_name"] },
                            else: { $concat: ["$first_name", " ", "$middle_name", " ", "$last_name"] }
                        }
                    },
                    "gender": "$User.gender",
                    "dob": "$User.dob",
                    "employee_pan_card": "$User.pan_card",
                    "employee_aadhar_card": "$User.aadhar_card",
                    "employee_mobile_number": "$User.mobile_number",
                    "employee_father_mother_name": "$User.father_mother_name",
                    "employee_address": "$User.address",
                    "bank_details": "$User.bank_details",

                    "company_id": 1,


                    "company_name": 1,
                    "company_pan_card": "$Company.pan_card",
                    "company_gst_number": "$Company.gst_number",
                    "company_cin": "$Company.company_cin",
                    "company_incorporation_date": "$Company.incorporation_date",
                    "company_gurantor_name": "$Company.gurantor_name",

                    "amount": 1,
                    "created_at": 1,
                    "user_id": 1,
                    "status": 1,
                    "request_id": 1,
                    "date_time": 1,
                    "created_at": 1,
                    "transaction_message": 1,
                    "transaction_charge": 1,
                    "imps_receipt_number": 1,
                    "imps_receipt_link": 1,
                    // "employee_id": 1,
                    "employee_status": "$User.status",
                    "employer_status": "$Company.status",
                    "net_salary": { $toInt: "$User.net_salary" },
                    "credit_limit": "$User.rupyo_credit_limit",
                    "payout_credited": "$User.payout_credited",
                    "remaining_credit_limit": { $subtract: ["$User.rupyo_credit_limit", "$User.payout_credited"] },
                    "employee_id": "$User.employee_id",
                    "status_tracker": 1,
                    "loan_status_tracker": 1,
                    "updated_at": 1,
                    "Company": 1,
                    "loan_id": 1
                    // "year": { $toInt: { $year: "$updated_at" } },
                    // "month": { $toInt: { $month: "$updated_at" } }
                }
            },
            {
                $match: { status: status, $and: [{ "loan_id": { $nin: [null, ""] } }] },
            }
        ]

        db.collection('transactions').aggregate(countQuery).toArray((error, result) => {
            if (error) {

                reject(error)
            }
            else {
                let _result = {
                    "result": result
                };
                // console.log("Model result:- ",result.length)
                resolve(_result)
            }
        })
    })
};

// Employees transaction details (by payout request id)
transactionSchema.statics.transactionDetails = (requestId) => {
    return new Promise((resolve, reject) => {

        let aggregateQuery = [
            {
                $match: { request_id: requestId }
            }
        ]

        db.collection('transactions').aggregate(aggregateQuery).toArray((error, result) => {
            if (error) {

                reject(error)
            }
            else {

                // console.log("Model result:- ",result.length)
                resolve(result)
            }
        })
    })
};



// Employee transactions list (Employee Dashboard)
// FILTER use :- user_id, this month, status pending
transactionSchema.statics.employeeTransactionsList = (reqFilter) => {
    return new Promise((resolve, reject) => {

        let query = {};

        // Searching
        if (reqFilter.search_name) {
            query = {
                $or: [
                    { first_name: { $regex: `^${reqFilter.search_name}`, $options: "i" } },
                    { last_name: { $regex: `^${reqFilter.search_name}`, $options: "i" } },
                    { company_name: { $regex: `^${reqFilter.search_name}`, $options: "i" } },
                    { request_id: { $regex: `^${reqFilter.search_name}`, $options: "i" } }
                ]
            }
        }
        // Filter transaction list
        if (reqFilter.time_filter || reqFilter.user_id || reqFilter.status || reqFilter.company_id) {

            // Filter by employee id
            if (reqFilter.user_id) {
                query.user_id = String(reqFilter.user_id)
            }

            // Filter by company id
            if (reqFilter.company_id) {
                query.company_id = String(reqFilter.company_id)
            }


            // Filter by status
            if (reqFilter.status) {
                query.status = reqFilter.status
            }

            // Filter by time (This month)
            if (reqFilter.time_filter === enumValue._thisMonth) {       // _thisMonth = 3

                query.created_at = thisMonth();
            }

            // Filter by time (This year)
            if (reqFilter.time_filter == enumValue._thisYear) {       // _thisYear = 5

                query.created_at = thisYear();
            }

            // Filter by time (Last year)
            if (reqFilter.time_filter == enumValue._lastYear) {       // _lastYear = 6

                query.created_at = lastYear();
            }
        }

        // Pagination
        let currentPage = reqFilter.page ? reqFilter.page : 1;
        let perPage = reqFilter.page_size ? reqFilter.page_size : 10;
        let skip = (currentPage - 1) * perPage;
        let sortQuery = { created_at: -1 };

        // Database query
        db.collection('transactions')
            .aggregate(
                [
                    { $match: query },
                    {
                        $project: {
                            "timestamp": "$date_time",
                            "id": "$request_id",
                            "amount": "$amount",
                            "type": "$status",
                            "created_at": "$created_at",
                            "imps_receipt_number": "$imps_receipt_number",
                            "imps_receipt_link": "$imps_receipt_link"
                        }
                    },
                    { "$sort": sortQuery },
                    { "$skip": skip },
                    { "$limit": perPage }
                ]
            )
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


// Get transaction detail by id
transactionSchema.statics.getTransactionDetails = (data) => {
    return new Promise((resolve, reject) => {

        // Transaction schema object
        let Transaction = mongoose.model('transactions', transactionSchema);

        let query = { '_id': ObjectId(data._id) };

        Transaction.findOne(query, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};


// Update transaction
transactionSchema.statics.updateTransaction = (transactionId, data) => {
    return new Promise((resolve, reject) => {

        // Transaction schema object
        let Transaction = mongoose.model('transactions', transactionSchema);

        let query = { '_id': ObjectId(transactionId._id) };

        let _status = {
            $set: data
        };

        Transaction.findOneAndUpdate(query, _status, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};

transactionSchema.statics.updateTransactionNew = async (transactionId, data) => {
    // Transaction schema object
    let Transaction = mongoose.model('transactions', transactionSchema);

    let query = { '_id': ObjectId(transactionId) };
    let result = await Transaction.findOneAndUpdate(query, data, { new: true });
    return result;
};

// Employee transactions list filter this month in transactions collections
transactionSchema.statics.lastTransactionDataEmployer = (reqBody) => {
    return new Promise((resolve, reject) => {
        let query = {};

        if (reqBody.days_filter === enumValue._thisMonth) {

            query.created_at = thisMonth();
            if (reqBody.employee_id) {
                query.user_id = reqBody.employee_id;

            }
            if (reqBody.company_id) {
                query.company_id = reqBody.company_id;
            }
        }
        db.collection('transactions')
            .aggregate([
                { $match: query },
                {
                    $facet: {

                        // Total paid count
                        totalPaid: [{ $match: { status: enumValue.creditedStatus } }, {
                            $group: {
                                _id: null,
                                amount: { $sum: "$amount" }
                            }
                        }
                        ],

                        // Paid employee count
                        transactionCount: [{ $match: { status: enumValue.creditedStatus } },
                        {
                            "$group": {
                                "_id": null,
                                "amount": { "$sum": 1 }
                            }
                        }
                        ],

                        // Total request count
                        requestMade: [
                            {
                                "$group": {
                                    "_id": null,
                                    "amount": { "$sum": 1 }
                                }
                            }
                        ],

                        // Amount requested count
                        amountRequest: [{
                            $group: {
                                _id: null,
                                amount: { $sum: "$amount" }
                            }
                        }
                        ],
                        transactionData: [
                            {
                                "$group": {
                                    "_id": null,
                                    "employer": {
                                        "$push":
                                        {
                                            "amount": "$amount",
                                            "time_date": "$created_at",
                                            "employee": { $concat: ["$first_name", " ", "$last_name"] },
                                            "amount_status": {

                                                "$switch": {
                                                    "branches": [
                                                        { "case": { "$eq": ["$status", enumValue.creditedStatus] }, "then": "Recevied" },
                                                        { "case": { "$eq": ["$status", enumValue.pendingStatus] }, "then": "Requested" },
                                                        { "case": { "$eq": ["$status", enumValue.holdStatus] }, "then": "Hold" },
                                                        { "case": { "$eq": ["$status", enumValue.rejectedStatus] }, "then": "Rejected" },
                                                        { "case": { "$eq": ["$status", enumValue.approvedStatus] }, "then": "Approved" }

                                                    ],
                                                    "default": "Pending"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                },
                { "$sort": { amount: -1 } }
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


// Settlement (Employee credited amount by year, month)
transactionSchema.statics.employeeCreditedAmount = (reqBody) => {
    return new Promise((resolve, reject) => {

        let query = {};

        let year = parseInt(reqBody.year);
        let month = parseInt(reqBody.month);

        let date = new Date(year, month - 1, 1);


        let firstDay = moment(date).startOf('month').format("YYYY-MM-DD");
        let lastDay = moment(date).endOf('month').format("YYYY-MM-DD");


        if (reqBody.company_id) {
            query = { 'company_id': reqBody.company_id };
        }

        query.created_at = {
            $gte: new Date(firstDay + "T00:00:00.000Z"),
            $lt: new Date(lastDay + "T23:59:59.000Z")
        }

        query.status = enumValue.creditedStatus;


        db.collection('transactions')
            .aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        requestedAmount: { $sum: "$amount" }
                    }
                },
            ])
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


// Rupyo admin dashboard
// Top 10 employers who have utilized highest credit limit
transactionSchema.statics.topTenEmployerUtilizeCreditLimit = (reqBody) => {
    return new Promise((resolve, reject) => {

        let query = {};

        let currentMonth = moment().utc().format("M");

        if (reqBody.days_filter === enumValue._thisMonth) {

            query.month = parseInt(currentMonth);
        }

        // Sorting by default descending 
        let sortQuery = { payout_credited: -1 }

        db.collection('monthly_transactions')
            .aggregate([
                { $match: query },
                {
                    $group:
                    {
                        // _id: null,
                        _id: "$company_id",
                        payout_credited: { $sum: "$payout_credited" }, // "$payout_credited"
                        company_name: { $first: "$company_name" }
                    }
                },
                { $sort: sortQuery },
                { $limit: 10 }
            ])
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


// Rupyo admin dashboard
// Top 10 employees who take maximum payout this month and yearly
transactionSchema.statics.topTenEmployeesByMaxPayout = (reqBody) => {
    return new Promise((resolve, reject) => {

        let query = {};

        if (reqBody.days_filter === enumValue._thisMonth) {

            query.created_at = thisMonth();
        }

        if (reqBody.days_filter === enumValue._thisYear) {

            query.created_at = thisYear();
        }

        // Sorting by default descending 
        let sortQuery = { payout_credited: -1 }

        db.collection('monthly_transactions')
            .aggregate([
                {
                    $match: query
                },
                {
                    $group: {
                        "_id": "$employee_id",
                        "payout_credited": { $sum: { $toInt: "$payout_credited" } },
                        "company_name": { $first: "$company_name" },
                        "created_at": { $first: "$created_at" },
                        "employee_name": {
                            "$push":
                            {
                                "employee_name": { $concat: ["$first_name", " ", "$last_name"] },
                            }
                        }
                    }
                },
                { $sort: sortQuery },
                { $limit: 10 }
            ])
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


// Rupyo admin dashboard
// Histogram of top 10 employers by max employees taking pay out this month (1.2.7)
transactionSchema.statics.topTenEmployersByMaxPayoutCount = (reqBody) => {
    return new Promise((resolve, reject) => {

        let currentYear = moment().utc().format('YYYY');
        let currentMonth = moment().utc().format('M');

        let query = {};

        if (reqBody.days_filter === enumValue._thisMonth) {

            query.year = parseInt(currentYear);
            query.month = parseInt(currentMonth);
        }

        // Sorting by default descending 
        let sortQuery = { payout_credited_count: -1 };

        // console.log("query:- ", query)

        db.collection('monthly_transactions')
            .aggregate(
                [
                    { $match: query },
                    {
                        $group:
                        {
                            // _id: null,
                            _id: "$company_id",
                            company_name: { $first: "$company_name" },
                            payout_credited_count: { $sum: 1 },
                            payout_credited_amount: { $sum: "$payout_credited" },
                        }
                    },
                    { $sort: sortQuery },
                    { $limit: 10 }
                ]
            )
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


// Employee transactions list filter this month in monthly_transactions collections
transactionSchema.statics.transactionsFilterListMonthly = (reqBody) => {
    return new Promise((resolve, reject) => {

        let query = {};

        if (reqBody.days_filter === enumValue._thisMonth || reqBody.company_id) {

            query.created_at = thisMonth();
            if (reqBody.company_id) {

                query.company_id = String(reqBody.company_id);
            }
        }
        // Sorting by default descending 
        db.collection("monthly_transactions")
            .aggregate([
                { $match: query },
                {
                    $addFields: { "employee_id": { "$toObjectId": "$employee_id" } }
                },

                // Lookup user and monthly collections
                {
                    $lookup: {
                        from: "users",
                        localField: "employee_id",
                        foreignField: "_id",
                        as: "Users"
                    }
                },
                { $unwind: "$Users" },
                {
                    $facet: {

                        // Total paid amount count
                        payoutCount: [
                            {
                                "$group": {
                                    "_id": null,
                                    "totalAmount": { $sum: "$payout_credited" }
                                }
                            },
                        ],
                        transactionData: [
                            {
                                "$group": {
                                    "_id": null,
                                    "company": {
                                        "$push":
                                        {
                                            "company_name": "$company_name",
                                            "amount": "$payout_credited",
                                            "created_at": "$created_at",
                                            "employee": { $concat: ["$first_name", " ", "$last_name"] },
                                            "selfie": "$Users.selfie"
                                        },
                                    }
                                }
                            }
                        ],
                    }
                },
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


// Employee payout REPORT (with filters) 
transactionSchema.statics.employeePayoutReport = (reqBody) => {
    return new Promise((resolve, reject) => {
        let query = {};

        // Searching
        if (reqBody.search_name) {
            query = {
                $or: [
                    { employee_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { company_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                ]
            };
        }

        // Filter by status
        if (reqBody.status_filter) {
            if (reqBody.status_filter.length > 0) {
                query.status = { "$in": reqBody.status_filter };
            }
        }

        // Filter by company id
        if (reqBody.company_id) {
            if (reqBody.company_id.length > 0) {
                query.company_id = { "$in": reqBody.company_id };
            }
        }

        // Filter by month
        if (reqBody.month) {
            query.month = parseInt(reqBody.month)
        }


        // Filter by year
        if (reqBody.year) {
            query.year = parseInt(reqBody.year)
        }


        // // Filter by time 
        // if (reqBody.start_date_filter || reqBody.end_date_filter) {

        //     let startDay = moment(reqBody.start_date_filter).format('YYYY-MM-DD');
        //     let endDay;
        //     if (reqBody.end_date_filter) {

        //         let _endDay = moment(reqBody.end_date_filter).format('YYYY-MM-DD');
        //         endDay = moment(_endDay + "T23:59:59.000Z")
        //     }
        //     else {
        //         endDay = moment();
        //     }

        //     query.created_at = {
        //         $gte: new Date(startDay + "T00:00:00.000Z"),
        //         $lt: new Date(endDay)
        //     };
        // }

        query.amount = { $gte: 1 };

        db.collection("users")
            .aggregate([
                {
                    $addFields: {
                        "_id": { "$toString": "$_id" }
                    }
                },

                // Lookup user and transactions
                {
                    $lookup: {
                        from: "transactions",
                        localField: "_id",
                        foreignField: "user_id",
                        as: "Transaction"
                    }
                },

                { $unwind: "$Transaction" },
                {
                    $project: {
                        "_id": "$Transaction._id",
                        "request_id": "$Transaction.request_id",
                        "employee_name": { $concat: ["$first_name", " ", "$middle_name", " ", "$last_name"] },
                        "employee_id": "$Transaction.user_id",
                        "company_name": "$Transaction.company_name",
                        "company_id": 1,
                        "rupyo_credit_limit": 1,
                        "amount": "$Transaction.amount",
                        "status": "$Transaction.status",
                        "date_time": "$Transaction.date_time",
                        "payout_credited": 1,
                        "status_tracker": "$Transaction.status_tracker",
                        "created_at": "$Transaction.created_at",
                        "updated_at": "$Transaction.updated_at",
                        // "year": { $toInt: { $year: "$Transaction.updated_at" } },
                        // "month": { $toInt: { $month: "$Transaction.updated_at" } }
                        "year": { $toInt: { $year: "$Transaction.created_at" } },
                        "month": { $toInt: { $month: "$Transaction.created_at" } }
                    }
                },
                { $match: query },
                { "$sort": { created_at: 1 } }
            ])
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


// Employer dash bord graph data dont use
// Employee transactions list filter this month  start date and today till  in monthly_transactions collections
transactionSchema.statics.transactionsFilterListDaily = (data) => {
    return new Promise((resolve, reject) => {

        // Sorting by default descending 
        let sortQuery = { created_at: -1 }

        let _result = [];
        data.date.forEach(_date => {

            let query = {
                created_at: {
                    $gte: new Date(_date.days + "T00:00:00.000Z"),
                    $lt: new Date(_date.days + "T23:59:59.000Z")
                },
                company_id: String(data.company_id)
            };


            db.collection('monthly_transactions').find(query).sort(sortQuery)
                .toArray((error, result) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        _result.push(result)

                        resolve(_result);
                    }
                })
        })
    })
};


// Employee transactions list (Employee Dashboard,  Payroll)
// FILTER use :- user_id, this month, status pending
transactionSchema.statics.employeeProcessingAmount = (reqFilter) => {
    return new Promise((resolve, reject) => {

        let query = {};

        // Filter by employee id
        if (reqFilter.user_id) {
            query.user_id = String(reqFilter.user_id)
        }

        // Filter by status
        if (reqFilter.status) {
            query.status = { $in: reqFilter.status }
        }

        // Filter by time (This month)
        if (reqFilter.time_filter === enumValue._thisMonth) {       // _thisMonth = 3

            query.created_at = thisMonth();
        }

        // Database query
        db.collection('transactions')
            .aggregate(
                [
                    { $match: query },

                    // Total pending amount count
                    {
                        $group: {
                            _id: reqFilter.user_id,
                            totalPendingAmount: { $sum: "$amount" }
                        }
                    }
                ]
            )
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


// Employee transactions list count
transactionSchema.statics.employeeTransactionsListCount = (reqFilter) => {
    return new Promise((resolve, reject) => {

        let query = {};

        // Filter transaction list
        if (reqFilter.time_filter || reqFilter.user_id || reqFilter.status) {

            // Filter by employee id
            if (reqFilter.user_id) {
                query.user_id = String(reqFilter.user_id)
            }

            // Filter by status
            if (reqFilter.status) {
                query.status = reqFilter.status
            }

            // Filter by time (This month)
            if (reqFilter.time_filter === enumValue._thisMonth) {

                query.created_at = thisMonth();
            }
        }

        const cursor = db.collection('transactions')
            .aggregate([
                { $match: query },
                { $group: { _id: null, count: { $sum: "$amount" } } },
                { $sort: { total: -1 } }

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


// Employee Eod transactions count
transactionSchema.statics.eodTransactionsCount = (reqBody) => {
    return new Promise((resolve, reject) => {

        let query = {};

        if (reqBody.days_filter === enumValue._thisMonth) {
            query.created_at = thisMonth();
            query.status = enumValue.creditedStatus;
        }

        if (reqBody.company_id) {
            query.company_id = String(reqBody.company_id)
        }

        // Employee eod transactions count
        db.collection('transactions')
            .aggregate([
                {
                    $match: query
                },
                {
                    $group:
                    {
                        _id: null,
                        payout_credited: { $sum: 1 }
                    }
                },
                { $sort: { created_at: -1 } }
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


//  Employee total Distribution Amount count
transactionSchema.statics.totalDistributionAmount = (reqBody) => {
    return new Promise((resolve, reject) => {
        let query = {};
        if (reqBody.days_filter === enumValue._thisMonth) {

            query.created_at = thisMonth();
            query.status = enumValue.creditedStatus;
        }

        if (reqBody.company_id) {
            query.company_id = reqBody.company_id;
        }

        // Employee Distribution amount count
        db.collection('transactions')
            .aggregate([{
                $match: query
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: "$amount" }
                }
            },

            { $sort: { amount: -1 } }
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


//  Employee transaction multiple time count
transactionSchema.statics.employeeTookMultipleAmount = (reqBody) => {
    return new Promise((resolve, reject) => {
        let query = {};
        if (reqBody.days_filter === enumValue._thisMonth) {

            query.created_at = thisMonth();

            query.number_of_payout = { $gte: 2 };

            if (reqBody.company_id) {
                query.company_id = String(reqBody.company_id)

            }
        }
        // Employee eod transactions count
        db.collection('monthly_transactions')
            .aggregate([
                {
                    $match: query
                },
                {
                    $facet: {

                        // Total number payout of employee count
                        payoutCount: [
                            { $count: "number_of_payout" }
                        ],

                        // Top ten employee max payout this month
                        payoutTen: [
                            {
                                $limit: 10
                            },
                            {
                                "$group": {
                                    "_id": null,
                                    "company": {
                                        "$push":
                                        {
                                            "employee_took_multiple": { $concat: ["$first_name", " ", "$last_name"] },
                                            "amount": "$payout_credited"
                                        },
                                    }
                                }
                            }
                        ]
                    }
                },
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


//  Employee transaction multiple time count
transactionSchema.statics.payoutPaidEmployeeCountThisMonth = (reqBody) => {
    return new Promise((resolve, reject) => {
        let query = {};
        if (reqBody.days_filter === enumValue._thisMonth) {

            query.created_at = thisMonth();

            if (reqBody.company_id) {
                query.company_id = String(reqBody.company_id);

            }
        }
        // Employee eod transactions count
        db.collection('monthly_transactions')
            .aggregate([
                { $match: query },
                { $count: "payout_credited" },
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


//  Employee transaction cummltive transaction count
transactionSchema.statics.employeecumulativeTransaction = (reqBody) => {
    return new Promise((resolve, reject) => {
        let query = {};

        if (reqBody.days_filter === enumValue._thisMonth) {

            if (reqBody.company_id) {

                query.created_at = thisMonth();
                query.company_id = String(reqBody.company_id);
            }
        }

        // Employee eod transactions count
        db.collection('monthly_transactions')
            .aggregate([
                {
                    $match: query,
                },
                {
                    $facet: {
                        // Zero payout employee count
                        zero_employee: [
                            { $match: { payout_credited: { $lte: 1 } } },
                            { $count: "payout_credited" }
                        ],

                        // Five thousand less than employee count
                        five_less: [
                            { $match: { payout_credited: { $lte: 5000 } } },
                            {
                                $count: "payout_credited"
                            }
                        ],

                        // Ten thousand less than employee count
                        ten_less: [
                            { $match: { payout_credited: { $lte: 10000 } } },
                            {
                                $count: "payout_credited"
                            }
                        ],


                        // Fifteen thousand less than employee count
                        fifteen_less: [
                            { $match: { payout_credited: { $lte: 15000 } } },
                            {
                                $count: "payout_credited"
                            }
                        ],

                        // Twenty thousand less than employee count
                        twenty_less: [
                            { $match: { payout_credited: { $lte: 20000 } } },
                            {
                                $count: "payout_credited"
                            }
                        ],

                        // Twenty five thousand  than employee count
                        twenty_five_less: [
                            { $match: { payout_credited: { $lt: 25000 } } },
                            {
                                $count: "payout_credited"
                            }
                        ],

                        // Twenty five thousand greater than employee count
                        twenty_five_greater: [
                            { $match: { payout_credited: { $gte: 25000, $lt: 50000 } } },
                            {
                                $count: "payout_credited"
                            }
                        ],

                        //Fifti greater than and One lpa less than employee count
                        fifti_greater: [
                            { $match: { payout_credited: { $gte: 50000, $lt: 100000 } } },
                            {
                                $count: "payout_credited"
                            }
                        ],


                        // One lpa greater than employee count
                        one_lakh_greater: [
                            { $match: { payout_credited: { $gte: 100000 } } },
                            {
                                $count: "payout_credited"
                            }
                        ]
                    }
                },
                { $sort: { created_at: -1 } }
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


// Top ten employee max payout yearly
transactionSchema.statics.transactionsTopTenYearly = () => {
    return new Promise((resolve, reject) => {
        let query = {};

        query.created_at = thisYear();

        // Employee eod transactions count
        db.collection('monthly_transactions')
            .aggregate([
                {
                    $match: query
                },
                {
                    "$group": {
                        "_id": null,
                        "top_ten": {
                            "$push": {
                                "employee": { $concat: ["$first_name", " ", "$last_name"] },
                                "amount": "$payout_credited",
                                "created_at": "$created_at"
                            }
                        }
                    }
                },
                { $limit: 10 },
                { $sort: { payout_credited: -1 } }

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


// Rupyo admin dashboard
// Employee  payout count yearly
transactionSchema.statics.transactionsYearlyData = () => {
    return new Promise((resolve, reject) => {

        // Employee eod transactions count
        db.collection('transactions')
            .aggregate([
                {
                    $facet: {

                        // Payout requested
                        payout_request: [
                            { $match: { created_at: thisMonth() } },
                            {
                                $group: {
                                    _id: null,
                                    count: { $sum: 1 }
                                }
                            },
                        ],

                        // Payout credited
                        payout_credited: [
                            {
                                $match: {
                                    created_at: thisMonth(),
                                    status: enumValue.creditedStatus
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    count: { $sum: 1 },
                                    amount: { $sum: "$amount" }
                                }
                            }
                        ],

                        // Payout rejected
                        payout_rejected: [
                            {
                                $match: {
                                    created_at: thisMonth(),
                                    status: enumValue.rejectedStatus
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    count: { $sum: 1 },
                                    amount: { $sum: "$amount" }
                                }
                            }
                        ],
                    }
                }
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


// Rupyo admin dashboard
// Employers list of consumed 80% of their credit limit by his employees (Monthly)
transactionSchema.statics.payoutConsumeEighteenPersentCreditLimit = () => {
    return new Promise((resolve, reject) => {
        let query = {};

        let aggregateQuery = [
            { $match: query },
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

                    "company_id": "$_id",
                    "company_name": 1,
                    "employer_role_id": "$Employer.role_id",
                    "selfie": "$Employer.selfie",
                    "company_credit_limit": "$rupyo_credit_limit",
                    "payout_credited_amount": 1,
                    "percent": {
                        $cond: {
                            if: {
                                $eq: ["$rupyo_credit_limit", 0]
                            },
                            then: 0,
                            else: { $toInt: { $multiply: [{ $divide: ["$payout_credited_amount", "$rupyo_credit_limit"] }, 100] } }
                        }
                    },
                    "created_at": 1,
                    "updated_at": 1
                }
            },
            {
                $match: {
                    employer_role_id: enumValue.employerRoleId,
                    percent: { $gte: 80 }
                }
            },
            { $sort: { payout_credited: -1 } }
        ]

        db.collection('companies')
            .aggregate(aggregateQuery)
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


// Transaction list for ledger (ledgerController -> payout)
transactionSchema.statics.transactionLedger = (reqFilter) => {

    return new Promise((resolve, reject) => {

        let matchQuery = {};
        let lookupMatchQuery = {};
        let total = 0;

        // Searching
        if (reqFilter.search_name) {

            matchQuery = {
                $or: [
                    { first_name: { $regex: `^${reqFilter.search_name}`, $options: "i" } },
                    { middle_name: { $regex: `^${reqFilter.search_name}`, $options: "i" } },
                    { last_name: { $regex: `^${reqFilter.search_name}`, $options: "i" } },
                    { company_name: { $regex: `^${reqFilter.search_name}`, $options: "i" } }
                ]
            }
        }

        // Filter by company id
        if (reqFilter.company_id) {
            matchQuery.company_id = reqFilter.company_id;
        }

        // Filter by user_id
        if (reqFilter.user_id) {
            matchQuery._id = ObjectId(reqFilter.user_id);
        }

        // Filter by year
        if (reqFilter.year) {
            lookupMatchQuery.year = parseInt(reqFilter.year)
        }

        // Filter by month
        if (reqFilter.month) {
            lookupMatchQuery.month = parseInt(reqFilter.month)
        }

        // Filter by status
        if (reqFilter.status) {
            lookupMatchQuery.status = reqFilter.status;
        }


        // // Filter by time (today = 1)
        // if (reqFilter.time_filter === enumValue.today) {

        //     lookupMatchQuery.created_at = toDay();
        // }

        // // Filter by time (last week = 2)
        // if (reqFilter.time_filter === enumValue._lastWeek) {

        //     // This year filter calling
        //     lookupMatchQuery.created_at = lastWeek();
        // }

        // // Filter by time (This month = 3)
        // if (reqFilter.time_filter === enumValue._thisMonth) {

        //     lookupMatchQuery.created_at = thisMonth();
        // }

        // // Filter by time (last month = 4)
        // if (reqFilter.time_filter === enumValue._lastMonth) {

        //     lookupMatchQuery.created_at = lastMonth();
        // }


        // // Filter by time (This year = 5)
        // if (reqFilter.time_filter === enumValue._thisYear) {

        //     // This year filter calling
        //     lookupMatchQuery.created_at = thisYear();
        // }

        // // Filter by time (Last year = 6)
        // if (reqFilter.time_filter == enumValue._lastYear) {

        //     lookupMatchQuery.created_at = lastYear();
        // }

        // // Filter by time (this weak = 7) 
        // if (reqFilter.time_filter === enumValue._thisWeak) {

        //     lookupMatchQuery.created_at = thisWeek();
        // }

        // // (Last three months = 8)
        // if (reqFilter.time_filter === enumValue._lastThreeMonths) {

        //     lookupMatchQuery.created_at = lastThreeMonth();
        // }


        // Pagination
        let currentPage = reqFilter.page ? reqFilter.page : 1;
        let perPage = reqFilter.page_size || 20;
        let skip = (currentPage - 1) * perPage;

        // Sorting
        let sortBy = reqFilter.sort_by === 'ascending' ? 1 : -1;
        let sortByColumn = reqFilter.sort_by_column;

        // Sorting
        let sortQuery = sorting(sortByColumn, sortBy);

        matchQuery.role_id = enumValue.employeeRoleId;

        //console.log("matchQuery:- ", matchQuery)

        // Main query
        let query = [
            { $match: matchQuery },
            {
                $addFields: {
                    "_id": { "$toString": "$_id" }
                }
            },
            // Lookup user and  transactions
            // {
            //     $lookup: {
            //         from: "monthly_transactions",
            //         localField: "_id",
            //         foreignField: "employee_id",
            //         as: "Transaction"
            //     }
            // },

            // Lookup user and  transactions
            // Comment By nik 
            {
                $lookup: {
                    from: "transactions",
                    localField: "_id",
                    foreignField: "user_id",
                    as: "Transaction"
                }
            },

            { $unwind: "$Transaction" },

            // {
            //     $lookup: {
            //         from: "monthly_transactions",
            //         localField: "_id",
            //         foreignField: "employee_id",
            //         as: "MonthlyTransaction"
            //     }
            // },
            // { $unwind: "$MonthlyTransaction" },
            {
                $project: {
                    "date_time": "$Transaction.date_time",
                    "request_id": "$Transaction.request_id",
                    "first_name": "$first_name",
                    "salary_cycle": "$salary_cycle",
                    "middle_name": "$middle_name",
                    "last_name": "$last_name",
                    "user_id": "$_id",
                    "company_id": "$company_id",
                    "transaction_id": "$Transaction._id",
                    "employer": "$Transaction.company_name",
                    "credit_limit": "$rupyo_credit_limit",
                    "net_salary": "$net_salary",
                    "credit_limit_percent": "$credit_limit_percent",
                    "credit_limit_type": "$credit_limit_type",
                    "status": "$Transaction.status",
                    "amount": "$Transaction.amount",
                    "total_amount_paid": "$payout_credited",
                    "imps_receipt_number": "$Transaction.imps_receipt_number",
                    "imps_receipt_link": "$Transaction.imps_receipt_link",
                    "created_at": "$Transaction.created_at",
                    // "year": { $toInt: { $year: "$Transaction.updated_at" } },
                    // "month": { $toInt: { $month: "$Transaction.updated_at" } }
                    "transaction_charge": "$Transaction.transaction_charge",
                    "year": { $toInt: { $year: "$Transaction.created_at" } },
                    "month": { $toInt: { $month: "$Transaction.created_at" } }
                }
            },
            {
                $match: lookupMatchQuery
            },
        ]
        //  console.log("query:- ", query)
        // Actual query
        db.collection('users').aggregate(query).toArray((error, countResult) => {
            if (error) {

                reject(error);
                //console.log(error);
            }
            else {

                total = countResult[0] === undefined ? 0 : countResult.length;

                query.push({ $sort: sortQuery });
                query.push({ $skip: skip });
                query.push({ $limit: parseInt(perPage) === 0 ? total : parseInt(perPage) });

                // Actual query
                db.collection('users').aggregate(query).toArray((error, result) => {
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


// Employer Transaction list for ledger 
transactionSchema.statics.employerPayoutLedger = (reqFilter) => {

    return new Promise((resolve, reject) => {

        let matchQuery = {};
        let lookupMatchQuery = {};

        // Searching
        if (reqFilter.search_name) {

            matchQuery = { "company_name": { $regex: `^${reqFilter.search_name}`, $options: "i" } }
        }

        // Filter by company id
        if (reqFilter.company_id) {
            matchQuery.company_id = reqFilter.company_id;
        }

        // Filter by user_id
        if (reqFilter.user_id) {
            matchQuery._id = ObjectId(reqFilter.user_id);
        }

        // Foreign field match query
        if (reqFilter.status || reqFilter.time_filter) {

            // Filter by status
            if (reqFilter.status) {
                lookupMatchQuery.status = reqFilter.status;
            }

            // Filter by time (today = 1)
            if (reqFilter.time_filter === enumValue.today) {

                lookupMatchQuery.created_at = toDay();
            }

            // Filter by time (last week = 2)
            if (reqFilter.time_filter === enumValue._lastWeek) {

                // This year filter calling
                lookupMatchQuery.created_at = lastWeek();
            }

            // Filter by time (This month = 3)
            if (reqFilter.time_filter === enumValue._thisMonth) {

                lookupMatchQuery.created_at = thisMonth();
            }

            // Filter by time (last month = 4)
            if (reqFilter.time_filter === enumValue._lastMonth) {

                lookupMatchQuery.created_at = lastMonth();
            }


            // Filter by time (This year = 5)
            if (reqFilter.time_filter === enumValue._thisYear) {

                // This year filter calling
                lookupMatchQuery.created_at = thisYear();
            }

            // Filter by time (Last year = 6)
            if (reqFilter.time_filter == enumValue._lastYear) {

                lookupMatchQuery.created_at = lastYear();
            }

            // Filter by time (this weak = 7) 
            if (reqFilter.time_filter === enumValue._thisWeek) {

                lookupMatchQuery.created_at = thisWeek();
            }

            // (Last three months = 8)
            if (reqFilter.time_filter === enumValue._lastThreeMonths) {

                lookupMatchQuery.created_at = lastThreeMonth();
            }
        }

        // Sorting
        let sortBy = reqFilter.sort_by === 'ascending' ? 1 : -1;
        let sortByColumn = reqFilter.sort_by_column;

        // Sorting
        let sortQuery = sorting(sortByColumn, sortBy);

        matchQuery.role_id = enumValue.employerRoleId;

        // Main query
        let query = [
            { $match: matchQuery },
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
                    "company_id": "$Company._id",
                    "company_name": "$Company.company_name"
                }
            },
            { "$sort": sortQuery },
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
    })
};


// Employer Transaction payout report  
transactionSchema.statics.employerMonthlyPayoutCount = (reqBody) => {
    return new Promise((resolve, reject) => {
        let query = {};

        // Filter by status
        if (reqBody.status_filter.length > 0) {
            query.status = { "$in": reqBody.status_filter };
        }

        // Filter by company id
        if (reqBody.company_id) {
            query.company_id = reqBody.company_id;
        }

        // Filter by company id
        if (reqBody.user_id.length > 0) {
            query._id = { "$in": reqBody.user_id };
        }

        // Searching
        if (reqBody.search_name) {
            query = {
                $or: [
                    { first_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { middle_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { last_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { company_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                ]
            };
        }

        // Filter by time 
        if (reqBody.start_date_filter || reqBody.end_date_filter) {
            let startDay = moment(reqBody.start_date_filter).format('YYYY-MM-DD');
            let endDay;
            if (reqBody.end_date_filter) {

                endDay = moment(reqBody.end_date_filter).format('YYYY-MM-DD');
            } else {
                endDay = moment();

            }
            query.created_at = {
                $gte: new Date(startDay + "T00:00:00.000Z"),
                $lt: new Date(endDay)
            };
        }

        // console.log(query)
        db.collection("transactions")
            .aggregate([

                { $match: query },
                {
                    $facet: {

                        // Amount count this month paid
                        amount: [
                            { $match: { "status": enumValue.creditedStatus } }, {
                                $group: {
                                    _id: null,
                                    count: { $sum: "$amount" }
                                }
                            }
                        ],
                        company: [
                            {
                                $project: {
                                    "company_name": 1,
                                    "employee_name": { $concat: ["$first_name", " ", "$middle_name", " ", "$last_name"] },
                                    "request_id": 1,
                                    "date_time": 1,
                                    "amount": 1,
                                    "_id": 1,
                                }
                            }]
                    }
                },
                { "$sort": { created_at: -1 } }
            ])
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



// Employee Eod transactions count per date (Employer dashboard graph)
transactionSchema.statics.eodTransactionsCountPerDate = (reqBody) => {
    return new Promise((resolve, reject) => {

        let thisYear = moment().utc().format("YYYY");
        let thisMonth = moment().utc().format("MM");
        let toDate = moment().utc().format("DD");


        // Employee eod transactions count
        db.collection('transactions')
            .aggregate([
                {
                    $project: {
                        "_id": 1,
                        "first_name": 1,
                        "moddle_name": 1,
                        "last_name": 1,
                        "user_id": 1,
                        "company_id": 1,
                        "request_id": 1,
                        "amount": 1,
                        "status": 1,
                        "created_at": 1,
                        "updated_at": 1,
                        "updated_at_date": { $toInt: { $dayOfMonth: "$updated_at" } },
                        "updated_at_month": { $toInt: { $month: "$updated_at" } },
                        "updated_at_year": { $toInt: { $year: "$updated_at" } },
                    }
                },
                {
                    $match: {
                        company_id: String(reqBody.company_id),
                        status: enumValue.creditedStatus,
                        $and: [
                            { "updated_at_year": { $eq: parseInt(thisYear) } },
                            { "updated_at_month": { $eq: parseInt(thisMonth) } },
                            { "updated_at_date": { $eq: parseInt(reqBody.toDate) } }
                        ]
                    }
                },
            ]).toArray((error, result) => {
                if (error) {

                    reject(error);
                }
                else {

                    resolve(result)


                }
            })

    })
};



// Module exports
module.exports = mongoose.model('transactions', transactionSchema);