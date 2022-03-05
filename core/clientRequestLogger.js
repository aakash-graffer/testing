const { createLogger, transports, format} = require('winston');

module.exports.clientRequestLogger = createLogger({
    transports: [
        
        // 4
        new transports.File({
            level: 'debug',
            filename: 'log_files/client_request/debug.log',
            json: true,
            format: format.combine(format.timestamp(), format.json())
        })
    ]
});