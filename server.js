const app = require('./app');
const { printLogger } = require('./core/utility');
const { autoSaveAdminAccount } = require('./controllers/user.controller');
const port = global.env.PORT;


app.listen(port, () => {

    console.log(`app listening at http://localhost:${port}`);
    printLogger(2, `app listening at http://localhost:${port}`);

    // Auto save admin account
    autoSaveAdminAccount();
})