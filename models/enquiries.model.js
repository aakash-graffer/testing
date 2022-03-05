const mongoose = require("mongoose");
const db = require("../database");
const { printLogger, sorting, enumValue } = require('../core/utility');
const { ObjectId } = require('mongodb');

const enquiriesSchema = mongoose.Schema({

    first_name: {
        type: String,
        required: true
    },

    middle_name: String,

    last_name: String,

    job_title: String,

    company_name: {
        type: String,
        required: true
    },

    company_size: Number,

    phone_number: {
        type: String,
        required: true
    },

    work_email: {
        type: String,
        required: true
    },

    how_you_are: {
        type: String,
        required: true
    },

    designation: {
        type: String,
        required: true
    },

    status: {
        type: Number,
        required: true
    },

    type_of: {
        type: String,
        required: true
    },

    message: String,

    created_by: String,

    updated_by: String
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    }
);

// Save Enquiries
enquiriesSchema.statics.createEnquiries = (reqBody) => {
    return new Promise((resolve, reject) => {

        // Enquiry model object
        let Enquiry = mongoose.model('enquiries', enquiriesSchema);

        // Save enquiry data
        let enquiry = Enquiry(reqBody);
        enquiry.save((error, result) => {
            if (error) {
                printLogger(0, error, 'enquiry');
                reject(error);
            }
            else {
                printLogger(2, result, 'enquiry');
                resolve(result);
            }
        });
    });
};


// List Enquiries
enquiriesSchema.statics.enquiriesList = (reqBody) => {
    return new Promise(function (resolve, reject) {

        /** Pagination and searching page size 20
        * let sort_by_column and order -1 or 1 
        * 1 (ascending order) and -1 (descending order);
        */
        let query = { "status": { $nin: [enumValue.archiveStatus, enumValue.archiveStatus.toString()] } };

        let currentPage = reqBody.page ? reqBody.page : 1;
        let perPage = reqBody.page_size ? reqBody.page_size : 20;
        let skip = (currentPage - 1) * perPage;
        let sortBy = reqBody.sort_by === 'ascending' ? 1 : -1;
        let sortByColumn = reqBody.sort_by_column;

        // Sorting 
        let sortQuery = sorting(sortByColumn, sortBy);

        // Searching by first name, last name 
        if (reqBody.search_name) {
            query = {
                $or: [
                    { first_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { last_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { middle_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { company_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { full_name: { $regex: `^${reqBody.search_name}`, $options: "i" } }
                ]
            };
        }

        if (reqBody.type_of) {
            query.type_of = reqBody.type_of
        }

        if (reqBody.status_filter) {
            query.status = parseInt(reqBody.status_filter)
        }

        countQuery = [
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
                    "job_title": 1,
                    "company_size": 1,
                    "company_name": 1,
                    "phone_number": 1,
                    "work_email": 1,
                    "message": 1,
                    "how_you_are": 1,
                    "designation": 1,
                    "type_of": 1,
                    "status": 1,
                    "created_at": 1
                }
            },
            {
                $match: query,
            }
        ]



        // Projection object
        let projection = { '__v': 0, 'updated_at': 0, 'updated_by': 0 };

        // Count Document
        db.collection("enquiries").aggregate(countQuery).toArray((error, result) => {
            let total = result[0] === undefined ? 0 : result.length;

            if (error) {

                reject(error);
            }
            else {
                countQuery.push({ $sort: sortQuery });
                countQuery.push({ $skip: skip });
                countQuery.push({ $limit: parseInt(perPage) === 0 ? total : parseInt(perPage) });

                db.collection("enquiries").aggregate(countQuery)
                    // .project(projection)
                    // .sort(sortQuery).collation({ "locale": 'en_US', "strength": 2 })
                    // .skip(skip)
                    // .limit(perPage)
                    .toArray((error, result) => {
                        if (error) {

                            printLogger(0, error, 'enquiry');
                            reject(error);
                        }
                        else {

                            printLogger(2, result, 'enquiry');
                            let _result = { "total": total, "result": result };
                            resolve(_result);
                        }
                    });

                // db.collection("enquiries")
                //     .find(query)
                //     .project(projection)
                //     .sort(sortQuery).collation({ "locale": 'en_US', "strength": 2 })
                //     .skip(skip)
                //     .limit(perPage)
                //     .toArray((error, result) => {
                //         if (error) {

                //             printLogger(0, error, 'enquiry');
                //             reject(error);
                //         }
                //         else {

                //             printLogger(2, result, 'enquiry');
                //             let _result = { "total": total, "result": result };
                //             resolve(_result);
                //         }
                //     });
            }
        })
    });
};


// Update status enquiries
enquiriesSchema.statics.updateStatus = (reqBody, data) => {
    return new Promise((resolve, reject) => {

        let enquiries_id = reqBody.enquiries_id;
        let enquiriesId = [];
        for (let i = 0; i < enquiries_id.length; i++) {
            enquiriesId.push(ObjectId(enquiries_id[i]));
        }

        let queryObj = { _id: { $in: enquiriesId } };
        let statusObj = {
            $set: {
                "status": parseInt(reqBody.status),
                "updated_by": data._id
            }
        };

        let Enquiry = mongoose.model('enquiries', enquiriesSchema);

        Enquiry.updateMany(queryObj, statusObj,
            (error, result) => {
                if (error) {

                    printLogger(2, result, 'enquiry');
                    reject(error);
                }
                else {

                    printLogger(2, result, 'enquiry');
                    resolve(result);
                }
            });

    })

};


enquiriesSchema.statics.Get_Count = (reqBody, data) => {
    return new Promise((resolve, reject) => {

        // Bulk update enquiries
        db.collection('enquiries')
            .aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
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


// module exports
module.exports = mongoose.model('enquiries', enquiriesSchema);