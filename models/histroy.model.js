const mongoose = require("mongoose");
const { ObjectId } = require('mongodb');

const db = require("../database");
const companyModel = require('./employer.model');
const attendanceModel = require('./attendance.model');
const enquiriesModel = require('./enquiries.model');
const monthlyTransactionModel = require('./monthlyTransaction.model');
const transactionModel = require('./transaction.model');
const userModel = require('./user.model');

const histroySchema = mongoose.Schema({

    resourse_type: {
        type: String,
        required: true
    },

    json: {
        type: String,
        required: true
    },

    resourse_id: {
        type: Number,
        required: true
    },

    client_id: {
        type: Number,
        required: true
    },

    created_by: String,

    updated_by: String
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    }
);


// Update company name multiple collections 
histroySchema.statics.updateCompanyName = (reqBody) => {
    return new Promise((resolve, reject) => {

        // Convert to object id
        let query = {
            "_id": ObjectId(reqBody.company_id)
        };

        let _query = { "company_id": String(reqBody.company_id) }

        let _data = {
            $set: {
                "company_name": reqBody.company_name,
                "updated_by": reqBody.updated_by
            }
        };

        // Histories model object
        let histories = mongoose.model('histories', histroySchema);

        // Company name update in company collections 
        companyModel.findOneAndUpdate(query, _data, (error, result) => {
            if (error) {

                reject(error);
            } else {

                // Company name update in attendance collections 
                attendanceModel.updateMany(_query, _data, (error, result) => {
                    if (error) {
                        reject(error);
                    } else {

                        // Company name update in enquiries collections 
                        enquiriesModel.updateMany(_query, _data, (error, result) => { // this collections company id nhi h 
                            if (error) {
                                reject(error);
                            } else {

                                // Company name update in monthly transactions collections 
                                monthlyTransactionModel.updateMany(_query, _data, (error, result) => {
                                    if (error) {
                                        reject(error);
                                    } else {

                                        // Company name update in transaction collections 
                                        transactionModel.updateMany(_query, _data, (error, result) => {
                                            if (error) {
                                                reject(error);
                                            } else {
                                                resolve(result)

                                            }

                                        })


                                    }
                                })
                            }
                        })
                    }
                })
            }
        })
    })
};


// Update full name in multiple collections
histroySchema.statics.updateName = (reqBody) => {
    return new Promise((resolve, reject) => {
        // Convert to object id
        let query = {
            "_id": ObjectId(reqBody.user_id)
        };

        let employee_id = {
            "employee_id": reqBody.user_id
        }

        let user_id = {
            "user_id": reqBody.user_id
        }
        let _data = {
            $set: {
                "first_name": reqBody.first_name,
                "last_name": reqBody.last_name,
                "updated_by": reqBody.updated_by
            }
        };

        // Histories model object
        let histories = mongoose.model('histories', histroySchema);

        // first name and last name name update in user collections 
        userModel.findOneAndUpdate(query, _data, (error, result) => {
            if (error) {
                reject(error);
            } else {

                // first name and last name name update in attendance collections 
                attendanceModel.updateMany(employee_id, _data, (error, result) => {
                    if (error) {
                        reject(error)
                    } else {

                        // first name and last name name update in monthly transactions collections 
                        monthlyTransactionModel.updateMany(employee_id, _data, (error, result) => {
                            if (error) {
                                reject(error);
                            } else {

                                // first name and last name name update in transaction collections 
                                transactionModel.updateMany(user_id, _data, (error, result) => {
                                    if (error) {
                                        reject(error);
                                    } else {

                                        resolve(result)
                                    }
                                })
                            }
                        })
                    }
                })
            }
        })

    })
};



// Update work shift name in multiple collections
histroySchema.statics.updateWorkShiftName = (reqBody) => {
    return new Promise((resolve, reject) => {

        // Convert to object id
        let query = {
            "work_shift_id": reqBody.work_shift_id
        };

        let _data = {
            $set: {
                "work_shift_name": reqBody.work_shift_name,
                "updated_by": reqBody.updated_by
            }
        };

        // Histories model object
        let histories = mongoose.model('histories', histroySchema);

        // Work shift name update in user collections 
        userModel.updateMany(query, _data, (error, result) => {
            if (error) {
                reject(error);
            } else {

                resolve(result);

            }
        })

    })
};

// module exports
module.exports = mongoose.model('histories', histroySchema);