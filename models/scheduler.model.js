const mongoose = require('mongoose');
const util = require('util');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const db = require('../database');
const userModel = require('./user.model');
const { notification, toDay, thisMonth, enumValue, thisWeek, printLogger } = require('../core/utility');
const { update } = require('./user.model');

// Employee schema
const schedulerSchema = mongoose.Schema({});


// Punchin reminder employee list 
schedulerSchema.statics.missedPunchinReminder = () => {
    return new Promise((resolve, reject) => {

        printLogger(2, "*********** MODEL:- missedPunchinReminder ************", 'scheduler');

        let currentHour = parseInt(moment().utc().subtract(1, 'hours').format("H"));
        let currentdate_subtractone = moment().utc().subtract(1, 'hours').toDate();
        printLogger(2, `missedPunchinReminder_Model currentdate_substractone:- ${currentdate_subtractone}`, 'scheduler');


        // Main query
        let query = [
            {
                $addFields: {
                    "work_shift_id": { "$toObjectId": "$work_shift_id" }
                }
            },
            {
                $lookup: {
                    from: "workshifts",
                    localField: "work_shift_id",
                    foreignField: "_id",
                    as: "Workshift"
                }
            },
            { $unwind: "$Workshift" },
            {
                $project: {
                    "_id": 1,
                    "first_name": 1,
                    "middle_name": 1,
                    "last_name": 1,
                    "company_id": 1,
                    "role_id": 1,
                    "status": 1,
                    "company_name": 1,
                    "work_shift_id": 1,
                    "firebase_device_token": 1,
                    "last_swipe": 1,
                    "calculated_last_swipe": 1,
                    "is_punch_in_punch_out": 1,
                    "work_shift_name": "$Workshift.shift_name",
                    "is_open_shift": "$Workshift.is_open_shift",
                    "resp_hour": { $toInt: { $first: { $split: ["$Workshift.shift_start_time", ":"] } } }
                }
            },
            {
                $match: {
                    resp_hour:
                    {
                        $eq: currentHour
                    },
                    role_id: enumValue.employeeRoleId,
                    status: { $ne: enumValue.archiveStatus },
                    is_open_shift: { $ne: true },
                    is_punch_in_punch_out: { $in: [true, null] },
                    $and: [{ "firebase_device_token": { $nin: [null, ""] } }],
                    $or: [{ "calculated_last_swipe": null },
                    {
                        "calculated_last_swipe": { $lte: currentdate_subtractone },
                    }],
                }
            },
        ]

        printLogger(2, `missedPunchinReminder_Model  QUERY:- ${util.inspect(query)}`, 'scheduler');

        // Actual query
        db.collection('users').aggregate(query).toArray((error, result) => {
            if (error) {

                printLogger(0, `missedPunchinReminder_Model  error:- ${error}`, 'scheduler');
                reject(error);
            }
            else {

                printLogger(2, `missedPunchinReminder_Model Result:-  ${result}`, 'scheduler');
                resolve(result);
            }
        })

    })
};



