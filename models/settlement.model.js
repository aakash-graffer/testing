const mongoose = require('mongoose');
const moment = require('moment');

const { ObjectId } = require('mongodb');
const { sorting, toDay, thisMonth, lastMonth, thisYear, enumValue } = require('../core/utility');
const db = require('../database');
const { utc } = require('moment');


const settlementSchema = mongoose.Schema({

    settlement_id: {
        type: String,
        required: true
    },

    company_id: {
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

    requested_amount: {
        type: Number,
        required: true
    },

    remaining_amount: {
        type: Number,
        required: true
    },

    status: {
        type: Number,
        required: true
    },

    // Only for those employers who active the transaction charge setting
    payout_transaction_charge: {
        type: Number,
        default: 0
    },

    payment_details: [{

        imps_number: String,

        paid_amount: Number,

        receipt_id: String,

        date_time: Date
    }],

    created_by: String,

    updated_by: String
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });


// Common projection
let projection = { "__v": 0, "updated_at": 0, "updated_by": 0, "created_by": 0 };


// Generate settlement
settlementSchema.statics.generateSettlement = (data) => {

    return new Promise((resolve, reject) => {

        // settlementSchema object
        const Settlement = mongoose.model('settlements', settlementSchema);

        let settlement = Settlement(data);
        settlement.save((error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};


// List settlement (for rupyo_admin and employer)
settlementSchema.statics.settlementList = (reqFilter, reqBody) => {
    return new Promise((resolve, reject) => {

        let year = moment().utc().format('YYYY');
        let month = moment().utc().format('M');

        let query = {};

        // Searching
        if (reqBody.search_name) {
            query = {
                $or: [
                    { company_id: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { settlement_id: { $regex: `^${reqBody.search_name}`, $options: "i" } }
                ]
            }
        }

        // Company id
        if (reqFilter.company_id || reqBody.company_id) {

            let companyId = reqFilter.company_id || reqBody.company_id;
            query.company_id = companyId;
        }

        // Filter by status
        if (reqBody.status) {
            query.status = parseInt(reqBody.status)
        }


        // Filter by year
        if (reqBody.year) {
            query.year = parseInt(reqBody.year);
        }

        // Filter by month
        if (reqBody.month) {
            query.month = parseInt(reqBody.month);
        }

        // Pagination
        let currentPage = reqBody.page ? reqBody.page : 1;
        let perPage = reqBody.page_size ? reqBody.page_size : 10;
        let skip = (currentPage - 1) * perPage;

        // Sorting
        let sortBy = reqBody.sort_by === 'ascending' ? 1 : -1;
        let sortByColumn = reqBody.sort_by_column;
        let sortQuery = sorting(sortByColumn, sortBy);

        // console.log("query:- ", query)

        // Count Document
        db.collection("settlements").countDocuments(query, (error, result) => {
            let total = result;
            if (error) {

                reject(error);
            }
            else {

                db.collection('settlements')
                    .aggregate([
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
                                "year": 1,
                                "month": 1,
                                "settlement_id": 1,
                                "requested_amount": "$requested_amount",
                                "payout_transaction_charge": {
                                    $cond: {
                                        if: "$payout_transaction_charge",
                                        then: "$payout_transaction_charge",
                                        else: 0
                                    }
                                },
                                "company_id": 1,
                                "employer": "$Company.company_name",
                                "status": 1,
                                "created_at": 1,
                                "payment_details": 1,
                                "remaining_amount": "$remaining_amount",
                                // "paid_amount": { $subtract: ["$requested_amount", "$remaining_amount"] }
                                "paid_amount": { $toDouble: { $add: [{ $toDouble: { $subtract: ["$requested_amount", "$remaining_amount"] } }, "$payout_transaction_charge"] } }
                            }
                        },
                        { $sort: sortQuery },
                        { $skip: skip },
                        { $limit: perPage }
                    ]).toArray((error, result) => {
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


// Find settlement
settlementSchema.statics.findSettlement = (reqBody) => {
    return new Promise((resolve, reject) => {

        let query = { "_id": ObjectId(reqBody.settlement_id) };

        // settlementSchema object
        const Settlement = mongoose.model('settlements', settlementSchema);

        Settlement.findOne(query, (error, result) => {
            if (error) {

                reject(error)
            }
            else {

                resolve(result)
            }
        })
    })
};


// Update settlement request
settlementSchema.statics.updateSettlement = (reqBody) => {
    return new Promise((resolve, reject) => {

        let query = {
            "_id": ObjectId(reqBody.settlement_id)
        };

        let data = {
            $set: {
                "remaining_amount": reqBody.remaining_amount,
                "payment_details": reqBody.payment_details,
                "status": reqBody.status,
                "updated_by": reqBody.employer_id
            }
        };

        let settlementModel = mongoose.model('settlements', settlementSchema);

        settlementModel.updateOne(query, data, (error, result) => {
            if (error) {

                reject(error)
            }
            else {
                resolve(result)
            }
        })
    })
};



// Employer settlement details (by settlement id)
settlementSchema.statics.settlementDetails = (settlementId) => {
    return new Promise((resolve, reject) => {

        let aggregateQuery = [
            {
                $match: { settlement_id: settlementId }
            }
        ]

        db.collection('settlements').aggregate(aggregateQuery).toArray((error, result) => {
            if (error) {

                reject(error)
            }
            else {

                resolve(result)
            }
        })
    })
};



// List settlement filter for (report)
settlementSchema.statics.settlementFilter = (reqBody) => {

    return new Promise((resolve, reject) => {

        let query = {};

        // Searching by company name and company id
        if (reqBody.search_name) {
            query = {
                $or: [
                    { company_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { company_id: { $regex: `^${reqBody.search_name}`, $options: "i" } }
                ]
            };
        }

        //  Filter by status
        if (reqBody.status.length > 0) {
            query.status = { "$in": reqBody.status };
        }


        //  Filter by month
        if (reqBody.month) {
            query.month = parseInt(reqBody.month)
        }

        //  Filter by year
        if (reqBody.year) {
            query.year = parseInt(reqBody.year)
        }

        if (reqBody.company_id.length > 0) {
            query.company_id = { "$in": reqBody.company_id };
        }

        // Filter by today
        if (reqBody.todays_filter === enumValue.today) {
            query.created_at = toDay();
        }

        // console.log("query:- ",query)

        db.collection("settlements")
            .aggregate([
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
                    "$group": {
                        "_id": null,
                        "company": {
                            "$push": {
                                "settlement_id": "$settlement_id",
                                "company_name": "$Company.company_name",
                                "company_id": "$company_id",
                                "year": "$year",
                                "month": "$month",
                                "requested_amount": { $toInt: "$requested_amount" },
                                "remaining_amount": { $toInt: "$remaining_amount" },
                                "payout_transaction_charge": {
                                    $cond: {
                                        if: "$payout_transaction_charge",
                                        then: "$payout_transaction_charge",
                                        else: 0
                                    }
                                },
                                // "paid_amount": { $toInt: { $subtract: ["$requested_amount", "$remaining_amount"] } },
                                "paid_amount": { $toInt: { $add: [{ $toInt: { $subtract: ["$requested_amount", "$remaining_amount"] } }, "$payout_transaction_charge"] } },
                                "status": "$status",
                                "created_at": "$created_at",
                            }
                        }
                    }
                },
                //{ $match: query },
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


// Employer settlement done, pending and employers list
settlementSchema.statics.employerSettlement = () => {
    return new Promise((resolve, reject) => {


        let query = {};

        let currentMonth = moment().utc().format("M");

        query.month = parseInt(currentMonth);


        db.collection("settlements")
            .aggregate([
                { $match: query },
                {
                    $group: {
                        "_id": null,
                        "amount": { $sum: "$requested_amount" }
                    }
                }
            ])
            .toArray((error, result) => {
                if (error) {
                    reject(error);
                }
                else {

                    resolve(result);
                }
            });

    });
};


// Employer settlement amount yearly
settlementSchema.statics.employerSettlementYearly = () => {
    return new Promise((resolve, reject) => {

        let query = {};

        let currentMonth = moment().utc().format("M");

        query.month = parseInt(currentMonth);

        // console.log("query:- ",query)

        db.collection("settlements")
            .aggregate([
                { $match: query },
                {
                    $facet: {

                        paid_amount: [
                            { $unwind: "$payment_details" },

                            {
                                $group: {
                                    _id: null,
                                    amount: { $sum: "$payment_details.paid_amount" }
                                }
                            }
                        ]
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
            });
    });
};


// Find settlement (company id, year, month)
settlementSchema.statics.findSettlementByCompanyId = (reqBody) => {
    return new Promise((resolve, reject) => {

        db.collection('settlements').findOne(reqBody, (error, result) => {

            if (error) {
                reject(error)
            }
            else {
                resolve(result)
            }
        })
    })
};


// Ledger settlement
settlementSchema.statics.settlementLedger = (reqBody) => {
    return new Promise((resolve, reject) => {


        // Pagination
        let currentPage = reqBody.page ? parseInt(reqBody.page) : 1;
        let perPage = reqBody.page_size ? parseInt(reqBody.page_size) : 10;
        let skip = (currentPage - 1) * perPage;

        let query = {};

        // Searching
        if (reqBody.search_name) {
            query = {
                $or: [
                    { company_id: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { settlement_id: { $regex: `^${reqBody.search_name}`, $options: "i" } }
                ]
            }
        }

        // Company id
        if (reqBody.company_id) {

            let companyId = reqBody.company_id;
            query.company_id = companyId;
        }

        // Filter by status
        if (reqBody.status) {
            query.status = parseInt(reqBody.status)
        }


        // Filter by year 
        if (reqBody.year) {

            query.year = parseInt(reqBody.year);
        }
        /*
        As per priyanka we need to show all data i nik is hide this 
        else {

            // Filter by financial year
            let currentMonth = moment().utc().format("M");
            let year = moment().utc().format('YYYY');

            if (currentMonth === 1 || currentMonth === 2 || currentMonth === 3) {
                year = moment().subtract(1, 'years').format("YYYY");
            }

            let endDay = moment().utc();
            query.created_at = {
                $gte: new Date(year + "-04-01T00:00:00.000Z"),
                $lt: new Date(endDay)
            };
        }*/

        // Filter by month
        if (reqBody.month) {
            query.month = parseInt(reqBody.month);
        }

        // console.log("query:- ", query)

        // Sorting
        let sortBy = reqBody.sort_by === 'ascending' ? 1 : -1;
        let sortByColumn = reqBody.sort_by_column;
        let sortQuery = sorting(sortByColumn, sortBy);

        // Count Document
        db.collection("settlements").countDocuments(query, (error, result) => {
            let total = result;

            if (error) {

                reject(error);
            }
            else {
                db.collection('settlements')
                    .aggregate([
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
                                "company_name": "$Company.company_name",
                                "settlement_id": 1,
                                "company_id": 1,
                                "year": 1,
                                "month": 1,
                                "requested_amount": 1,
                                "payout_transaction_charge": {
                                    $cond: {
                                        if: "$payout_transaction_charge",
                                        then: "$payout_transaction_charge",
                                        else: 0
                                    }
                                },
                                "status": 1,
                                "created_at": 1,
                                "remaining_amount": 1,
                                "paid_amount": { $toInt: { $add: [{ $toInt: { $subtract: ["$requested_amount", "$remaining_amount"] } }, "$payout_transaction_charge"] } }
                            }
                        },

                        { $sort: sortQuery },
                        { $skip: skip },
                        { $limit: perPage }
                    ]).toArray((error, result) => {
                        if (error) {
                            reject(error);
                        }
                        else {

                            let _result =
                            {
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


// Module exports
module.exports = mongoose.model('settlements', settlementSchema);