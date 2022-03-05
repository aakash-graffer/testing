// Response format
const ResponseFormat = {
    /**
     * 
     * @param {*} res = response,
     * @param {*} code = http response code,
     * @param {*} isSuccess = true/false (Boolean value),
     * @param {*} message = Api message,
     * @param {*} result = error/ result
     */
    response: (res, code, isSuccess, message, result) => {
        return res.status(code).json({
            success: isSuccess,
            message: message,
            data: result
        })
    },
};

module.exports = ResponseFormat;