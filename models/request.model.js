
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { sorting, enumValue } = require('../core/utility');
const db = require('../database');


// Request schema
const requestSchema = mongoose.Schema({

    request_id: {
        type: String,
        required: true,
        unique: true
    },

    company_id: {
        type: String,
        required: true,
    },

    request_type: {
        type: Number,
        required: true
    },

    details: {
        type: String
    },

    status: {
        type: Number,
        default : enumValue.pendingStatus,
        required: true
    },

    for_request:{
        type: Number,
        default : enumValue.rupyoAdminRoleId,
        required: true
    },

    attendance_date:{
        type: Date
    },

    amount:{
        type: Number
    },

    response: {
        type: String
    },

    created_by: String,

    updated_by: String
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });


// Create Requests 
requestSchema.statics.requestSave = (requestData) => {
    return new Promise((resolve, reject) => {

        let requests = mongoose.model('requests', requestSchema);

        let request = requests(requestData);
        request.save((error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        });
    });
};


// Requests list
requestSchema.statics.requestsList = (reqBody, companyId) => {
    return new Promise((resolve, reject) => {

        // Pagination
        let currentPage = reqBody.page ? reqBody.page : 1;
        let perPage = reqBody.page_size ? reqBody.page_size : 10;
        let skip = (currentPage - 1) * perPage;
        let query = {};


        if (reqBody.status_filter || companyId) {
            // Filter by all employer
            if (parseInt(companyId) === 0) {

                query.status = { $ne: enumValue.archiveStatus }

                // Filter by company id
            }
            else if (companyId) {
                query.company_id = companyId

                // Status filter pending , resolved and new
            }
            if (reqBody.status_filter) {
                query.status = parseInt(reqBody.status_filter)

            }
        }

        // Sorting
        let sortBy = reqBody.sort_by === 'ascending' ? 1 : -1;
        let sortByColumn = reqBody.sort_by_column;

        // Sorting
        let sortQuery = sorting(sortByColumn, sortBy);

        // Projection
        let projection = { "__v": 0, "updated_by": 0, "created_at": 0, "created_by": 0, "updated_at": 0 };

        // Count Document
        db.collection("requests").countDocuments(query, (error, result) => {
            let total = result;

            if (error) {

                reject(error);
            }
            else {
                db.collection('requests')
                    .find(query)
                    .sort(sortQuery).collation({ "locale": 'en_US', "strength": 2 })
                    .skip(skip)
                    .limit(parseInt(perPage)).project(projection)
                    .toArray((error, result) => {
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


// Find Requests
requestSchema.statics.requestFind = (reqBody) => {
    return new Promise((resolve, reject) => {

        let query = { "_id": ObjectId(reqBody.request_id), "status": { $ne: enumValue.archiveStatus } };

        // Projection key : 0 (not show) or 1 (show)
        let projection = { '__v': 0, 'updated_at': 0, 'created_by': 0 };

        let requests = mongoose.model('requests', requestSchema);
        requests.findOne(query, projection, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })
};


// Requests delete
requestSchema.statics.updateStatus = (reqBody, userData) => {
    return new Promise((resolve, reject) => {

        // Convert object id
        let requestId = [];
        for (let i = 0; i < reqBody.request_id.length; i++) {
            requestId.push(ObjectId(reqBody.request_id[i]));
        }

        let statusObj = {
            $set: {
                "status": reqBody.status,
                "updated_by": userData._id
            }
        };

        let requests = mongoose.model('requests', requestSchema);
        requests.updateMany({ _id: { $in: requestId } }, statusObj, (error, result) => {
            if (error) {

                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};


// Requests update
requestSchema.statics.requestUpdate = (reqBody, userData) => {
    return new Promise((resolve, reject) => {

        // Convert object id
        let query = { "_id": ObjectId(reqBody.request_id) };

        let _data = {
            $set: {
                "request_type": reqBody.request_type,
                "details": reqBody.details,
                "status": reqBody.status,
                "response": reqBody.response,
                "updated_by": userData._id
            }
        };

        let requests = mongoose.model('requests', requestSchema);
        requests.findOneAndUpdate(query, _data, (error, result) => {
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
module.exports = mongoose.model('requests', requestSchema);