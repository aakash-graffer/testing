const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { lastMonth, thisMonth, lastThreeMonth, thisYear, enumValue, lastYear } = require('../core/utility');
const db = require('../database')

// Notifications schema
const notificationSchema = mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },

    company_id: {
        type: String
    },

    message: {
        type: String,
        required: true
    },

    resource_type: {
        type: Number,
        required: true
    },

    imps_receipt_link: {
        type: String
    },

    status: {
        type: Number,
        required: true
    },

    request_id: {
        type: String,
        // required: true
    },

    time: {
        type: Number
    },

    is_read: {
        default: false,
        type: Boolean,
        required: true
    },

    for_notifications: {
        type: Number,
        required: true
    },

    created_by: String,

    updated_by: String,
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });


// Create notifications
notificationSchema.statics.bulkInsert = (notificationData) => {
    return new Promise((resolve, reject) => {

        // NotificationSchema object
        let Notifications = mongoose.model('notifications', notificationSchema);

        Notifications.insertMany(notificationData, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }

        });
    });
};


// Update notifications
notificationSchema.statics.updateNotification = (data, userData) => {
    return new Promise((resolve, reject) => {
        let query = { "user_id": data.user_id };

        let _data = {
            $set: {
                "first_name": data.first_name,
                "middle_name": data.middle_name,
                "last_name": data.last_name,
                "company_name": data.company_name,
                "resource_type": data.resource_type,
                "status": data.status,
                "request_id": data.request_id,
                "updated_by": userData._id
            }
        }

        // NotificationSchema object
        let Notifications = mongoose.model('notifications', notificationSchema);

        // Update notifications
        Notifications.findOneAndUpdate(query, _data, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })
}


// Update notifications status
notificationSchema.statics.updateStatus = (data, userData) => {
    return new Promise((resolve, reject) => {

        let notifications_id = data.notifications_id;
        let notificationsId = [];
        for (let i = 0; i < notifications_id.length; i++) {
            notificationsId.push(ObjectId(notifications_id[i]));
        }

        let statusObj = { $set: { "status": enumValue.archiveStatus, "updated_by": userData._id } };

        // NotificationSchema object
        let Notifications = mongoose.model('notifications', notificationSchema);

        // Find one and update 
        Notifications.updateMany({ _id: { $in: notificationsId } }, statusObj, (error, result) => {

            if (error) {

                reject(error);
            } else {

                resolve(result);
            }
        });

    })

};



// Notifications for rupyo admin and employer (with filter)
notificationSchema.statics.list = (reqBody, roleId, companyId) => {
    return new Promise((resolve, reject) => {

        let currentPage = reqBody.page ? parseInt(reqBody.page) : 1;
        let perPage = reqBody.page_size ? parseInt(reqBody.page_size) : 10;
        let skip = (currentPage - 1) * perPage;
        let sortBy = reqBody.sort_by === 'ascending' ? 1 : -1;
        let sortByColumn = reqBody.sort_by_column;

        // Sorting
        let sortQuery = sorting(sortByColumn, sortBy);

        let query = {};
        query.for_notifications = parseInt(roleId);

        // Filter by status
        if (reqBody.filter_by_status) {
            query.status = parseInt(reqBody.filter_by_status);

        }

        // Filter by resource type (payout, attendance, administration)
        if (reqBody.type_of_filter.length > 0) {
            query.resource_type = { "$in": reqBody.type_of_filter };
        }

        // Filter by company id
        if (companyId) {
            query.company_id = companyId;
        }

        // Filter by user id
        if (reqBody.user_id) {
            query.user_id = reqBody.user_id;
        }

        // console.log("query:- ",query)

        let matchQuery = [
            {
                $addFields: {
                    "company_id": { "$toObjectId": "$company_id" },
                    "user_id": { "$toObjectId": "$user_id" }
                }
            },

            // Lookup for companies collection
            {
                $lookup: {
                    from: "companies",
                    localField: "company_id",
                    foreignField: "_id",
                    as: "Company"
                }
            },
            { $unwind: "$Company" },

            // Lookup for users collections
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "Users"
                }
            },
            { $unwind: "$Users" },

            {
                $addFields: {
                    "company_id": { "$toString": "$company_id" },
                    "user_id": { "$toString": "$user_id" }
                }
            },

            {
                $project: {
                    "id": 1,
                    "is_read": 1,
                    "user_id": 1,
                    "company_id": 1,
                    "message": 1,
                    "resource_type": 1,
                    "status": 1,
                    "request_id": 1,
                    "for_notifications": 1,
                    "created_at": 1,
                    "time": 1,
                    "imps_receipt_link": 1,
                    "company_name": "$Company.company_name",
                    "first_name": "$Users.first_name",
                    "middle_name": "$Users.middle_name",
                    "last_name": "$Users.last_name",
                    "selfie": "$Users.selfie"
                }
            },
            { "$match": query }
        ]

        // Actual query
        db.collection("notifications").aggregate(matchQuery).toArray((error, countResult) => {
            if (error) {

                reject(error);
            }
            else {
                total = countResult[0] === undefined ? 0 : countResult.length;

                matchQuery.push({ $sort: sortQuery });
                matchQuery.push({ $skip: skip });
                matchQuery.push({ $limit: parseInt(perPage) });

                db.collection('notifications').aggregate(matchQuery, { collation: { locale: 'en_US', strength: 2 } }).toArray((error, result) => {

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
                });
            }
        })
    });
};