// Punchout reminder employee list 
schedulerSchema.statics.missedPunchoutReminder = () => {
    return new Promise((resolve, reject) => {

        printLogger(2, " *********** MODEL:- missedPunchoutReminder ************", 'scheduler');

        let currentHour = parseInt(moment().utc().add(1, 'hours').format("H"));

        printLogger(2, `missedPunchoutReminder_Model currentHour:- ${currentHour}`, 'scheduler');

        let query = [
            {
                $addFields: {
                    "work_shift_id": { "$toObjectId": "$work_shift_id" }
                }
            },
            {
                $lookup: {
                    from: "workshifts",
                    localField: "work_shift_id",
                    foreignField: "_id",
                    as: "Workshift"
                }
            },
            { $unwind: "$Workshift" },
            {
                $project: {
                    "_id": 1,
                    "first_name": 1,
                    "middle_name": 1,
                    "last_name": 1,
                    "role_id": 1,
                    "status": 1,
                    "company_id": 1,
                    "company_name": 1,
                    "firebase_device_token": 1,
                    "work_shift_id": 1,
                    "calculated_last_swipe": 1,
                    "is_punch_in_punch_out": 1,
                    "work_shift_name": "$Workshift.shift_name",
                    "shift_start_time": "$Workshift.shift_start_time",
                    "shift_end_time": "$Workshift.shift_end_time",
                    "is_open_shift": "$Workshift.is_open_shift",
                    "last_swipe_date": { $toInt: { $dayOfMonth: "$calculated_last_swipe" } },
                    "last_swipe_month": { $toInt: { $month: "$calculated_last_swipe" } },
                    "last_swipe_year": { $toInt: { $year: "$calculated_last_swipe" } },
                    "resp_hour_shift_start_time": { $toInt: { $subtract: [{ $toInt: { $first: { $split: ["$Workshift.shift_start_time", ":"] } } }, 1] } },
                    "resp_minute_shift_start_time": { $toInt: { $last: { $split: ["$Workshift.shift_start_time", ":"] } } },
                    "resp_hour": { $toInt: { $first: { $split: ["$Workshift.shift_end_time", ":"] } } },
                    "resp_minute": { $toInt: { $last: { $split: ["$Workshift.shift_end_time", ":"] } } }
                }
            },
            {
                $match: {
                    resp_hour:
                    {
                        $eq: currentHour
                    },
                    is_open_shift: { $ne: true },
                    role_id: enumValue.employeeRoleId,
                    status: { $ne: enumValue.archiveStatus },
                    $and: [{ "firebase_device_token": { $nin: [null, ""] } }],
                    is_punch_in_punch_out: { $eq: false }
                }
            }
        ]
        printLogger(2, `missedPunchoutReminder_Model QUERY:- ${util.inspect(query)}`, 'scheduler');

        // Actual query
        db.collection('users').aggregate(query).toArray((error, result) => {
            if (error) {
                printLogger(0, `missedPunchoutReminder_Model error:- ${error}`, 'scheduler');
                reject(error);
            }
            else {
                printLogger(2, `missedPunchoutReminder_Model result:- ${result}`, 'scheduler');
                resolve(result);
            }
        })
    })
};



// Pause employee list 
schedulerSchema.statics.pauseEmployeeList = () => {
    return new Promise((resolve, reject) => {

        printLogger(2, " *********** MODEL:- pauseEmployeeList ************", 'scheduler');

        let query = {
            status: enumValue.pauseStatus,
            role_id: enumValue.employeeRoleId
        };

        // Sorting
        let sortQuery = { created_at: -1 };

        // Projection
        let projection = {
            "_id": 1,
            "employee_id": "$_id",
            "first_name": 1,
            "middle_name": 1,
            "last_name": 1,
            "status": 1,
            "work_shift_id": 1,
            "work_shift_name": 1,
            "company_id": 1
        };


        printLogger(2, `pauseEmployeeList_Model QUERY:- ${util.inspect(query)}`, 'scheduler');

        db.collection("users")
            .find(query)
            .project(projection)
            .sort(sortQuery)
            .toArray((error, result) => {
                if (error) {

                    printLogger(0, `pauseEmployeeList_Model error:- ${util.inspect(error)}`, 'scheduler');
                    reject(error);
                }
                else {

                    printLogger(2, `pauseEmployeeList_Model result:- ${util.inspect(result)}`, 'scheduler');
                    resolve(result);
                }
            })

    })
};



// Total credit limit consume employee list 
schedulerSchema.statics.creditLimitEmployeesList = () => {
    return new Promise((resolve, reject) => {

        printLogger(2, " *********** MODEL:- creditLimitEmployeesList ************", 'scheduler');

        let query = [
            {
                $addFields: { "employee_id": { "$toObjectId": "$employee_id" } }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "employee_id",
                    foreignField: "_id",
                    as: "User"
                }
            },
            { $unwind: "$User" },
            {
                $project: {

                    "first_name": 1,
                    "payout_credited": 1,
                    "_id": 0,
                    "rupyo_credit_limit": {
                        $cond: {
                            if: {
                                $eq: ["$User.credit_limit_type", 2]
                            },
                            then: { $toInt: { $divide: [{ $toInt: { $multiply: [{ $toInt: "$User.net_salary" }, { $toInt: "$User.credit_limit_percent" }] } }, 100] } },
                            else: "$User.rupyo_credit_limit"
                        }
                    },
                    "net_salary": { $toInt: "$User.net_salary" },
                    "credit_limit": "$User.rupyo_credit_limit",
                    "credit_limit_type": "$User.credit_limit_type",
                    "credit_limit_percent": "$User.credit_limit_percent",
                    "created_at": 1,
                    "percent": { $multiply: [{ $divide: ["$payout_credited", "$User.rupyo_credit_limit"] }, 100] },

                }
            },
            {
                $match: {

                    created_at: thisMonth()
                }
            },
            { "$sort": { created_at: -1 } }
        ]

        printLogger(2, `creditLimitEmployeesList_Model QUERY:- ${util.inspect(query)}`, 'scheduler');

        // Actual query
        db.collection("monthly_transactions").aggregate(query).toArray((error, result) => {
            if (error) {

                printLogger(0, `creditLimitEmployeesList_Model error:- ${util.inspect(error)}`, 'scheduler');
                reject(error);
            }
            else {

                printLogger(2, `creditLimitEmployeesList_Model result:- ${util.inspect(result)}`, 'scheduler');
                resolve(result);
            }
        })
    })
};



