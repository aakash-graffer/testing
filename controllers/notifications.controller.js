// Init code
const { validationResult } = require('express-validator');

const { response } = require('../core/responseformat');
const { message, enumValue, errData } = require('../core/utility');
const { printLogger } = require('../core/printLogger');
const notificationsModel = require('../models/notifications.model');
const tokenMethod = require("../core/getOpenIdToken");


// Create notifications
exports.createNotification = async (req, res, next) => {
    try {
        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {
            printLogger(0, errors.array(), 'notification');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let notificationData = [];
            let reqBody = req.body;
            reqBody.created_by = req.userData._id;
            notificationData.push(reqBody);

            // Save notifications
            let result = await notificationsModel.bulkInsert(notificationData)

            if (result === null || result === undefined) {

                // let dataResult = [{
                //     "value": '',
                //     "msg": message.noInsertSuccessfully('Notification'),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'notification');
                // return response(res, 200, false, message.noInsertSuccessfully('Notification'), dataResult);
                throw errData(200, message.noInsertSuccessfully('Notification'), null);
            }
            else {

                printLogger(2, result, 'notification');
                return response(res, 200, true, message.insertSuccessfully('Notification data'), { "_id": result._id });
            }
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'notification');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Save notifications
exports.saveNotification = async (notificationsData) => {
    try {
        let _notificationData = [];

        _notificationData.push(notificationsData)

        // Save notifications
        let result = await notificationsModel.bulkInsert(_notificationData)

        printLogger(2, result, 'notification');
        return result;

    }
    catch (error) {

        printLogger(0, error, 'notification');
    }
};


// Not in use Update notifications
exports.updateNotification = async (req, res, next) => {
    try {
        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array(), 'notification');
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            let data = req.body;

            let result = await notificationsModel.updateNotification(data, req.userData)
            if (result === null || result === undefined) {

                // let dataResult = [{
                //     "value": '',
                //     "msg": message.unableToUpdate('Notifiaction details'),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'notification');
                // return response(res, 200, false, message.unableToUpdate('Notifiaction details'), dataResult);
                throw errData(200, message.unableToUpdate('Notification details'), null);
            }
            else {

                printLogger(2, result, 'notification');
                return response(res, 200, true, message.updateSuccessfully('Notifiaction details'), { user_id: result.user_id });
            }
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'notification');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Update notifications status
exports.updateStatus = async (req, res, next) => {
    try {
        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array());
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            const data = req.body;

            let result = await notificationsModel.updateStatus(data, req.userData)
            if (result === null || result === undefined) {

                // let dataResult = [{
                //     "value": '',
                //     "msg": message.unableToUpdate('Notifiaction details'),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'notification');
                // return response(res, 200, false, message.unableToUpdate('Notifiaction details'), dataResult);
                throw errData(200, message.unableToUpdate('Notification details'), null);
            }
            else {

                printLogger(1, result, 'notification');
                return response(res, 200, true, message.updateSuccessfully('Notifiaction details'), { user_id: result.user_id });
            }
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'notification');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Get notifications count
exports.getNotificationsCount = async (req, res, next) => {
    try {

        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array());
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let checkData = {
                "company_id": req.userData.company_id,
                "for_notifications": req.userData.role_id === enumValue.superAdminRoleId ? enumValue.rupyoAdminRoleId : req.userData.role_id
            };

            let result = await notificationsModel.unreadNotificationCount(checkData);

            if (result === null || result === undefined) {

                result = 0;
            }

            printLogger(1, result, 'notification');
            return response(res, 200, true, message.dataFound(),
                { "unread_notifications_count": result }
            );
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'notification');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Notifications for employee (with filter)
exports.employeeFilterNotification = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        let reqQuery = req.query;

        let reqFilter = {
            "user_id": req.userData._id,
            "year": parseInt(reqQuery.year),
            "notification_type": parseInt(reqQuery.notification_type),
            "current_page": parseInt(reqQuery.current_page)
        };

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array());
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {
            // if (req.userData.role_id !== enumValue.employeeRoleId) {

            //     let dataResult = [{
            //         "value": '',
            //         "msg": message.notAuthorizeAcess(),
            //         "param": "",
            //         "location": ""
            //     }]
            //     printLogger(0, dataResult, 'notification');
            //     return response(res, 403, false, message.notAuthorizeAcess(), dataResult);
            // }
            // else {

            let result = await notificationsModel.employeeFilterNotification(reqFilter)

            if (result[0] === undefined) {

                // let dataResult = [{
                //     "value": '',
                //     "msg": message.noDataFound(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'notification');
                // return response(res, 200, false, message.noDataFound(), dataResult);
                throw errData(200, message.noDataFound(), null);
            }
            else {

                for (i = 0; i < result.length; i++) {

                    if (!result[i].attachment) {

                        result[i].attachment = "";
                    }
                }
                printLogger(2, result, 'notification');
                return response(res, 200, true, message.dataFound(), result);
            }
            //}
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'notification');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Notifications for rupyo admin and employer (with filter)
exports.filterList = async (req, res, next) => {
    try {

        let reqBody = req.body;
        let companyId = req.userData.role_id === enumValue.employerRoleId ? req.userData.company_id : req.userData.role_id === enumValue.rupyoAdminRoleId ? reqBody.company_id : req.userData.company_id;
        let roleId = req.userData.role_id === enumValue.employerRoleId ? enumValue.employerRoleId : enumValue.rupyoAdminRoleId;

        const errors = validationResult(req);

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array());
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }

        // If role id check (employer and rupyo admin)
        else
        // if (roleId === enumValue.employerRoleId || roleId === enumValue.rupyoAdminRoleId) 
        {
            let notificationsResult = await notificationsModel.list(reqBody, roleId, companyId);

            if (notificationsResult.total.length > 0) {

                // let dataResult = [{
                //     "value": '',
                //     "msg": message.noDataFound(),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'notification');
                // return response(res, 200, false, message.noDataFound(), dataResult);
                throw errData(200, message.noDataFound(), null);
            }
            else {

                // User selfie
                for (i = 0; i < notificationsResult.result.length; i++) {

                    if (notificationsResult.result[i].selfie !== undefined && notificationsResult.result[i].selfie !== null) {

                        let selfieUrl = await tokenMethod.getCloudFrontURL(notificationsResult.result[i].selfie);
                        notificationsResult.result[i].selfie = selfieUrl;
                    }
                    else {
                        notificationsResult.result[i].selfie = "";
                    }
                }

                printLogger(2, notificationsResult, 'notification');
                return response(res, 200, true, message.dataFound(), notificationsResult);
            }

            // }

            // If role id check (rupyo admin)
            // else if (data.role_id === ) {

            //     let result = await notificationsModel.rupyoAdminFilterNotification(reqBody)
            //     if (result[0] === undefined) {
            //         let dataResult = [{
            //             "value": '',
            //             "msg": message.noDataFound(),
            //             "param": "",
            //             "location": ""
            //         }]

            //         printLogger(0, dataResult, 'notification');
            //         return response(res, 200, false, message.noDataFound(), dataResult);

            //     } else {
            //         printLogger(2, result, 'notification');
            //         return response(res, 200, true, message.dataFound(), result);
            //     }
        }
        // else {

        //     let dataResult = [{
        //         "value": '',
        //         "msg": message.notAuthorizeAcess(),
        //         "param": "",
        //         "location": ""
        //     }]
        //     printLogger(0, dataResult, 'notification');
        //     return response(res, 403, false, message.notAuthorizeAcess(), dataResult);
        // }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'notification');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};


// Read notifications mark
exports.readNotificationsMark = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        let reqBody = req.body;

        // If errors is empty
        if (errors.errors.length > 0) {

            printLogger(0, errors.array());
            // return response(res, 200, false, message.validationError(), errors.array());
            throw errData(200, message.validationError(), errors.array());
        }
        else {

            let data = {
                "notificationId": reqBody.id,
                "isRead": true,
                "userDataId": req.userData._id
            }

            let result = await notificationsModel.readNotificationsMark(data)
            if (result === null) {

                // let dataResult = [{
                //     "value": '',
                //     "msg": message.noInsertSuccessfully('Notifications'),
                //     "param": "",
                //     "location": ""
                // }]
                // printLogger(0, dataResult, 'notification');
                // return response(res, 200, false, message.noInsertSuccessfully('Notifications'), dataResult);
                throw errData(200, message.noInsertSuccessfully('Notifications'), null);
            }
            else {

                let companyId = req.userData.company_id ? req.userData.company_id : '';
                let forNotifications = req.userData.role_id == enumValue.rupyoAdminRoleId ? enumValue.rupyoAdminRoleId : req.userData.role_id == enumValue.employerRoleId ? enumValue.employerRoleId : enumValue.employeeRoleId;
                let checkData = { "company_id": companyId, "for_notifications": forNotifications };


                // NOTIFICATION MODEL -> UNREAD NOTIFICATION COUNTS
                let unreadNotificationCount = await notificationsModel.unreadNotificationCount(checkData);

                printLogger(2, result, 'notification');
                return response(res, 200, true, message.readSuccessfully('Notifications'), {
                    "unread_notifications_count": unreadNotificationCount
                });
            }
        }
    }
    catch (error) {

        // let dataResult = [{
        //     "value": '',
        //     "msg": message.error(error),
        //     "param": "",
        //     "location": ""
        // }]
        printLogger(0, error, 'notification');
        // return response(res, 500, false, message.error(error), dataResult) 
        next(error)
    }
};