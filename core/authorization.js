
const { message } = require('./utility');

module.exports = (roles) => {

    return (req, res, next) => {

        const roleId = req.userData.role_id;
        if (roles.includes(roleId)) {
            next();
        }
        else {
            res.status(403).json({
                success: false,
                message: message.unauthorizedUser(),
                data: ""
            })
        }
    }
};