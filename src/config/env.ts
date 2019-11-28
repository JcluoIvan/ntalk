require('dotenv').config();
export default {
    /**
     * dev = 開發, prod = 正式
     */
    DEBUG: process.env.DEBUG === 'true',

    ACCESS_CHECK_URL: process.env.ACCESS_CHECK_URL,

    SERVER_PORT: process.env.SERVER_PORT,

    ONES_SESSION: process.env.ONES_SESSION === 'true',

    SHOW_OFFLINE: process.env.SHOW_OFFLINE === 'true',

    DB_CONNECTION_LIMIT: process.env.DB_CONNECTION_LIMIT,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_DATABASE: process.env.DB_DATABASE,
    DB_USERNAME: process.env.DB_USERNAME,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_CHARSET: process.env.DB_CHARSET,
    DB_POOL_MAX: Number(process.env.DB_POOL_MAX) || 0,
    DB_POOL_MIN: Number(process.env.DB_POOL_MIN) || 0,
    DB_POOL_ACQUIRE: Number(process.env.DB_POOL_ACQUIRE) || 30000,
    DB_POOL_IDLE: Number(process.env.DB_POOL_IDLE) || 10000,
};