// Absent mark on not mark today attendance
schedulerSchema.statics.punchinMarkAbsents = () => {
    return new Promise((resolve, reject) => {

        printLogger(2, " *********** MODEL:- punchinMarkAbsents ************", 'scheduler');

        let pasthour = parseInt(moment().utc().subtract(1, 'hours').format("H"));
        let currentdate_subtractone = moment().utc().subtract(1, 'hours').toDate();
        printLogger(2, `punchinMarkAbsents_Model currentdate_subtractone:- ${currentdate_subtractone}`, 'scheduler');


        // Main query
        let query = [
            {
                $addFields: {
                    "company_id": { "$toObjectId": "$company_id" }
                }
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
                $addFields: {
                    "work_shift_id": { "$toObjectId": "$work_shift_id" }
                }
            },
            {
                $lookup: {
                    from: "workshifts",
                    localField: "work_shift_id",
                    foreignField: "_id",
                    as: "Workshift"
                }
            },
            { $unwind: "$Workshift" },
            {
                $project: {
                    "_id": 1,
                    "first_name": 1,
                    "middle_name": 1,
                    "last_name": 1,
                    "role_id": 1,
                    "employee_id": 1,
                    "company_id": 1,
                    "company_name": "$Company.company_name",
                    "status": 1,
                    "verification_status": 1,
                    "firebase_device_token": 1,
                    "last_swipe": 1,
                    "calculated_last_swipe": 1,
                    "is_punch_in_punch_out": 1,
                    "work_shift_id": 1,
                    "net_salary": 1,
                    "work_shift_name": "$Workshift.shift_name",
                    "shift_start_time": "$Workshift.shift_start_time",
                    "shift_end_time": "$Workshift.shift_end_time",
                    "last_swipe_date": { $toInt: { $dayOfMonth: "$calculated_last_swipe" } },
                    "last_swipe_month": { $toInt: { $month: "$calculated_last_swipe" } },
                    "last_swipe_year": { $toInt: { $year: "$calculated_last_swipe" } },
                    "shiftEnd": { $toInt: { $first: { $split: ["$Workshift.shift_end_time", ":"] } } }
                }
            },
            {
                $match: {
                    shiftEnd:
                    {
                        $eq: pasthour
                    },
                    verification_status: { $gte: enumValue.selfie },
                    role_id: enumValue.employeeRoleId,
                    status: { $ne: enumValue.archiveStatus },
                    // $and: [{ "firebase_device_token": { $nin: [null, ""] } }],
                    $or: [
                        { "calculated_last_swipe": null },
                        {
                            "calculated_last_swipe": { $lte: currentdate_subtractone },
                        },
                        { "is_punch_in_punch_out": null },
                        {
                            "is_punch_in_punch_out": { $eq: true },
                        }
                    ],

                    // $or: [{ "is_punch_in_punch_out": null },
                    // {
                    //     "is_punch_in_punch_out": { $eq: true },
                    // }],
                }
            },
        ]

        printLogger(2, `punchinMarkAbsents_Model QUERY- ${util.inspect(query)}`, 'scheduler')

        // Actual query
        db.collection('users').aggregate(query).toArray((error, result) => {
            if (error) {

                printLogger(0, `punchinMarkAbsents_Model error- ${error}`, 'scheduler');
                reject(error);
            }
            else {

                printLogger(2, `punchinMarkAbsents_Model result- ${result}`, 'scheduler');
                resolve(result);
            }
        })

    })
};



