const mongoose = require('mongoose');
const moment = require('moment');
const db = require('../database');
const { enumValue } = require('../core/utility');

const monthlyTransactionSchema = mongoose.Schema({

    employee_id: {
        type: String,
        required: true
    },

    company_id: {
        type: String,
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

    company_name: {
        type: String,
        required: true
    },

    year: {
        type: Number,
        required: true
    },

    month: {
        type: Number,
        required: true
    },

    request_id: {
        type: String,
        required: true
    },

    payout_credited: {
        type: Number
    },

    number_of_payout: {
        type: Number
    },

    created_by: String,

    updated_by: String
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });


// Find monthly transaction collection by year, month and employee id
monthlyTransactionSchema.statics.findMonthlyTransactionByYearMonth = (data) => {
    return new Promise((resolve, reject) => {

        let query = { $and: [{ year: data.year }, { month: data.month }, { employee_id: data.employee_id }] }

        // Monthly transaction schema object
        let monthlyTransaction = mongoose.model('monthly_transactions', monthlyTransactionSchema);

        monthlyTransaction.findOne(query, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                // console.log("resolve:- ",result)
                resolve(result);
            }
        })
    })
};


// Save monthly transaction data
monthlyTransactionSchema.statics.createMonthlyTransaction = (data) => {
    return new Promise((resolve, reject) => {

        // Monthly transaction schema object
        let monthlyTransaction = mongoose.model('monthly_transactions', monthlyTransactionSchema);

        // Save new monthly transaction data
        let monthlyData = new monthlyTransaction(data)
        monthlyData.save((error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })

    })
};


// Update monthly transaction
monthlyTransactionSchema.statics.updateMonthlyTransaction = (data) => {
    return new Promise((resolve, reject) => {

        // Monthly transaction schema object
        let monthlyTransaction = mongoose.model('monthly_transactions', monthlyTransactionSchema);

        let query = { "_id": data.monthlyTransactionId };
        let setData = {
            $set: {
                "payout_credited": data.amount,
                "number_of_payout": data.numberOfPayout
            }
        }

        monthlyTransaction.findOneAndUpdate(query, setData, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};



monthlyTransactionSchema.statics.monthlytransactionsListMonthly = (data) => {
    return new Promise((resolve, reject) => {


        let query = {
            employee_id: String(data.employee_id),
        };

        // Sorting by default descending 
        let sortQuery = { payout_credited: -1 }

        db.collection('monthly_transactions').findOne(query, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })
};


// Employee payout Transaction list for ledger (ledgerController -> payout)
monthlyTransactionSchema.statics.employeeTransactionLedger = (reqFilter) => {

    return new Promise((resolve, reject) => {

        let matchQuery = {};
        let lookupMatchQuery = {};

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

        // Foreign field match query
        if (reqFilter.status || reqFilter.time_filter) {

            // Filter by status
            if (reqFilter.status) {
                lookupMatchQuery.status = reqFilter.status;
            }

            // Filter by time (today = 1)
            if (reqFilter.time_filter === enumValue.today) {

                lookupMatchQuery.updated_at = toDay();
            }

            // Filter by time (last week = 2)
            if (reqFilter.time_filter === enumValue._lastWeek) {

                // This year filter calling
                lookupMatchQuery.updated_at = lastWeek();
            }

            // Filter by time (This month = 3)
            if (reqFilter.time_filter === enumValue._thisMonth) {

                lookupMatchQuery.updated_at = thisMonth();
            }

            // Filter by time (last month = 4)
            if (reqFilter.time_filter === enumValue._lastMonth) {

                lookupMatchQuery.updated_at = lastMonth();
            }


            // Filter by time (This year = 5)
            if (reqFilter.time_filter === enumValue._thisYear) {

                // This year filter calling
                lookupMatchQuery.updated_at = thisYear();
            }

            // Filter by time (Last year = 6)
            if (reqFilter.time_filter == enumValue._lastYear) {

                lookupMatchQuery.updated_at = lastYear();
            }

            // Filter by time (this weak = 7) 
            if (reqFilter.time_filter === enumValue._thisWeek) {

                lookupMatchQuery.updated_at = thisWeek();
            }

            // (Last three months = 8)
            if (reqFilter.time_filter === enumValue._lastThreeMonths) {

                lookupMatchQuery.updated_at = lastThreeMonth();
            }
        }

        // Sorting
        let sortBy = reqFilter.sort_by === 'ascending' ? 1 : -1;
        let sortByColumn = reqFilter.sort_by_column;

        // Sorting
        let sortQuery = sorting(sortByColumn, sortBy);

        matchQuery.role_id = enumValue.employeeRoleId;

        // Main query
        let query = [
            { $match: matchQuery },
            {
                $addFields: {
                    "_id": { "$toString": "$_id" }
                }
            },

            // Lookup user and  transactions
            {
                $lookup: {
                    from: "monthly_transactions",
                    localField: "_id",
                    foreignField: "employee_id",
                    as: "Transaction"
                }
            },

            { $unwind: "$Transaction" },

            {
                $project: {
                    "date_time": "$Transaction.date_time",
                    "request_id": "$Transaction.request_id",
                    "first_name": "$first_name",
                    "salary_cycle": "$salary_cycle",
                    "middle_name": "$middle_name",
                    "last_name": "$last_name",
                    "employer": "$Transaction.company_name",
                    "credit_limit": "$rupyo_credit_limit",
                    "total_amount_paid": "$Transaction.payout_credited",
                    "created_at": "$Transaction.created_at",
                    "updated_at": "$Transaction.updated_at"
                }
            },
            {
                $match: lookupMatchQuery
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



// Payout done this month
monthlyTransactionSchema.statics.payoutDone = (reqBody) => {
    return new Promise((resolve, reject) => {

        let query = {};
        let currentMonth = moment().utc().format("M");

        if (reqBody.days_filter === enumValue._thisMonth) {
            // query.created_at = thisMonth();            
            query.month = parseInt(currentMonth);
        }

        if (reqBody.company_id) {
            query.company_id = String(reqBody.company_id)
        }

        // console.log("query:- ",query)

        // Employee eod transactions count
        db.collection('monthly_transactions')
            .aggregate([
                {
                    $match: query
                },
                {
                    $group:
                    {
                        _id: null,
                        payout_credited: { $sum: 1 },
                        payout_credited_amount: { $sum: "$payout_credited" },
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
}


// Module exports
module.exports = mongoose.model('monthly_transactions', monthlyTransactionSchema);