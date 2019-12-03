require('dotenv').config();
export const env = {
    /**
     * dev = 開發, prod = 正式
     */
    DEBUG: process.env.DEBUG === 'true',

    ACCESS_CHECK_URL: process.env.ACCESS_CHECK_URL,

    SERVER_PORT: process.env.SERVER_PORT,

    ONES_SESSION: process.env.ONES_SESSION,

    SHOW_OFFLINE: process.env.SHOW_OFFLINE,
    MAX_MESSAGE_LIFETIME: Number(process.env.MAX_MESSAGE_LIFETIME),

    DB_CONNECTION_LIMIT: process.env.DB_CONNECTION_LIMIT,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_DATABASE: process.env.DB_DATABASE,
    DB_USERNAME: process.env.DB_USERNAME,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_CHARSET: process.env.DB_CHARSET,
    DB_POOL_MAX: Number(process.env.DB_POOL_MAX),
    DB_POOL_MIN: Number(process.env.DB_POOL_MIN),
    DB_POOL_ACQUIRE: Number(process.env.DB_POOL_ACQUIRE),
    DB_POOL_IDLE: Number(process.env.DB_POOL_IDLE),
};
