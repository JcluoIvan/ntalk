const Talk = require('./models/talk');
const TalkRepository = require('./repositories/talk_repository');

/**
 * @type {Map<number, Talk>}
 */
const mapTalks = new Map();
module.exports = {
    talks() {
        return Array.from(mapTalks.values());
    },

    /**
     * @param {number} id talk id
     */
    async exists(id) {
        if (mapTalks.size === 0) {
            await this.reloadTalks();
        }
        return mapTalks.has(id);
    },

    /**
     *
     */
    async getUserTalks() {
    },
    /**
     *
     */
    async reloadTalks() {
        const talks = await TalkRepository.joinMappinTalks();
        this.mapTalks.clear();
        talks.map((talk) => this.mapTalks.set(talk.id, talk));
    },
};
