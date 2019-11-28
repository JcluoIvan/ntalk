import { Sequelize } from 'sequelize';
import { log } from './logger';
export const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    pool: {
        max: Number(process.env.DB_POOL_MAX),
        min: Number(process.env.DB_POOL_MIN),
        acquire: Number(process.env.DB_POOL_ACQUIRE),
        idle: Number(process.env.DB_POOL_IDLE),
    },
});

sequelize
    .authenticate()
    .then(() => {
        log.info('database connection successfully');
    })
    .catch((err: Error) => {
        log.fatal('Unable to connect to the database:', err);
    });
