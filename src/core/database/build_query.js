const db = require('../../config/database');
const mysql = require('mysql');
class BuildQuery {
    constructor(conn) {
        this.conn = conn;
        this._querys = {
            select: '*',
            from: '',
            where: [],
            orderBy: [],
            groupBy: [],
            offset: 0,
            limit: 0,
        };
    }

    escape(value, stringifyObjects = false) {
        return db.escape(value, stringifyObjects);
    }

    toSql() {
        return `SELECT `;
    }

    select(...selects) {
        this._querys.selects = selects.reduce((selects, s) => selects.push(s), []).join(',');
        return this;
    }

    addSelect(...selects) {
        const selects = this._querys.select ? selects : [this._querys.select, ...selects];
        return this.select(selects);
    }

    from(table) {
        this._querys = table;
    }

    // clear where and addWhere
    where() {
        this._querys.where = '';
        this.AddWhere();
    }

    andWhere(...args) {
        const wheres = this._querys.where ? [this._querys.where] : [];

        // andWhere(id, 1)
        if (args.length === 2) {
            const col = db.escapeId(args[0]);
            const value = args[1];
            if (Array.isArray(value)) {
                wheres.push(mysql.format(`${col} IN (?)`, value));
            } else {
                wheres.push(mysql.format(`${col} = ?`, value));
            }
        }
    }
}

module.exports = (connection) => new BuildQuery(connection);
