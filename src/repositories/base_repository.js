const db = require('../config/database');
const log = require('../config/logger');
const moment = require('moment');

const joinWheres = (conditions) => {
    let [wheres = '1', values = []] = conditions;
    let sqlWheres = '';
    if (typeof wheres === 'object') {
        values = [];
        sqlWheres = Object.keys(wheres)
            .map((key) => {
                values.push(wheres[key]);
                return `\`${key}\` = ? `;
            })
            .join(' AND ');
    }
    return { wheres: sqlWheres, values };
};

const joinInserValues = (rows, colTimestamp = {}) => {
    const keys = Object.keys(rows[0]);

    const escapeUpdatedAt = colTimestamp.updatedAt ? colTimestamp.updatedAt : null;
    const escapeCreatedAt = colTimestamp.createdAt ? colTimestamp.createdAt : null;
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const joinValues = rows
        .map((row) => {
            const values = keys.map((key) => {
                return isNaN(row[key]) ? db.escape(row[key]) : Number(row[key]);
            });
            if (escapeUpdatedAt) {
                values.push(`${now}`);
            }
            if (escapeCreatedAt) {
                values.push(`'${now}'`);
            }
            return '(' + values.join(',') + ')';
        })
        .join(', ');
    if (escapeUpdatedAt) {
        keys.push(escapeUpdatedAt);
    }
    if (escapeCreatedAt) {
        keys.push(escapeCreatedAt);
    }
    const joinKeys = keys.map((key) => '`' + key + '`').join(',');

    return { keys: joinKeys, values: joinValues };
};

const joinUpdateSetting = (data) => {
    return Object.keys(data)
        .map((key) => {
            const value = (data[key] === null) | (data[key] === undefined) ? null : db.escape(data[key]);
            return `\`${key}\`=${value}`;
        })
        .join(',');
};

module.exports = class BaseRepository {
    constructor() {
        this.table = this.table || '';
        this.timeout = this.timeout || 30;
        this.columnTimestamp = {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        };
    }

    get escapeTable() {
        return `\`${this.table}\``;
    }
    
    async query(sql, values = []) {
        return new Promise((resolve, reject) => {
            db.query(
                {
                    sql,
                    timeout: this.timeout,
                    values,
                },
                (err, result, fields) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(result);
                },
            );
        });
    }

    async find(...conditions) {
        const { wheres, values } = joinWheres(conditions);
        const result = await this.query(`SELECT * FROM ${this.escapeTable} WHERE ${wheres}`, values);
        return result[0];
    }


    async get(...conditions) {
        let wheres = '1';
        let values = [];
        if (conditions) {
            const { wheres, values } = joinWheres(conditions);
        }
        const result = await this.query(`SELECT * FROM ${this.escapeTable} WHERE ${wheres}`, values);
        return result;
    }

    async findOrFail(...conditions) {
        const find = this.find(...conditions);
        if (!find) {
            throw new Error('Not Found');
        }
        return find;
    }

    async count(...conditions) {
        const { wheres, values } = joinWheres(conditions);
        const result = await this.query(`SELECT count(1) FROM ${this.escapeTable} WHERE ${wheres}`, values);
        return Number(result[0] || 0);
    }

    async exists(...conditions) {
        const result = await this.count(...conditions);
        return result > 0;
    }

    async inserts(rows) {
        const { keys, values } = joinInserValues([data], this.columnTimestamp);
        const result = await this.query(`INSERT INTO ${this.escapeTable} (${keys}) VALUES ${values}`);
        return result.affectedRows;
    }
    async insert(data) {
        const { keys, values } = joinInserValues([data], this.columnTimestamp);
        const result = await this.query(`INSERT INTO ${this.escapeTable} (${keys}) VALUES ${values}`);
        return result.insertId;
    }

    async update(data, ...conditions) {
        const { wheres, values } = joinWheres(conditions);
        const settings = joinUpdateSetting(data);
        const result = await this.query(`UPDATE ${this.escapeTable} SET ${settings} WHERE ${wheres}`, values);
        return result.affectedRows;
    }
};
