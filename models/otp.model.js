const mongoose = require("mongoose");

const otpSchema = mongoose.Schema({
    mobile_number: {
        type: Number,
        required: true
    },
    user_id: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    date_time: {
        type: Date,
        default: Date.now()
    }
});


// Generate otp 6 digit and resend otp employee
otpSchema.statics.employeeOtpGenerate = (otpData) => {
    return new Promise((resolve, reject) => {

        // Otp Object
        let Otp = mongoose.model('otps', otpSchema);

        let otp = new Otp(otpData);

        otp.save((error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })
};



// Delete already exist otp
otpSchema.statics.employeeOtpDelete = (resultData) => {
    return new Promise((resolve, reject) => {

        // Convert to string
        let query = {
            mobile_number: resultData.mobile_number
        };


        // Otp Object
        let otpModel = mongoose.model('otps', otpSchema);

        // Delete  the otp 
        otpModel.findOneAndDelete(query, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })
};



// Delete rupyo admin already exist otp by admin id
otpSchema.statics.deleteOtp = (resultData) => {
    return new Promise((resolve, reject) => {

        // Convert to string
        let query = {
            user_id: resultData.user_id
        };


        // Otp Object
        let otpModel = mongoose.model('otps', otpSchema);

        // Delete  the otp 
        otpModel.findOneAndDelete(query, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })
    })
};



// Verify otp employee
otpSchema.statics.otpVerify = (reqBody) => {
    return new Promise((resolve, reject) => {


        let query;
        if (reqBody.mobile_number) {

            query = {
                "mobile_number": parseInt(reqBody.mobile_number),
                "otp": reqBody.otp
            };
        }
        else {
            query = {
                "user_id": reqBody.user_id,
                "otp": reqBody.otp
            };
        }


        // Otp Object
        let otpModel = mongoose.model('otps', otpSchema);

        otpModel.findOne(query, (error, result) => {
            if (error) {

                reject(error);
            }
            else {

                resolve(result);
            }
        })
    });
};



// Module exports
module.exports = mongoose.model('otps', otpSchema);