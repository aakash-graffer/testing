const mongoose = require('mongoose');
const moment = require('moment');
const { ObjectId } = require('mongodb');

const { sorting, lastWeek, thisMonth, toDay, lastMonth, dateFilter, customDateFilter, enumValue } = require('../core/utility');
const db = require('../database');


// Attendance schema
const attendanceSchema = mongoose.Schema({

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

    company_id: {
        type: String,
        required: true
    },

    company_name: {
        type: String,
        required: true
    },

    employee_id: {
        type: String,
        required: true
    },

    employee_auto_id: {
        type: String,
        required: true
    },

    punch_in: {
        type: Number
    },

    punch_out: {
        type: Number
    },

    status: {
        type: Number,
        required: true
    },

    today_late_in: {
        type: Number
    },

    today_early_out: {
        type: Number
    },

    actual_working_hours: {

        hours: Number,
        minutes: Number
    },

    today_deficit_hours: {
        hours: Number,
        minutes: Number
    },

    work_shift_id: {
        type: String
    },

    work_shift_name: {
        type: String
    },

    created_by: String,

    updated_by: String
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });


// Punch in
attendanceSchema.statics.punchIn = (attendanceData) => {
    return new Promise((resolve, reject) => {

        // Attendance schema object
        let Attendance = mongoose.model('attendances', attendanceSchema);

        // Save Punch in data
        let attendance = new Attendance(attendanceData);
        attendance.save((error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};


// Punch out
attendanceSchema.statics.punchOut = (reqBody) => {

    return new Promise((resolve, reject) => {

        // Punch out data
        let query = { "_id": ObjectId(reqBody.punchin_id) };

        let data = {
            $set: {
                "punch_out": reqBody.punchoutTime
            }
        };

        // Attendance schema object
        let Attendance = mongoose.model('attendances', attendanceSchema);

        // Update punch out data
        Attendance.findOneAndUpdate(query, data, (error, result) => {
            if (error) {
                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })
};


// Update punch out and actual working hour
attendanceSchema.statics.actualWorkingHour = (updateData) => {
    return new Promise((resolve, reject) => {


        let query = { "_id": ObjectId(updateData.punchin_id) };
        let data = {
            $set: {
                "punch_out": updateData.punchOut,
                "actual_working_hours": {
                    "hours": updateData.actualWorkingHours.hours,
                    "minutes": updateData.actualWorkingHours.minutes
                },
                "status": updateData.status,
                "today_late_in": updateData.todayLateIn,
                "today_early_out": updateData.todayEarlyOut,
                "today_deficit_hours": {
                    "hours": updateData.todayDeficitHours.hours,
                    "minutes": updateData.todayDeficitHours.minutes
                }
            }
        };

        // Attendance schema object
        let Attendance = mongoose.model('attendances', attendanceSchema);

        // Update actual working hours and employee attendance status
        Attendance.findOneAndUpdate(query, data, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        });
    })
};


// Find attendance by attendance id
attendanceSchema.statics.findAttendance = (attendanceId) => {
    return new Promise((resolve, reject) => {

        // Attendance schema object
        let Attendance = mongoose.model('attendances', attendanceSchema);

        let query = { "_id": ObjectId(attendanceId) };

        Attendance.findOne(query, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};

// Attendance list
attendanceSchema.statics.attendanceList = (reqBody, companyId) => {
    return new Promise((resolve, reject) => {
        let query = {};

        // Searching
        if (reqBody.search_name) {

            // Search by employee name
            query = {
                $or: [
                    { "first_name": { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { "middle_name": { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { "last_name": { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { "full_name": { $regex: `^${reqBody.search_name}`, $options: "i" } }
                ]
            }
        }

        // Filter by month (This month)
        if (parseInt(reqBody.days_filter) === enumValue._thisMonth) {

            query.created_at = thisMonth();
        }

        // Filter by week (Last week)
        // Week start from sunday
        else if (parseInt(reqBody.days_filter) === enumValue._lastWeek) {

            query.created_at = lastWeek();
        }

        // Filter by today            
        else if (parseInt(reqBody.days_filter) === enumValue.today) {

            query.created_at = toDay();
        }

        // Filter by last month            
        else if (parseInt(reqBody.days_filter) === enumValue._lastMonth) {

            query.created_at = lastMonth();
        }

        // Filter by start and end date 
        else if (reqBody.start_date && reqBody.end_date) {

            query.created_at = customDateFilter(reqBody.start_date, reqBody.end_date);
        }

        // Filter by status
        if (reqBody.status) {

            if (reqBody.status != 0) {
                query.status = parseInt(reqBody.status)
            }
        }

        // Filter by employee id
        if (reqBody.employee_id) {

            query.employee_id = { $eq: reqBody.employee_id }
        }

        // Filter by company id
        else if (companyId) {

            query.company_id = { $eq: companyId };
        }

        // console.log("query:- ", query)

        // Pagination
        let currentPage = reqBody.page ? reqBody.page : 1;
        let perPage = reqBody.page_size ? reqBody.page_size : 10;
        let skip = (currentPage - 1) * perPage;

        // Sorting
        let sortBy = reqBody.sort_by === 'ascending' ? 1 : -1;
        let sortByColumn = reqBody.sort_by_column;
        let sortQuery = sorting(sortByColumn, sortBy);

        // Aggregation query
        let aggregationQuery = [
            {
                $project: {
                    "_id": "$_id",
                    "first_name": "$first_name",
                    "middle_name": "$middle_name",
                    "last_name": "$last_name",
                    "full_name": {
                        $cond: {
                            if: {
                                $eq: ["$middle_name", ""]
                            },
                            then: { $concat: ["$first_name", " ", "$last_name"] },
                            else: { $concat: ["$first_name", " ", "$middle_name", " ", "$last_name"] }
                        }
                    },

                    "company_id": "$company_id",
                    "company_name": "$company_name",
                    "employee_id": "$employee_id",

                    "punch_in": "$punch_in",
                    "punch_out": "$punch_out",
                    "work_shift_id": "$work_shift_id",
                    "shift_name": "$shift_name",
                    "employee_auto_generate_id": "$employee_auto_id",

                    "actual_working_hour": "$actual_working_hours",
                    "status": "$status",
                    "created_at": "$created_at",
                }
            },
            { $match: query },
        ]

        db.collection("attendances").aggregate(aggregationQuery).toArray((error, countResult) => {
            if (error) {

                reject(error);
            }
            else {
                let total = countResult[0] === undefined ? 0 : countResult.length;

                aggregationQuery.push({ $sort: sortQuery });
                aggregationQuery.push({ $skip: skip });
                aggregationQuery.push({ $limit: perPage });

                db.collection("attendances")
                    .aggregate(aggregationQuery, { collation: { locale: 'en_US', strength: 2 } })
                    .toArray((error, result) => {
                        if (error) {
                            reject(error);
                        }
                        else {
                            let _result = {
                                "total": total,
                                "result": result
                            }
                            resolve(_result);
                        }
                    });
            }
        })
    });
};


/*  WE HAVE SOME ISSUE IN FULL NAME SEARCH SO WE COMMENT THIS CODE  */
// // Attendance list
// attendanceSchema.statics.attendanceList = (reqBody, companyId) => {
//     return new Promise((resolve, reject) => {
//         let query = {};

//         // Searching
//         if (reqBody.search_name) {

//             // Search by employee name
//             query = {
//                 $or: [
//                     { "first_name": { $regex: `^${reqBody.search_name}`, $options: "i" } },
//                     { "middle_name": { $regex: `^${reqBody.search_name}`, $options: "i" } },
//                     { "last_name": { $regex: `^${reqBody.search_name}`, $options: "i" } },
//                     // { "company_name": { $regex: `^${reqBody.search_name}`, $options: "i" } }
//                 ]
//             }
//         }

//         // Filter by month (This month)
//         if (parseInt(reqBody.days_filter) === enumValue._thisMonth) {

//             query.created_at = thisMonth();
//         }

//         // Filter by week (Last week)
//         // Week start from sunday
//         else if (parseInt(reqBody.days_filter) === enumValue._lastWeek) {

//             query.created_at = lastWeek();
//         }

//         // Filter by today            
//         else if (parseInt(reqBody.days_filter) === enumValue.today) {

//             query.created_at = toDay();
//         }

//         // Filter by last month            
//         else if (parseInt(reqBody.days_filter) === enumValue._lastMonth) {

//             query.created_at = lastMonth();
//         }

//         // Filter by start and end date 
//         else if (reqBody.start_date && reqBody.end_date) {

//             query.created_at = customDateFilter(reqBody.start_date, reqBody.end_date);
//         }

//         // Filter by status
//         if (reqBody.status) {

//             if (reqBody.status != 0) {
//                 query.status = parseInt(reqBody.status)
//             }
//         }

//         // Filter by employee id
//         if (reqBody.employee_id) {

//             query.employee_id = { $eq: reqBody.employee_id }
//         }

//         // Filter by company id
//         else if (companyId) {

//             query.company_id = { $eq: companyId };
//         }

//         // console.log("query:- ", query)

//         // Pagination
//         let currentPage = reqBody.page ? reqBody.page : 1;
//         let perPage = reqBody.page_size ? reqBody.page_size : 10;
//         let skip = (currentPage - 1) * perPage;

//         // Sorting
//         let sortBy = reqBody.sort_by === 'ascending' ? 1 : -1;
//         let sortByColumn = reqBody.sort_by_column;


//         // Sorting
//         let sortQuery = sorting(sortByColumn, sortBy);
//         db.collection("attendances").countDocuments(query, (error, countResult) => {
//             if (error) {

//                 reject(error);
//             }
//             else {
//                 let total = countResult;
//                 db.collection("attendances")
//                     .aggregate([
//                         { $match: query },
//                         {
//                             $facet: {

//                                 // Persent count
//                                 present: [
//                                     {
//                                         $match: { status: enumValue.presentStatus }
//                                     },
//                                     { $count: "status" }
//                                 ],

//                                 // Absent count
//                                 absent: [
//                                     { $match: { status: enumValue.absentStatus } },
//                                     { $count: "status" }

//                                 ],

//                                 // Half day count
//                                 half_day: [
//                                     { $match: { status: enumValue.halfDayStatus } },
//                                     { $count: "status" }

//                                 ],

//                                 // Leave count
//                                 leave: [
//                                     { $match: { status: enumValue.leaveStatus } },
//                                     { $count: "status" }

//                                 ],

//                                 // Missed punch count
//                                 missed_punch: [
//                                     { $match: { status: enumValue.missedPunch } },
//                                     { $count: "status" }

//                                 ],

//                                 list: [
//                                     {
//                                         $project: {
//                                             "_id": "$_id",
//                                             "first_name": "$first_name",
//                                             "middle_name": "$middle_name",
//                                             "last_name": "$last_name",

//                                             "company_id": "$company_id",
//                                             "company_name": "$company_name",
//                                             "employee_id": "$employee_id",

//                                             "punch_in": "$punch_in",
//                                             "punch_out": "$punch_out",
//                                             "work_shift_id": "$work_shift_id",
//                                             "shift_name": "$shift_name",
//                                             "employee_auto_generate_id": "$employee_auto_id",

//                                             "actual_working_hour": "$actual_working_hours",
//                                             "status": "$status",
//                                             "created_at": "$created_at",
//                                         }
//                                     },
//                                     { "$sort": sortQuery },
//                                     { "$skip": skip },
//                                     { "$limit": perPage }
//                                 ]
//                             }
//                         },
//                     ], { collation: { locale: 'en_US', strength: 2 } })
//                     .toArray((error, result) => {
//                         if (error) {
//                             reject(error);
//                         }
//                         else {
//                             let _result = {
//                                 "total": total,
//                                 "result": result
//                             }
//                             resolve(_result);

//                         }
//                     });
//             }
//         })

//     });
// };


// Find attendance by employee id (this month)
attendanceSchema.statics.findAttendanceByEmployeeId = (data) => {
    return new Promise((resolve, reject) => {

        // Attendance schema object
        let Attendance = mongoose.model('attendances', attendanceSchema);

        let query = { "employee_id": data.employee_id };

        // This month filter calling
        query.created_at = thisMonth();
        Attendance.find(query, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};



// Find attendance by employee id for last swipe  (This method used in employees mode for last swipe)
attendanceSchema.statics.findEmployeeAttendance = (data) => {
    return new Promise((resolve, reject) => {


        let query = { "employee_id": `${data.employee_id}` };

        // Find attendance query
        db.collection('attendances').aggregate([
            {
                "$match": query
            },

            { "$sort": { created_at: -1 } },
            { "$limit": 1 }
        ]
        ).toArray((error, result) => {
            if (error) {
                reject(error);
            }
            else {

                resolve(result);
            }
        });
    })
};


// Edit employee attendance status
attendanceSchema.statics.editAttendance = (reqBody, userData) => {
    return new Promise((resolve, reject) => {

        let query = { "_id": ObjectId(reqBody._id) };
        let data
        if (reqBody.status === enumValue.presentStatus || reqBody.status === enumValue.absentStatus || reqBody.status === enumValue.missedPunch || reqBody.status === enumValue.halfDayStatus || reqBody.status === enumValue.leaveStatus || reqBody.status === enumValue.weeklyOffStatus || reqBody.status === enumValue.paidHolidayStatus || reqBody.status === enumValue.unpaidHolidayStatus) {
            data = {
                $set: {
                    "status": reqBody.status,
                    "updated_by": userData._id
                }
            }
        }
        else {
            data = {
                $set: {
                }
            }
        }

        // AttendanceSchema Object
        let Attendance = mongoose.model('attendances', attendanceSchema);

        Attendance.findOneAndUpdate(query, data, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};


// Update attendance punch in time, punch out time and actual working hour
attendanceSchema.statics.updateAttendance = (changeData) => {
    return new Promise((resolve, reject) => {

        let query = { "_id": ObjectId(changeData._id) };
        let data;


        if (changeData.actualWorkingHour) {
            data = {
                $set: {
                    "punch_in": changeData.punchIn,
                    "punch_out": changeData.punchOut,
                    "actual_working_hours": changeData.actualWorkingHour,
                    "today_deficit_hours": changeData.todayDeficitHour,
                    "today_late_in": changeData.todayLateIn,
                    "today_early_out": changeData.todayEarlyOut
                }
            }
        }
        else {
            data = {
                $set: {
                }
            }
        }

        // AttendanceSchema Object
        let Attendance = mongoose.model('attendances', attendanceSchema);

        Attendance.findOneAndUpdate(query, data, (error, result) => {
            if (error) {

                reject(error);
            }
            else {
                resolve(result);
            }
        })

    })
};


// Attendance list today
attendanceSchema.statics.attendanceListToday = (_data) => {
    return new Promise((resolve, reject) => {

        // Filter by today            
        let query = {}
        query.status = { "$in": [enumValue.presentStatus, enumValue.absentStatus, enumValue.leaveStatus] };

        if (_data) {
            query.company_id = _data.company_id;
            query.created_at = toDay();
        }
        else {

            query.created_at = toDay();
        }
        // Database query
        db.collection('attendances')
            .aggregate(
                [
                    { $match: query },
                    {
                        $group: {
                            _id: "$status",
                            count: { $sum: 1 }
                        }
                    }]
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


// Attendance find employee id by todays
attendanceSchema.statics.attendanceListMonthly = (data) => {
    return new Promise((resolve, reject) => {

        let query = {};

        query.employee_id = String(data.employee_id);
        query.created_at = thisMonth();


        // Find attendance query
        db.collection('attendances').find(query).toArray((error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};




// Find attendance by employee id (today)
attendanceSchema.statics.findTodayAttedance = (data) => {
    return new Promise((resolve, reject) => {

        let query = { "employee_id": data.employee_id };
        query.created_at = toDay();

        let aggregateQuery = [
            {
                $addFields: { "employee_id": { "$toObjectId": "$employee_id" } }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "employee_id",
                    foreignField: "_id",
                    as: "Employee"
                }
            },
            { $unwind: "$Employee" },

            {
                $addFields: { "employee_id": { "$toString": "$employee_id" } }
            },
            {
                $project: {
                    "employee_id": 1,
                    "punch_in": 1,
                    "punch_out": 1,
                    "status": 1,
                    "is_punch": "$Employee.is_punch_in_punch_out",
                    "calculated_last_swipe": "$Employee.calculated_last_swipe",
                    "created_at": 1
                }
            },
            { $match: query },
        ]

        // Find workshift list
        db.collection('attendances').aggregate(aggregateQuery).toArray((error, result) => {
            if (error) {

                reject(error);
            }
            else {

                let _result = result[0];
                resolve(_result);
            }
        })
    })
};


// Module exports
module.exports = mongoose.model('attendances', attendanceSchema);