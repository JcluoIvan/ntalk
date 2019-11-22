const mysql = require('mysql');
const env = require('./env');

var pool = mysql.createPool({
    connectionLimit: env.DB_CONNECTION_LIMIT,
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
});


module.exports = pool;
