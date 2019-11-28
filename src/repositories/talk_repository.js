const Sequelize = require('sequelize');
const BaseRepository = require('./base_repository');
const TalkMappingRepository = require('./talk_mapping_repository');
const MessageRepository = require('./message_repository');
const log = require('../config/logger');
const Talk = require('../models/talk');
const UserTalkMapping = require('../models/user_talk_mapping');
const TalkMapping = require('../models/talk_mapping');

module.exports = {
    /**
     * @returns {Promise<Talk[]>}
     */
    async talks() {
        return await Talk.findAll();
    },

    /**
     *
     * @param {number} uid user id
     * @returns {Promise<Talk[]>}
     */
    async getByUser(uid) {
        return await Talk.findAll({
            include: [
                {
                    model: UserTalkMapping,
                    where: { user_id: uid },
                    required: true,
                },
            ],
        });
    },

    /**
     * @returns {Promise<Talk[]>}
     */
    async joinMappinTalks() {
        return await Talk.findAll({
            include: [TalkMapping],
        });
    },
};
