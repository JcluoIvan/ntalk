import log4js from 'log4js';
import path from 'path';
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
        default: { appenders: ['everything', 'out'], level: 'all' },
    },
});
export const log = log4js.getLogger();
//# sourceMappingURL=logger.js.map