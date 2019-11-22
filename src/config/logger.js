const log4js = require('log4js');
const path = require('path');
const logPath = path.resolve(__dirname, '../../logs');

log4js.configure({
    appenders: {
        everything: {
            type: 'file',
            filename: path.join(logPath, 'server.log'),
            layout: {
                type: 'pattern',
                pattern: '[%d] %p - %m',
            },
        },
        out: {
            type: 'console',
            layout: {
                type: 'pattern',
                pattern: '%[[%d]%] %p - %m',
            },
        },
    },
    categories: {
        default: { appenders: ['everything', 'out'], level: log4js.levels.ALL },
    },
    // appenders: {
    //     type: 'log',
    //     level: log4js.levels.WARN,
    //     category: 'app',
    //     appender: [
    //         {
    //             type: 'file',
    //             filename: path.join(logPath, 'server.log'),
    //             layout: {
    //                 type: 'pattern',
    //                 pattern: '%[[%d]%] %m',
    //             },
    //         },
    //         {
    //             type: 'console',
    //             layout: {
    //                 type: 'pattern',
    //                 pattern: '%[[%d]%] %m',
    //             },
    //         },
    //     ],
    // },
});

module.exports = log4js.getLogger();
