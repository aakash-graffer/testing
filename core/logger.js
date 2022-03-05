const { createLogger, transports, format } = require('winston');

module.exports.logger = createLogger({
    transports: [

        // 0
        new transports.File({
            level: 'error',
            filename: 'log_files/default/error.log',
            json: true,
            format: format.combine(format.timestamp(), format.json())
        }),

        // 1
        new transports.File({
            level: 'warn',
            filename: 'log_files/default/warn.log',
            json: true,
            format: format.combine(format.timestamp(), format.json())
        }),

        // 2
        new transports.File({
            level: 'info',
            filename: 'log_files/default/info.log',
            json: true,
            format: format.combine(format.timestamp(), format.json())
        }),

        // 4
        new transports.File({
            level: 'debug',
            filename: 'log_files/default/debug.log',
            json: true,
            format: format.combine(format.timestamp(), format.json())
        })
    ]
});