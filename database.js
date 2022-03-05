
// Init code
const mongoose = require('mongoose');
const { printLogger } = require('./core/printLogger');
const secureEnv = require('secure-env');
const envSecret = require('./core/envSecret');
global.env = secureEnv(envSecret);

//const db_url = global.env.DB_URL;
const db_url = "mongodb://localhost:27017/test_rupyodb";


// Connection code
mongoose.connect(db_url,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false
    })
    .then((link) => {

        console.log("DB connected")
        printLogger(2, "Database connected.");
    })
    .catch(() => {

        console.log("DB not connected")
        printLogger(0, "Database not connected.");
    })

const db = mongoose.connection;
module.exports = db;