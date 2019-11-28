const sequelize = require('../config/database');
const log = require('../config/logger');
const moment = require('moment');

module.exports = class BaseRepository {
    constructor() {
        this.db = sequelize;
    }
};
