const db = require('../config/database');
const buildQuery = require('./build_query')
const dbQuery = {
    build: buildQuery,
    
}
module.exports = dbQuery;
