const db = require('../database');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const moment = require('moment');
const { enumValue } = require('../core/utility');

// Schema
const holidaySchema = mongoose.Schema({

    company_id: {
        type: String,
        required: true
    },

    year: {
        type: Number,
        required: true
    },

    holidays: [
        {
            date: {
                type: Date,
                required: true
            },

            detail: {
                type: String,
                required: true
            },

            is_paid: {
                type: Boolean,
                required: true
            }
        }
    ]
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });


// Add holiday
holidaySchema.statics.addHoliday = (reqBody) => {
    return new Promise((resolve, reject) => {

        let Holiday = mongoose.model('holidays', holidaySchema);

        let holidayData = Holiday(reqBody);
        holidayData.save((error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};


// Find holiday by company id and year
holidaySchema.statics.findByCompanyIdAndYear = (checkData) => {
    return new Promise((resolve, reject) => {
        let Holiday = mongoose.model('holidays', holidaySchema);

        Holiday.findOne(checkData, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};


// Add more holiday
holidaySchema.statics.addMoreHoliday = (holidayId, updateData) => {
    return new Promise((resolve, reject) => {

        let query = {
            _id: ObjectId(holidayId)
        }

        let update = {
            $set: updateData
        }

        let Holiday = mongoose.model('holidays', holidaySchema);

        Holiday.findOneAndUpdate(query, update, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};


// Holiday list
holidaySchema.statics.holidayList = (reqBody) => {
    return new Promise((resolve, reject) => {

        let query = {};

        if (reqBody.company_id) {
            query.company_id = reqBody.company_id;
        }

        if (reqBody.year) {
            query.year = parseInt(reqBody.year);
        }

        let currentPage = parseInt(reqBody.page) ? parseInt(reqBody.page) : 1;
        let perPage = parseInt(reqBody.page_size) ? parseInt(reqBody.page_size) : 20;
        let skip = (currentPage - 1) * perPage;
        let sortBy = reqBody.sort_by === 'ascending' ? 1 : -1;
        let sortByColumn = reqBody.sort_by_column;

        // Sorting 
        let sortQuery = sorting(sortByColumn, sortBy);

        // Projection
        let projection = {};


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
                    _id: 1,
                    company_id: "$company_id",
                    company_name: "$Company.company_name",
                    year: 1,
                    holidays: 1
                }
            },
            // { $match: query },
            { $sort: sortQuery },
            { $skip: skip },
            { $limit: perPage }
        ]

        db.collection("holidays").countDocuments(query, (error, count) => {
            if (error) {
                reject(error);
            }
            else {
                db.collection("holidays")
                    .aggregate(aggregateQuery)
                    .toArray((error, result) => {
                        if (error) {
                            reject(error);
                        }
                        else {

                            let _result = {
                                "total": count,
                                "result": result
                            };
                            resolve(_result);
                        }
                    })
            }
        })
    })
};




// // Holiday list for scheduler
// holidaySchema.statics.holidayListForScheduler = () => {
//     return new Promise((resolve, reject) => {

//         let query = {};

//         let date = moment().format('YYYY-MM-DD');
//         let today = new Date(date + "T00:00:00.000Z");

//         query.holidays = {
//             $all: [
//                 { "$elemMatch": { date: { $eq: today } } }
//             ]
//         }

//         // console.log("query:- ", query)

//         let aggregateQuery = [
//             { $match: query },
//             {
//                 $addFields: { "company_id": { "$toString": "$company_id" } }
//             },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "company_id",
//                     foreignField: "company_id",
//                     as: "User"
//                 }
//             },
//             { $unwind: "$User" },
//             {
//                 $project: {
//                     company_id: "$company_id",
//                     year: 1,
//                     holidays: 1,
//                     role_id: "$User.role_id",
//                     _id: "$User._id",
//                     verification_status: "$User.verification_status",
//                     first_name: "$User.first_name",
//                     middle_name: "$User.middle_name",
//                     last_name: "$User.last_name",
//                     employee_id: "$User.employee_id",
//                     work_shift_id: "$User.work_shift_id",
//                     company_name: "$User.company_name",
//                     net_salary: "$User.net_salary",
//                     employee_status: "$User.status",
//                     is_punch_in_punch_out: "$User.is_punch_in_punch_out"
//                 }
//             },
//             {
//                 $match: {
//                     role_id: enumValue.employeeRoleId,
//                     employee_status: { $ne: enumValue.archiveStatus },
//                     verification_status: { $gte: enumValue.selfie },
//                     $or: [{ "is_punch_in_punch_out": null },
//                     {
//                         "is_punch_in_punch_out": { $eq: true },
//                     }],
//                 }
//             },
//         ]

//         db.collection("holidays").aggregate(aggregateQuery)
//             .toArray((error, result) => {
//                 if (error) {
//                     reject(error);
//                 }
//                 else {

//                     resolve(result);
//                 }
//             })
//     })
// };


// Module exports
module.exports = mongoose.model('holidays', holidaySchema);