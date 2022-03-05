const mongoose = require('mongoose');

// Schema
const globalSettingSchema = mongoose.Schema({

    company_id: {
        type: String,
        required: true,
        unique: true
    },

    rupyo_company_code: {
        type: String,
        required: true,
        unique: true
    },

    employee_id_number: {
        type: Number,
        required: true,
        default: 10000000
    }
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });


// Save global setting data
globalSettingSchema.statics.saveSetting = (settingData) => {
    return new Promise((resolve, reject) => {

        let GlobalSetting = mongoose.model('global_setting', globalSettingSchema);

        let globalSetting = GlobalSetting(settingData);
        globalSetting.save((error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};



// Get global setting data
globalSettingSchema.statics.getSetting = (settingData) => {
    return new Promise((resolve, reject) => {

        let query = { company_id: settingData.company_id };

        let GlobalSetting = mongoose.model('global_setting', globalSettingSchema);

        GlobalSetting.findOne(query, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};


// Update global setting data
globalSettingSchema.statics.updateSetting = (settingData) => {
    return new Promise((resolve, reject) => {

        let query = { company_id: settingData.company_id };

        let updateData = {
            $set: {
                employee_id_number: settingData.employee_id_number
            }
        }

        let GlobalSetting = mongoose.model('global_setting', globalSettingSchema);

        GlobalSetting.updateOne(query, updateData, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
    })
};



// Module exports
module.exports = mongoose.model('global_setting', globalSettingSchema);