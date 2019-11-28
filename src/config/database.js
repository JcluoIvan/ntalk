"use strict";
exports.__esModule = true;
var sequelize_1 = require("sequelize");
var logger_1 = require("./logger");
exports.sequelize = new sequelize_1.Sequelize(process.env.DB_DATABASE, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    pool: {
        max: Number(process.env.DB_POOL_MAX),
        min: Number(process.env.DB_POOL_MIN),
        acquire: Number(process.env.DB_POOL_ACQUIRE),
        idle: Number(process.env.DB_POOL_IDLE)
    }
});
exports.sequelize
    .authenticate()
    .then(function () {
    logger_1.log.info('database connection successfully');
})["catch"](function (err) {
    logger_1.log.fatal('Unable to connect to the database:', err);
});
