const jwt = require('jsonwebtoken');
const jwt_secret = global.env.JWT_SECRET;

/**
 * req = request
 * res = response
 * next = next method
 */

module.exports = (req, res, next)=>{
    try{

        // Get token from req.headers.authorization
        let token = req.headers.authorization.split(" ")[1];
        
        // Verify token
        let decode = jwt.verify(token, jwt_secret);

        // Token pass in req.userData
        req.userData = decode;
        next();
    }
    catch(error){
        res.status(401).json({
            success: false,
            message: "Authentication Failed.",
            data: error
        })
    }
};