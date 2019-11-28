const sequelize = require('../config/database');
const Sequelize = require('sequelize');
const moment = require('moment');
const TalkMapping = require('./talk_mapping');
const UserTalkMapping = require('./user_talk_mapping');
class InterfaceModel extends Sequelize.Model {
    constructor() {
        this.id = 0;

        /** @type {'single'|'group'} */
        this.type = '';

        this.name = '';
        this.avatar = '';
        this.creatorId = 0;
        /** @type {Date}  */
        this.createdAt;

        /** @type {TalkMapping[]} */
        this.TalkMappings;
    }
}

/**
 * @extends InterfaceModel
 */
class Talk extends Sequelize.Model {}

Talk.init(
    {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
        },
        type: Sequelize.ENUM('single', 'group'),
        name: Sequelize.STRING,
        avatar: Sequelize.STRING,
        creatorId: Sequelize.BIGINT,
        createdAt: Sequelize.DATE,
    },
    {
        underscored: true,
        tableName: 'talk',
        sequelize,
        updatedAt: false,
    },
);

Talk.hasMany(TalkMapping);

/* user talk_mapping data */
Talk.hasOne(UserTalkMapping);

exports.UserTalkMapping = UserTalkMapping;
module.exports = Talk;
