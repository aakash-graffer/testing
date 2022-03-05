"use strict";

// Init code
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const path = require('path');

const toobusy = require('toobusy-js');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const fs = require('fs');
const secureEnv = require('secure-env');
const envSecret = require('./core/envSecret');
global.env = secureEnv(envSecret);
const swaggerUI = require('swagger-ui-express');
const swaggerDocument = require('./swagger_json/rupyo.swagger.json');

const database = require('./database');
const { printLogger } = require('./core/utility');
const { sendEmail } = require('./core/commonFunctions');

const enquiriesRouter = require('./routes/enquiries.routes');
const userRouter = require('./routes/user.routes');
const employerRouter = require('./routes/employer.routes');
const employeesRouter = require('./routes/employees.routes');
const workshiftRouter = require('./routes/workshift.routes');
const attendanceRouter = require('./routes/attendance.routes');
const monthlyattendanceRouter = require('./routes/monthlyAttendance.routes');
const notificationsRouter = require('./routes/notifications.routes');
const requestRouter = require('./routes/request.routes');
const transactionRouter = require('./routes/transaction.routes');
const payrollRouter = require('./routes/payroll.routes');
const settlementRouter = require('./routes/settlement.routes');
const reportRouter = require('./routes/report.routes');
const ledgerRouter = require('./routes/ledger.routes');
const schedulerRouter = require('./routes/scheduler.routes');
const serviceRouter = require('./routes/service.routes');
const csvDownloadRouter = require('./routes/csvDownload.routes');
const holidayRouter = require('./routes/holiday.routes');


const app = express();
app.use(express.text());


// Middleware
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan(global.env.ENVIRONMENT_VARIABLE));

/* CORS is a node.js package for providing a Connect/Express
middleware that can be used to enable CORS */
app.use(cors());

/*
Helmet can help protect our app from some well-known web vulnerabilities by setting HTTP headers appropriately.
Helmet is actually just a collection of smaller middleware functions that set security-related HTTP response headers.

Reference:- https://www.npmjs.com/package/helmet */
app.use(helmet());


/*
Http parameter pollution

Reference:- https://www.npmjs.com/package/hpp */
app.use(hpp());


/**
* If server is toobusy
*
* The default maxLag value is 70ms, and the default check interval is 500ms.
* This allows an "average" server to run at 90-100% CPU and keeps request latency at around 200ms.
*/
app.use(function (req, res, next) {

  // The toobusy-js module allows you to monitor the event loop.
  // This module can indicate your server is too busy.
  if (toobusy()) {
    res.status(503).send("Server too busy");
  }
  else {
    next();
  }
});


// Request size limit
app.use(express.urlencoded({ extended: true, limit: global.env.URL_ENCODING_LIMIT }));
app.use(express.json({ limit: global.env.URL_ENCODING_LIMIT }));


// Rate limit (brute-forcing attacks)
app.use(rateLimit({

  windowsMS: global.env.RATE_LIMIT_WINDOWS_MS,

  // Limit each IP
  max: global.env.RATE_LIMIT_MAX
}));



app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', global.env.ALLOW_ORIGIN);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Contect-Type'),
    next()
});


// Api documentation
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));

// Api Routes
app.use('/attendance', attendanceRouter);
app.use('/csv_download', csvDownloadRouter);
app.use('/employees', employeesRouter);
app.use('/employers', employerRouter);
app.use('/enquiries', enquiriesRouter);
app.use('/holiday', holidayRouter);
app.use('/ledger', ledgerRouter);
app.use('/monthlyattendance', monthlyattendanceRouter);
app.use('/notifications', notificationsRouter);
app.use('/payrolls', payrollRouter);
app.use('/reports', reportRouter);
app.use('/requests', requestRouter);
app.use('/scheduler', schedulerRouter);
app.use('/service', serviceRouter);
app.use('/settlements', settlementRouter);
app.use('/transactions', transactionRouter);
app.use('/users', userRouter);
app.use('/workshifts', workshiftRouter);


// Handle Undefined Routes
app.use(async (req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Welcome to Rupyo, URL not found.",
    data: null
  })
})


// Global Error Handler Middleware
app.use((error, req, res, next) => {

  const statusCode = error?.statusCode ?? 500;
  const errMessage = error?.message ?? 'An Error Occured!';

  printLogger(0, `Global Error Handler [${req.originalUrl}] :- ${error}`, '');
  sendEmail('pmandloi@flair-solution.com', 'pmandloi@flair-solution.com', `<div>[${req.originalUrl}] :-${error}</div>`, "Some Error in Rupyo");

  return res.status(statusCode).json({
    success: false,
    message: error.data?.msg || errMessage,
    data: error.data || null
  })
})



// Module exports
module.exports = app