// Init code
const mongoose = require('mongoose');
const moment = require('moment');

const db = require('../database');
const { enumValue } = require('../core/utility');

// csvDownload schema
const csvSchema = mongoose.Schema({});


// Rupyo admin csv download
csvSchema.statics.rupyoAdminCsv = (reqBody) => {
    return new Promise((resolve, reject) => {

        let query = {};

        // Searching by first name, last name, email
        if (reqBody.search_name) {
            query = {
                $and: [{ "role_id": enumValue.rupyoAdminRoleId }, { status: { $ne: enumValue.archiveStatus } },
                { "email": { $ne: "admin@rupyo.in" } },
                { "email": { $ne: "support@rupyo.in" } },
                {
                    $or: [
                        { "first_name": { $regex: `^${reqBody.search_name}`, $options: "i" } },
                        { "middle_name": { $regex: `^${reqBody.search_name}`, $options: "i" } },
                        { "last_name": { $regex: `^${reqBody.search_name}`, $options: "i" } }
                    ]
                }
                ]
            }
        }
        else {
            query = {
                $and: [{ "role_id": enumValue.rupyoAdminRoleId }, { status: { $ne: enumValue.archiveStatus } },
                { "email": { $ne: "admin@rupyo.in" } },
                { "email": { $ne: "support@rupyo.in" } },
                ]
            }
        }

        // Projection key : 0 (not show) or 1 (show)
        let projection = { '__v': 0, 'created_at': 0, 'role_id': 0, 'updated_at': 0, 'created_by': 0, 'updated_by': 0, 'password': 0 };

        // Find the list 
        db.collection("users").find(query).project(projection)
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


// Employers csv file download
csvSchema.statics.employerCsv = (reqBody) => {
    return new Promise((resolve, reject) => {

        let matchQuery = {};

        // Searching by first name, company name rupyo company code
        if (reqBody.search_name) {

            matchQuery = {
                $or: [
                    { "rupyo_company_code": { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { "company_name": { $regex: `^${reqBody.search_name}`, $options: "i" } }
                ]
            }
        }

        matchQuery.role_id = { $eq: enumValue.employerRoleId };
        matchQuery.status = { $ne: enumValue.archiveStatus };


        // Employer list filter by status
        if (reqBody.status_filter) {

            // Status_filter has 0 return all values
            if (reqBody.status_filter == 0) {
                matchQuery.status = { $ne: enumValue.archiveStatus };
            }
            else {
                matchQuery.status = { $eq: parseInt(reqBody.status_filter) };
            }
        }

        // Query for count document
        let countQuery = [
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
                    "role_id": 1,
                    "first_name": 1,
                    "middle_name": 1,
                    "last_name": 1,
                    "email": 1,
                    "mobile_number": 1,
                    "employer_status": "$status",
                    "company_id": 1,
                    "company_name": "$Company.company_name",
                    "status": "$Company.status",
                    "company_logo": "$Company.company_logo",
                    "rupyo_company_code": "$Company.rupyo_company_code",
                    "rupyo_credit_limit": "$Company.rupyo_credit_limit",
                    "company_size": "$Company.company_size",
                    "employee_id_generation_method": "$Company.employee_id_generation_method",
                    "set_payout_limit": "$Company.set_payout_limit",
                    "address": "$Company.address",
                    "weekly_holiday": "$Company.weekly_holiday"
                }
            },
            { $match: matchQuery }
        ]

        db.collection('users').aggregate(countQuery).toArray((error, result) => {
            if (error) {
                reject(error);
            }
            else {

                resolve(result);
            }
        })

    })
};


// Employees csv file download
csvSchema.statics.employeeCsv = (reqBody, companyId) => {
    return new Promise((resolve, reject) => {

        /** Pagination and searching page size 20
    * let sort_by_column and order -1 or 1 
    * 1 (ascending order) and -1 (descending order);
    */
        let currentPage = reqBody.page ? parseInt(reqBody.page) : 1;
        let perPage = reqBody.page_size ? parseInt(reqBody.page_size) : 20;
        let skip = (currentPage - 1) * perPage;
        let sortBy = reqBody.sort_by === 'ascending' ? 1 : -1;
        let sortByColumn = reqBody.sort_by_column;
        let currentYear = parseInt(moment().utc().format('YYYY'));
        let currentMonth = parseInt(moment().utc().format('M'));
        let today = parseInt(moment().utc().format('D'));
        let lastDate = parseInt(moment().utc().endOf('month').format('D'));

        let query = {
            role_id: enumValue.employeeRoleId,
            status: { $ne: enumValue.archiveStatus }
        };

        // Searching by first name, middle name, last name 
        if (reqBody.search_name) {
            query = {
                $or: [
                    { first_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { middle_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { last_name: { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { mobile_number: { $regex: reqBody.search_name, $options: "[0-9]+/i" } }
                ]
            };
        }

        // Filter by status and employee type
        if (reqBody.status_filter || reqBody.employee_type || companyId) {

            if (reqBody.status_filter) {
                query.status = parseInt(reqBody.status_filter)
            }

            if (reqBody.employee_type) {
                query.employee_type = parseInt(reqBody.employee_type)
            }
            if (companyId) {
                query.company_id = companyId
            }
        }

        // Sorting
        let sortQuery = sorting(sortByColumn, sortBy);

        // console.log("query:- ", query);

        let matchQuery = [
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
            {
                $addFields: { "company_id": { "$toString": "$company_id" } }
            },
            {
                $project: {
                    "_id": 1,
                    "first_name": 1,
                    "middle_name": 1,
                    "last_name": 1,
                    "mobile_number": 1,
                    "company_name": "$Company.company_name",
                    "employee_sys_id": 1,
                    "employee_id": 1,
                    "role_id": 1,
                    "email": 1,
                    "status": 1,
                    "company_id": 1,
                    "work_shift_id": 1,
                    "employee_type": 1,
                    "rupyo_credit_limit": {
                        $cond: {
                            if: {
                                $eq: ["$credit_limit_type", 2]
                            },
                            then: { $toInt: { $divide: [{ $toInt: { $multiply: [{ $toInt: "$net_salary" }, { $toInt: "$credit_limit_percent" }] } }, 100] } },
                            else: "$rupyo_credit_limit"
                        }
                    },
                    "credit_limit_type": 1,
                    "credit_limit_percent": 1,
                    "net_salary": 1,
                    "net_deductions": 1,
                    "opening_balance": 1,
                    "net_pay_per_day": { $toInt: { $divide: [{ $toInt: "$net_salary" }, lastDate] } },
                    "selfie": 1,
                    "firebase_device_token": 1,
                    "pan_card": 1,
                    "basic_pay": 1,
                    "additional_pay": 1,
                    "bank_details": 1,
                    "address": 1,
                    "salary_cycle": 1,
                    "verification_status": 1,
                    "payout_till_now": "$payout_credited",
                    "present_total": "$presents_count",
                    "absent_total": "$absents_count",
                    "half_total": "$half_days_count",
                    "leave_total": "$leaves_count",
                    "amount_earned": "$earned_amount"
                }
            },
            {
                $match: query
            },
            { "$skip": skip }

        ]

        db.collection('users').aggregate(matchQuery).toArray((error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);

            }
        });

    });
};




// Transactions csv file download
csvSchema.statics.transactionsCsv = (reqFilter, companyId) => {
    return new Promise((resolve, reject) => {

        let year = parseInt(moment().utc().format('YYYY'));
        let month = parseInt(moment().utc().format('M'));

        let matchQuery = {};

        // Searching
        if (reqFilter.search_name) {
            matchQuery = {
                $or: [
                    { "first_name": { $regex: `^${reqFilter.search_name}`, $options: "i" } },
                    { "middle_name": { $regex: `^${reqFilter.search_name}`, $options: "i" } },
                    { "last_name": { $regex: `^${reqFilter.search_name}`, $options: "i" } },
                    { "company_name": { $regex: `^${reqFilter.search_name}`, $options: "i" } },
                    { "request_id": { $regex: `^${reqFilter.search_name}`, $options: "i" } }
                ]
            }
        }

        // Add current month of current year in match query
        matchQuery.monthlyTransactionYear = { $eq: year };
        matchQuery.monthlyTransactionMonth = { $eq: month };

        // Filter transaction list
        if (reqFilter.time_filter || companyId || reqFilter.user_id || reqFilter.status) {


            // Filter by company id
            if (companyId) {
                matchQuery.company_id = companyId;
            }

            // Filter by employee id
            if (reqFilter.user_id) {
                matchQuery.user_id = reqFilter.user_id;
            }

            // Filter by status
            if (reqFilter.status) {
                matchQuery.status = parseInt(reqFilter.status);
            }

            // Filter by time (This year = 5)
            if (parseInt(reqFilter.time_filter) === enumValue._thisYear) {

                // This year filter calling
                matchQuery.created_at = thisYear();
            }

            // Filter by time (Last year = 6)
            if (parseInt(reqFilter.time_filter) == enumValue._lastYear) {

                matchQuery.created_at = lastYear();
            }

            // Filter by time (This month = 3)
            if (parseInt(reqFilter.time_filter) === enumValue._thisMonth) {

                matchQuery.created_at = thisMonth();
            }

            // Filter by time (last month = 4)
            if (parseInt(reqFilter.time_filter) === enumValue._lastMonth) {

                matchQuery.created_at = lastMonth();
            }

            // Last three months (8)
            if (parseInt(reqFilter.time_filter) === enumValue._lastThreeMonths) {

                matchQuery.created_at = lastThreeMonth();
            }

            // Filter by time (today = 1)
            if (parseInt(reqFilter.time_filter) === enumValue.today) {

                matchQuery.created_at = toDay();
            }

            // Filter by time (this weak = 7) 
            if (parseInt(reqFilter.time_filter) === enumValue._thisWeek) {

                matchQuery.created_at = thisWeek();
            }
        }

        // Query for count document
        let countQuery = [
            {
                $addFields: {
                    "user_id": { "$toObjectId": "$user_id" }
                }
            },

            // Lookup transactions
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "User"

                }
            },
            { $unwind: "$User" },

            {
                $project: {
                    "_id": 1,
                    "first_name": 1,
                    "middle_name": 1,
                    "last_name": 1,
                    "company_id": 1,
                    "company_name": 1,
                    "amount": 1,
                    "user_id": 1,
                    "status": 1,
                    "request_id": 1,
                    "date_time": 1,
                    "created_at": 1,
                    "transaction_message": 1,
                    "transaction_charge": 1,
                    "imps_receipt_number": 1,
                    "employee_status": "$User.status",
                    "net_salary": { $toInt: "$User.net_salary" },
                    "credit_limit": "$User.rupyo_credit_limit",
                    "remaining_credit_limit": "$remaining_amount",
                }
            },
            {
                $match: matchQuery,
            }]

        // Actual query
        db.collection('users').aggregate(countQuery).toArray((error, result) => {
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
csvSchema.statics.attendanceCsv = (reqBody, companyId) => {
    return new Promise((resolve, reject) => {
        let query = {};

        // Searching
        if (reqBody.search_name) {

            // Search by employee name
            query = {
                $or: [
                    { "first_name": { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { "middle_name": { $regex: `^${reqBody.search_name}`, $options: "i" } },
                    { "last_name": { $regex: `^${reqBody.search_name}`, $options: "i" } }
                ]
            }
        }

        // Filter attendance list
        if (reqBody.days_filter || reqBody.start_date || companyId || reqBody.employee_id) {

            // Filter by month (This month)
            if (parseInt(reqBody.days_filter) === enumValue._thisMonth) {

                query.created_at = thisMonth();
            }

            // Filter by week (Last week)
            // Week start from sunday
            if (parseInt(reqBody.days_filter) === enumValue._lastWeek) {

                query.created_at = lastWeek();
            }

            // Filter by today            
            if (parseInt(reqBody.days_filter) === enumValue.today) {

                query.created_at = toDay();
            }

            // Filter by start and end date 
            if (reqBody.start_date) {

                query.created_at = dateFilter(reqBody.start_date);
            }

            // Filter by employee id
            if (reqBody.employee_id) {

                query.employee_id = { $eq: reqBody.employee_id }
            }

            // Filter by company id
            else if (companyId) {

                query.company_id = { $eq: companyId };
            }
        }

        db.collection("attendances")
            .aggregate([
                { $match: query },
                {
                    $project: {
                        "_id": "$_id",
                        "first_name": "$first_name",
                        "middle_name": "$middle_name",
                        "last_name": "$last_name",

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

// Module exports
module.exports = mongoose.model('csvDownload', csvSchema);