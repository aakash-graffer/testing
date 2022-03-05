const { validationResult } = require('express-validator');
let AWS = require('aws-sdk');

const { response } = require('../core/responseformat');
const { message, enumValue, errData } = require('../core/utility');
const tokenMethod = require("../core/getOpenIdToken");
const { printLogger } = require('../core/printLogger');
const moment = require('moment');
const { sendEmail } = require('../core/commonFunctions');

// Send SMS
exports.send_SMS = async (req, res, next) => {
    try {
        // Import required AWS SDK clients and commands for Node.js

        const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
        // Set the AWS Region
        const REGION = "ap-south-1"; // "us-east-2" //e.g. "us-east-1"

        // Set the parameters
        const params = {
            Message: "Hi Nik", // required /,
            PhoneNumber: "+918827090001", //PHONE_NUMBER, in the E.164 phone number structure
        };

        // Create SNS service object
        const sns = new SNSClient({ region: REGION });

        const run = async () => {
            try {
                const data = await sns.send(new PublishCommand(params));
                let dataResult = [{
                    "value": "",
                    "msg": data.MessageId,
                    "param": "",
                    "location": ""
                }]
                // console.log("Success, message published. MessageID is " + data.MessageId);
                return response(res, 200, true, "Sms sent", dataResult)
            }
            catch (err) {

                let dataResult = [{
                    "value": err.stack,
                    "msg": err,
                    "param": "",
                    "location": ""
                }]
                // console.error(err, err.stack);
                // return response(res, 200, false, "catch SMS failed.", dataResult)
                throw errData(200, "Catch SMS failed", dataResult);
            }
        };
        run();
        //return response(res, 200, false, "SMS failed.", '')
    }
    catch (error) {

        printLogger(0, error, '');
        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        // return response(res, 500, false, message.error(error), dataResult)
        next(error)
    }
};


// AWS S3 temp token
exports.authenticateAppForFiles = async (req, res, next) => {
    try {

        let awsResult = await tokenMethod.getOpenIdToken(req);

        if (awsResult !== 0 || awsResult !== undefined) {

            let result = {
                user_id: req.userData._id,
                aws: awsResult
            }

            printLogger(2, `authenticateAppForFiles-if - ${awsResult}`, 'rupyo_admin');
            return response(res, 200, true, message.dataFound(), result);
        }
        else {

            // return response(res, 200, false, message.noDataFound(), awsResult);
            throw errData(200, message.noDataFound(), null);
        }
    }
    catch (error) {

        printLogger(0, error, 'rupyo_admin');
        // let dataResult = [{
        //     "value": "",
        //     "msg": "error",
        //     "param": "",
        //     "location": ""
        // }]
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};



exports.cloudfrontUrl = async (req, res, next) => {
    try {

        // Generating a signed URL
        let signedUrl = await tokenMethod.getCloudFrontURL(req.query.key);

        return response(res, 200, true, "URL", signedUrl)
    }
    catch (error) {

        printLogger(0, error, '');
        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Send Email
exports.send_Email = async (req, res, next) => {
    try {

        // Load the AWS SDK for Node.js
        let responce = await sendEmail('njhawar@flair-solution.com', 'njhawar@flair-solution.com', "<div>Text HTML</div>", "ForgetPWD");
        let responce1 = await sendEmail('mrehmani@flair-solution.com', 'mrehmani@flair-solution.com', "<div>Test Rupyo Email Service</div>", "Email testing");

        if (responce === 0) {

            let dataResult = [{
                "value": responce,
                "msg": responce,
                "param": "",
                "location": ""
            }]
            // return response(res, 200, false, "catch SMS failed.", dataResult);
            throw errData(200, "Catch SMS failed", dataResult);
        }
        else {
            return response(res, 200, true, message.otpSendSuccessfully('Otp'), responce);
        }
    }
    catch (error) {

        printLogger(0, error, '');
        // let dataResult = [{
        //     "value": "",
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};