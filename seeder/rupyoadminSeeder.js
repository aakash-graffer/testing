
// Rupyo admin seed file for 2 admins.

//  Init code
const bcryptjs = require('bcryptjs');

const rupyoAdmin = require('../models/user.model');
const { rupyoAdminLogger } = require('../core/rupyoAdminLogger');

// Password hash
const hashedPassword = bcryptjs.hashSync('12345678', 10);

// Rupyo admin data
let rupyoadmin = [

    // Super admin
    new rupyoAdmin({
        role_id: 4,
        employee_sys_id: "null_1",
        first_name: "Shivin",
        last_name: "Khanna",
        email: "founders@rupyo.in",
        mobile_number: "9009632145",
        status: 1,
        password: hashedPassword,
        have_payout_approve_access: true,
        have_payout_credit_access: true
    }),

    // new rupyoAdmin({
    //     role_id: 1,
    //     employee_sys_id: "null_1",
    //     first_name: "Rupyo",
    //     last_name: "Admin",
    //     email: "admin@rupyo.in",
    //     mobile_number: "9000000123",
    //     status: 1,
    //     password: hashedPassword,
    //     have_payout_approve_access: false,
    //     have_payout_credit_access: false
    // }),

    new rupyoAdmin({
        role_id: 1,
        employee_sys_id: "null_2",
        first_name: "Rupyo",
        last_name: "Support",
        email: "support@rupyo.in",
        mobile_number: "9000000124",
        status: 1,
        password: hashedPassword,
        have_payout_approve_access: true,
        have_payout_credit_access: true
    })
];

let done = 0;

for (let i = 0; i < rupyoadmin.length; i++) {

    // Save rupyo admin data
    rupyoadmin[i].save(function (error, result) {
        done++;
        if (error) {
            console.log("Error:- ", error);
            rupyoAdminLogger.error("Seeder_error:- ", error);
        }
        else {

            console.log("Result:- ", result);
            rupyoAdminLogger.info("Seeder_result:- ", result);
        }

        // If rupyoadmin length is done
        if (done === rupyoadmin.length) {
            exit();
        }
    })
}

function exit() {
    console.log("Rupyo admin seeder run.");
    rupyoAdminLogger.info("Rupyo admin seeder run.");
}