// Notifications for employee (with filter)
notificationSchema.statics.employeeFilterNotification = (reqFilter) => {
    return new Promise((resolve, reject) => {

        let query = {};
        let currentPage = reqFilter.current_page ? parseInt(reqFilter.current_page) : 1;
        let perPage = parseInt(10);

        currentPage = currentPage > 10 ? 10 : parseInt(reqFilter.current_page);
        let skip = (currentPage - 1) * perPage;

        /**
       * Check reqbody value and enum
       * this_month : 0, first date current month 
       * last_month : 1, first date pervious month
       * last_year : 2, first date last year
       * last_three_months : 3 first date last three month
       */

        // console.log("reqFilter:- ", reqFilter)

        query = {
            "is_read": { "$in": [true, false] },
            "user_id": reqFilter.user_id,
            "for_notifications": enumValue.employeeRoleId,
            "resource_type": { "$in": [enumValue.payoutStatus, enumValue._account, enumValue.attendanceStatus] }
        };

        let year = parseInt(reqFilter.year);

        // This month = 0
        if (year === enumValue.thisMonth) {

            query.created_at = thisMonth();
        }

        // Last month = 1
        if (year === enumValue.lastMonth) {

            query.created_at = lastMonth();
        }

        // Last three months = 3
        if (year === enumValue.lastThreeMonths) {

            query.created_at = lastThreeMonth();
        }

        // Last year = 2
        if (year === enumValue.lastYear) {

            query.created_at = lastYear();
        }

        // This year = 4
        if (year === enumValue.thisYear) {

            query.created_at = thisYear();
        }

        // Filter by type of payout (4) and attendance (5)  
        if (parseInt(reqFilter.notification_type) != 0) {

            query.resource_type = parseInt(reqFilter.notification_type);
        }

        // console.log("query:- ", query)

        db.collection('notifications')
            .aggregate(
                [
                    { $match: query },
                    {
                        $project: {
                            "id": "$_id",
                            "text": "$message",
                            "type": "$resource_type",
                            "status": "$status",
                            "attachment": "$imps_receipt_link",
                            "read": "$is_read",
                            "timestamp": "$created_at"
                        }
                    },
                    { "$sort": { 'read': 1, 'timestamp': -1 } },
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


// Read notifications mark
notificationSchema.statics.readNotificationsMark = (data) => {
    return new Promise((resolve, reject) => {

        let query = {
            "_id": ObjectId(data.notificationId)
        }
        let _data = {
            $set: {
                "is_read": data.isRead,
                "updated_by": data.userDataId
            }
        }

        // NotificationSchema object
        let Notifications = mongoose.model('notifications', notificationSchema);

        // Update notifications
        Notifications.updateOne(query, _data, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })
};


//  Get unread count of notifications (per user)
notificationSchema.statics.unreadNotificationCount = (data) => {
    return new Promise((resolve, reject) => {

        let query = {};
        query.is_read = false;

        // Employer Notifications count
        if (data.for_notifications == enumValue.employerRoleId) {

            query.resource_type = { "$in": [enumValue._payout, enumValue.creditLimit, enumValue.requestResourceType] };  // _payout=6, creditLimit=16,  requestResourceType=6
            query.company_id = data.company_id;
            query.for_notifications = enumValue.employerRoleId;

        }
        // Rupyo admin notifications count
        else if (data.for_notifications == enumValue.rupyoAdminRoleId) {

            query.resource_type = {
                "$in": [enumValue.bankDetailResourceType, enumValue._payout, enumValue.requestResourceType,
                enumValue.forgetPasswordRequest, enumValue.creditLimit, enumValue.settlementResourceType]
            };

            query.for_notifications = enumValue.rupyoAdminRoleId;
        }
        else if (data.for_notifications == enumValue.employeeRoleId) {

            query = { $and: [{ "is_read": false }, { "user_id": `${data.employee_id}` }, { "for_notifications": enumValue.employeeRoleId }, { "resource_type": { "$in": [enumValue.payoutStatus, enumValue.attendanceStatus, enumValue._account] } }] };
        }

        db.collection('notifications').find(query).count((error, result) => {
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
module.exports = mongoose.model('notifications', notificationSchema);