// Absent mark on not missed punch out
schedulerSchema.statics.punchinButNotPunchoutMarkAbsent = () => {
    return new Promise((resolve, reject) => {

        printLogger(2, " ************ MODEL:- punchinButNotPunchoutMarkAbsent *************", 'scheduler');

        let currentHour = moment().utc().format("H");
        printLogger(2, `punchinButNotPunchoutMarkAbsent_Model currentHour- ${currentHour}`, 'scheduler');

        let query = [
            {
                $addFields: {
                    "work_shift_id": { "$toObjectId": "$work_shift_id" },
                    "_id": { "$toString": "$_id" }
                }
            },
            {
                $lookup: {
                    from: "workshifts",
                    localField: "work_shift_id",
                    foreignField: "_id",
                    as: "Workshift"
                }
            },
            {
                $lookup: {
                    from: "attendances",
                    localField: "_id",
                    foreignField: "employee_id",
                    as: "Attendance"
                }
            },
            { $unwind: "$Workshift" },
            { $unwind: "$Attendance" },
            {
                $project: {
                    "_id": 1,
                    "first_name": 1,
                    "middle_name": 1,
                    "last_name": 1,
                    "role_id": 1,
                    "status": 1,
                    "company_id": 1,
                    "company_name": 1,
                    "employee_id": 1,
                    "verification_status": 1,
                    "firebase_device_token": 1,
                    "last_swipe": 1,
                    "calculated_last_swipe": 1,
                    "is_punch_in_punch_out": 1,
                    "net_salary": 1,
                    "work_shift_id": 1,
                    "work_shift_name": "$Workshift.shift_name",
                    "shift_start_time": "$Workshift.shift_start_time",
                    "shift_end_time": "$Workshift.shift_end_time",
                    "attendance_created_at": "$Attendance.created_at",
                    "attendance_id": "$Attendance._id",
                    "attendance_punch_in": "$Attendance.punch_in",
                    "attendance_punch_out": "$Attendance.punch_out",
                    "attendance_status": "$Attendance.status",
                    "resp": { $toInt: { $add: [{ $toInt: { $first: { $split: ["$Workshift.shift_end_time", ":"] } } }, 3] } }
                }
            },
            {
                $match: {
                    resp:
                    {
                        $eq: parseInt(currentHour)
                    },
                    role_id: enumValue.employeeRoleId,
                    verification_status: { $gte: enumValue.selfie },
                    status: { $ne: enumValue.archiveStatus },
                    is_punch_in_punch_out: { $eq: false },
                    $and: [
                        { attendance_created_at: toDay() },
                        { attendance_punch_out: null },
                        { attendance_status: { $in: [enumValue.missedPunch, enumValue.presentStatus] } }
                    ]
                }
            }
        ]


        printLogger(2, `punchinButNotPunchoutMarkAbsent_Model QUERY:- ${util.inspect(query)}`, 'scheduler');

        // Actual query
        db.collection('users').aggregate(query).toArray((error, result) => {
            if (error) {

                printLogger(0, `punchinButNotPunchoutMarkAbsent_Model error- ${error}`, 'scheduler');
                reject(error);
            }
            else {

                printLogger(2, `punchinButNotPunchoutMarkAbsent_Model result- ${result}`, 'scheduler');
                resolve(result);
            }
        })
    })
};




