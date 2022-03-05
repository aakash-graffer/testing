
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { sorting, enumValue } = require('../core/utility');
const db = require('../database');

// Workshift Schema
const workshiftSchema = mongoose.Schema({

    company_id: {
        type: String,
        required: true
    },

    shift_name: {
        type: String,
        required: true
    },

    shift_start_time: {
        type: String,
        required: true
    },

    shift_end_time: {
        type: String,
        required: true
    },

    is_open_shift: {
        type: Boolean,
        default: false
    },

    work_shift_duration: {
        "hours": Number,
        "minutes": Number
    },

    status: {
        type: Number,
        default: enumValue.activeStatus
    },

    created_by: String,

    updated_by: String
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });


// Find work shift maximum five and particular company to find
workshiftSchema.statics.workShiftCountByCompanyID = (reqBody) => {

    return new Promise((resolve, reject) => {
        let query = { "company_id": reqBody.company_id, "status": { $ne: enumValue.archiveStatus } };
        let WorkShifts = mongoose.model('workshifts', workshiftSchema);

        // Find workshift list
        WorkShifts.countDocuments(query, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })
}


// Create workshift 
workshiftSchema.statics.createWorkShift = (workShiftData) => {
    return new Promise((resolve, reject) => {

        let WorkShifts = mongoose.model('workshifts', workshiftSchema);

        let workShifts = WorkShifts(workShiftData);
        workShifts.save((error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        });
    });
};


// Insert workshifts data
workshiftSchema.statics.insertWorkShifts = (workShiftsData) => {
    return new Promise((resolve, reject) => {

        let WorkShifts = mongoose.model('workshifts', workshiftSchema);

        WorkShifts.insertMany(workShiftsData, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        });
    });
};


// Workshift list
workshiftSchema.statics.list = (reqBody) => {
    return new Promise((resolve, reject) => {

        /** Pagination and searching page size 20
        * let sort_by_column and order -1 or 1
        * 1 (ascending order) and -1 (descending order);
        * Only find 100 notifications
        */
        let currentPage = reqBody.page ? reqBody.page : 1;
        let perPage = reqBody.page_size ? reqBody.page_size : 10;
        let skip = (currentPage - 1) * perPage;
        let sortBy = reqBody.sort_by === 'ascending' ? 1 : -1;
        let sortByColumn = reqBody.sort_by_column;
        let query = { "status": { $ne: enumValue.archiveStatus } };

        if (reqBody.company_id) {
            query.company_id = reqBody.company_id;

        }

        // Sorting
        let sortQuery = sorting(sortByColumn, sortBy);

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
                    "company_id": 1,
                    "company_name": "$Company.company_name",
                    "id": 1,
                    "shift_name": 1,
                    "shift_start_time": 1,
                    "shift_end_time": 1,
                    "created_at": 1
                }
            },
            { "$sort": sortQuery },
            { "$skip": skip },
            { "$limit": perPage }

        ]

        // Count Document
        db.collection("workshifts").countDocuments(query, (error, result) => {
            let total = result;

            if (error) {

                reject(error);
            }
            else {

                // Find workshift list
                db.collection('workshifts').aggregate(matchQuery, { collation: { locale: 'en_US', strength: 2 } }).toArray((error, result) => {
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


// Find workshift 
workshiftSchema.statics.findWorkshift = (workshiftData) => {
    return new Promise((resolve, reject) => {

        // Check workshift id 
        if (workshiftData.work_shift_id) {
            let query = { "_id": ObjectId(workshiftData.work_shift_id), "status": { $ne: enumValue.archiveStatus } };

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
                        "company_id": 1,
                        "company_name": "$Company.company_name",
                        "id": 1,
                        "shift_name": 1,
                        "shift_start_time": 1,
                        "shift_end_time": 1,
                        "is_open_shift": 1,
                        "created_at": 1
                    }
                },
            ]

            // Find work shift by object id
            db.collection('workshifts').aggregate(matchQuery).toArray((error, result) => {
                if (error) {

                    reject(error);
                }
                else {
                    let _result = result[0] == undefined || result[0] == null ? null : result[0];
                    resolve(_result);
                }
            })
        }
        else {

            // Find work shift by company id
            query = { "company_id": workshiftData.company_id, "status": { $ne: enumValue.archiveStatus } };
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
                        "company_id": 1,
                        "company_name": "$Company.company_name",
                        "id": 1,
                        "shift_name": 1,
                        "shift_start_time": 1,
                        "shift_end_time": 1,
                        "is_open_shift": 1,
                        "created_at": 1
                    }
                },
                {
                    $sort:{
                        is_open_shift: -1
                    }
                }
            ]

            db.collection('workshifts').aggregate(matchQuery).toArray((error, result) => {
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


// Workshift delete
workshiftSchema.statics.updateStatus = (data, userData) => {
    return new Promise((resolve, reject) => {


        // Database query
        let query = { "_id": ObjectId(data.work_shift_id), "is_open_shift": { $ne: true } };

        let _data = {
            $set: {
                "status": enumValue.archiveStatus,
                "updated_by": userData._id
            }
        };

        let WorkShifts = mongoose.model('workshifts', workshiftSchema);
        WorkShifts.findOneAndUpdate(query, _data, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })
};


// Update workshift
workshiftSchema.statics.workshiftUpdate = (data, userData) => {
    return new Promise((resolve, reject) => {

        // Convert object id
        let query = { "_id": ObjectId(data.workshift_id), "is_open_shift": { $ne: true } };

        let _data = {
            $set: {
                "shift_name": data.shift_name,
                "shift_start_time": data.shift_start_time,
                "shift_end_time": data.shift_end_time,
                "updated_by": userData._id
            }
        };

        let WorkShifts = mongoose.model('workshifts', workshiftSchema);

        // Update work shift
        WorkShifts.findOneAndUpdate(query, _data, (error, result) => {
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
module.exports = mongoose.model('workshifts', workshiftSchema);