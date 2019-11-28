const sequelize = require('../config/database');
const Sequelize = require('sequelize');
const moment = require('moment');
class InterfaceModel extends Sequelize.Model {
    constructor() {
        this.id = 0;
        this.talkId = 0;
        this.userId = 0;
        this.unread = 0;
        this.lastReadId = 0;
        /** @type {Date}  */
        this.createdAt;
    }
}

/**
 * @extends InterfaceModel
 */
class TalkMapping extends Sequelize.Model {}

TalkMapping.init(
    {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
        },
        talkId: Sequelize.BIGINT,
        userId: Sequelize.BIGINT,
        unread: Sequelize.INTEGER,
        lastReadId: Sequelize.BIGINT,
        createdAt: Sequelize.DATE,
    },
    {
        underscored: true,
        tableName: 'talk_mapping',
        sequelize,
        updatedAt: false,
    },
);
module.exports = TalkMapping;