// Set weeklyOff in attendance
schedulerSchema.statics.setWeeklyOff = () => {
    return new Promise((resolve, reject) => {

        printLogger(2, ` *****************  MODEL:- setWeeklyOff  ******************* `, 'scheduler');

        let today = moment().utc().day();
        today = today === 0 ? 7 : today;

        let aggregateQuery = [
            {
                $addFields: {
                    '_id': { '$toString': '$_id' }
                }
            },

            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'company_id',
                    as: 'User'
                }
            },
            { $unwind: "$User" },

            {
                $project: {
                    company_name: 1,
                    company_id: "$_id",
                    rupyo_company_code: 1,
                    weekly_holiday: 1,
                    _id: "$User._id",
                    role_id: "$User.role_id",
                    verification_status: "$User.verification_status",
                    employee_id: "$User.employee_id",
                    first_name: "$User.first_name",
                    middle_name: "$User.middle_name",
                    last_name: "$User.last_name",
                    employee_status: "$User.status",
                    work_shift_id: "$User.work_shift_id",
                    net_salary: "$User.net_salary",
                    is_punch_in_punch_out: "$User.is_punch_in_punch_out"
                }
            },
            {
                $match: {
                    role_id: enumValue.employeeRoleId,
                    employee_status: { $ne: enumValue.archiveStatus },
                    verification_status: { $gte: enumValue.selfie },
                    weekly_holiday: { $in: [today] },
                    $or: [{ "is_punch_in_punch_out": null },
                    {
                        "is_punch_in_punch_out": { $eq: true },
                    }],
                }
            }
        ];

        printLogger(2, `setWeeklyOff_Model aggregateQuery- ${aggregateQuery}`, 'scheduler');

        db.collection('companies').aggregate(aggregateQuery).toArray((error, result) => {
            if (error) {

                printLogger(0, `setWeeklyOff_Model error- ${error}`, 'scheduler');
                reject(error);
            }
            else {

                printLogger(2, `setWeeklyOff_Model result- ${result}`, 'scheduler');
                resolve(result);
            }
        })
    })
};



// schedulerSchema list for scheduler
schedulerSchema.statics.setHoliday = () => {
    return new Promise((resolve, reject) => {

        printLogger(2, ` *****************  MODEL:- setHoliday  ******************* `, 'scheduler');

        let query = {};

        let date = moment().utc().format('YYYY-MM-DD');
        let today = new Date(date + "T00:00:00.000Z");

        query.holidays = {
            $all: [
                { "$elemMatch": { date: { $eq: today } } }
            ]
        }

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
                $addFields: { "company_id": { "$toString": "$company_id" } }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "company_id",
                    foreignField: "company_id",
                    as: "User"
                }
            },
            { $unwind: "$User" },
            {
                $project: {
                    company_id: "$company_id",
                    year: 1,
                    holidays: 1,
                    role_id: "$User.role_id",
                    _id: "$User._id",
                    verification_status: "$User.verification_status",
                    first_name: "$User.first_name",
                    middle_name: "$User.middle_name",
                    last_name: "$User.last_name",
                    employee_id: "$User.employee_id",
                    work_shift_id: "$User.work_shift_id",
                    company_name: "$Company.company_name",
                    net_salary: "$User.net_salary",
                    employee_status: "$User.status",
                    is_punch_in_punch_out: "$User.is_punch_in_punch_out"
                }
            },
            {
                $match: {
                    role_id: enumValue.employeeRoleId,
                    employee_status: { $ne: enumValue.archiveStatus },
                    verification_status: { $gte: enumValue.selfie },
                    $or: [{ "is_punch_in_punch_out": null },
                    {
                        "is_punch_in_punch_out": { $eq: true },
                    }],
                }
            },
        ]


        printLogger(2, `setHoliday_Model aggregateQuery- ${aggregateQuery}`, 'scheduler');

        db.collection("holidays").aggregate(aggregateQuery)
            .toArray((error, result) => {
                if (error) {

                    printLogger(0, `setHoliday_Model error- ${error}`, 'scheduler');
                    reject(error);
                }
                else {

                    printLogger(2, `setHoliday_Model result- ${result}`, 'scheduler');
                    resolve(result);
                }
            })
    })
};




// Set employee credit limit if employer month setting is day wise
schedulerSchema.statics.setEmployeesCreditLimit = (employee_id, rupyo_credit_limit) => {
    return new Promise((resolve, reject) => {

        printLogger(2, ` *****************  MODEL:- setEmployeesCreditLimit  ******************* `, 'scheduler');

        let query = { "_id": ObjectId(employee_id) };

        let updateData = {
            $set: {
                "credit_limit_type": enumValue.percentBaseType,
                "rupyo_credit_limit": rupyo_credit_limit
            }
        }

        printLogger(2, `setEmployeesCreditLimit_Model query:- ${query} || updateData:- ${updateData}`, 'scheduler');

        db.collection('users').updateOne(query, updateData, (error, result) => {
            if (error) {

                printLogger(0, `setEmployeesCreditLimit_Model error- ${error}`, 'scheduler');
                reject(error)
            }
            else {

                printLogger(2, `setEmployeesCreditLimit_Model result- ${result}`, 'scheduler');
                resolve(result.result);
            }
        })
    })
};


// Module exports
module.exports = mongoose.model('scheduler', schedulerSchema);