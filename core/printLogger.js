const {logger} = require('./logger');

exports.printLogger = function(type, message){

    switch(type){

        case 0:
            logger.error(message);
            break;

        case 1:
            logger.warn(message);
            break;

        case 2:
            logger.info(message);
            break;

        case 4:
            logger.debug(message);
            break;
    }

}