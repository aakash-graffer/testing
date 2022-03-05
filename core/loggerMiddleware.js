const util = require('util');
const { clientRequestLogger } = require('./clientRequestLogger');

let logReqData = (req, res, next) => {
    try {

        let printObj = ` REQ.HEADERS:- ${util.inspect(req.headers, { showHidden: false, depth: null })} 
    REQ.QUERY:- ${util.inspect(req.query, { showHidden: false, depth: null })}  
    REQ.BODY:-${util.inspect(req.body, { showHidden: false, depth: null })}`;


        clientRequestLogger.debug(`******************************  ${req.originalUrl}  ******************************************`);
        clientRequestLogger.debug(printObj);

        next();
    }
    catch {
        next();
    }
}

let logTokenData = (req, res, next) => {
    try {
        if (req.userData) {

            let userDataObj = `REQ.USERDATA:- ${util.inspect(req.userData, { showHidden: false, depth: null })}`;

            clientRequestLogger.debug(userDataObj);
        }

        next();
    }
    catch {
        next();
    }
}

module.exports = {
    logReqData,
    logTokenData
}