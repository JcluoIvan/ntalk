"use strict";
exports.__esModule = true;
var log4js_1 = require("log4js");
var path_1 = require("path");
var logPath = path_1["default"].resolve(__dirname, '../../logs');
log4js_1["default"].configure({
    appenders: {
        everything: {
            type: 'file',
            filename: path_1["default"].join(logPath, 'server.log'),
            layout: {
                type: 'pattern',
                pattern: '[%d] %p - %m'
            }
        },
        out: {
            type: 'console',
            layout: {
                type: 'pattern',
                pattern: '%[[%d]%] %p - %m'
            }
        }
    },
    categories: {
        "default": { appenders: ['everything', 'out'], level: 'all' }
    }
});
exports.log = log4js_1["default"].getLogger();
