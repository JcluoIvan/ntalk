import { Sequelize } from 'sequelize';
import { log } from './logger';
import { env } from './env';
export const sequelize = new Sequelize(env.DB_DATABASE, env.DB_USERNAME, env.DB_PASSWORD, {
    host: env.DB_HOST,
    dialect: 'mysql',
    logging: env.DEBUG,
    pool: {
        max: env.DB_POOL_MAX,
        min: env.DB_POOL_MIN,
        acquire: env.DB_POOL_ACQUIRE,
        idle: env.DB_POOL_IDLE,
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
