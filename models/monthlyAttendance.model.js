const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const { printLogger } = require('../core/printLogger');

const monthlyAttendanceSchema = mongoose.Schema({

    employee_id: {
        type: String,
        require: true
    },

    company_id: {
        type: String,
        require: true
    },

    year: {
        type: Number,
        require: true
    },

    month: {
        type: Number,
        require: true
    },

    presents: {
        type: Number,
        default: 0
    },

    absents: {
        type: Number,
        default: 0
    },

    leaves: {
        type: Number,
        default: 0
    },

    half_days: {
        type: Number,
        default: 0
    },

    missed_punch: {
        type: Number,
        default: 0
    },

    weekly_off: {
        type: Number,
        default: 0
    },

    paid_holiday: {
        type: Number,
        default: 0
    },

    unpaid_holiday: {
        type: Number,
        default: 0
    },

    late_in: {
        type: Number
    },

    early_out: {
        type: Number
    },

    days_worked: {
        type: Number,
        default: 0
    },

    deficit_hours: {
        hours: Number,
        minutes: Number
    },

    total_work_hours: {
        hours: Number,
        minutes: Number
    },

    average_work_hours: {
        hours: Number,
        minutes: Number
    },

    calendar: [
        {
            date: { type: Number },
            type: { type: Number }
        }
    ],

    created_by: String,
    updated_by: String
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });


// Find monthly attendance data by year and month
monthlyAttendanceSchema.statics.findMonthlyAttendanceByYearMonth = (data) => {
    return new Promise((resolve, reject) => {

        let query = { $and: [{ year: data.year }, { month: data.month }, { employee_id: data.employee_id }] };

        // Monthly attendance schema object
        let monthlyAttendance = mongoose.model('monthly_attendances', monthlyAttendanceSchema);

        monthlyAttendance.findOne(query, (error, result) => {
            if (error) {

                printLogger(0, error, 'attendance');
                reject(error);
            }
            else {

                printLogger(2, result, 'attendance');
                resolve(result);
            }
        })

    })
};


// Save monthly attendance data
monthlyAttendanceSchema.statics.createMonthlyAttendance = (data) => {
    return new Promise((resolve, reject) => {

        // Monthly attendance schema object
        let monthlyAttendance = mongoose.model('monthly_attendances', monthlyAttendanceSchema);

        // Save new monthly attendance data
        let monthlyData = monthlyAttendance(data);
        monthlyData.save((error, result) => {

            if (error) {
                printLogger(0, error, 'attendance');
                reject(error);
            }
            else {

                // Data saved
                printLogger(2, result, 'attendance');
                resolve(result);
            }
        })
    })
};


// find monthly attendance data by monthly attendance id
monthlyAttendanceSchema.statics.findMonthlyAttendanceByMonthlyAttendanceId = (data) => {
    return new Promise((resolve, reject) => {

        // Monthly attendance schema object
        let monthlyAttendance = mongoose.model('monthly_attendances', monthlyAttendanceSchema);

        monthlyAttendance.findOne({ _id: ObjectId(data.monthly_attendance_id) }, (error, result) => {
            if (error) {
                printLogger(0, error, 'attendance');
                reject(error);
            }
            else {
                printLogger(2, result, 'attendance');
                resolve(result);
            }
        })
    })
};


// Update monthly attendance data
monthlyAttendanceSchema.statics.updateMonthlyAttendance = (data) => {
    return new Promise((resolve, reject) => {

        // Monthly attendance schema object
        let monthlyAttendance = mongoose.model('monthly_attendances', monthlyAttendanceSchema);

        let query = { "_id": ObjectId(data.monthly_attendance_id) };
        let setData = {
            $set: {
                "presents": data.presents,
                "absents": data.absents,
                "half_days": data.half_days,
                "leaves": data.leaves,
                "missed_punch": data.missed_punch,
                "weekly_off": data.weekly_off,
                "paid_holiday": data.paid_holiday,
                "unpaid_holiday": data.unpaid_holiday,
                "late_in": data.late_in,
                "early_out": data.early_out,
                "days_worked": data.days_worked,
                "deficit_hours": {
                    "hours": data.deficit_hours.hours,
                    "minutes": data.deficit_hours.minutes
                },
                "total_work_hours": {
                    "hours": data.total_work_hours.hours,
                    "minutes": data.total_work_hours.minutes
                },
                "average_work_hours": {
                    "hours": data.average_work_hours.hours,
                    "minutes": data.average_work_hours.minutes
                },
                "calendar": data.calendar
            }
        }

        /* Update monthly attendance data */
        monthlyAttendance.findOneAndUpdate(query, setData, (error, result) => {
            if (error) {
                printLogger(0, `Monthly attendance update error: ${error}`, 'attendance');
                reject(error);
            }
            else {
                printLogger(2, `Monthly attendance successfully updated: ${result}`, 'attendance');
                resolve(result);
            }
        })

    })
};


// Show monthly attendance (Mobile)
monthlyAttendanceSchema.statics.showMonthlyAttendance = (reqFilter) => {
    return new Promise((resolve, reject) => {

        // Monthly attendance object
        let monthlyAttendanceObject = mongoose.model('monthly_attendances', monthlyAttendanceSchema);

        let query = { $and: [{ employee_id: reqFilter.employee_id }, { year: reqFilter.year }, { month: reqFilter.month }] };
        let projection = { "calendar._id": 0 };

        // Find monthly attendance data by year and month
        monthlyAttendanceObject.findOne(query, projection, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })

    })
};


// Modele Exports
module.exports = mongoose.model('monthly_attendances', monthlyAttendanceSchema);