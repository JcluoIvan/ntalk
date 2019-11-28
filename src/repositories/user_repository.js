const BaseRepository = require('./base_repository');
const User = require('../models/user');
module.exports = {
    /**
     * @async
     * @param {number} id user id
     * @returns {User|null}
     */
    async findUser(id) {
        return await User.scope('withoutToken').findByPk(id);
    },

    /**
     * @async
     * @returns {User[]}
     */
    async users() {
        return await User.scope('withoutToken').findAll();
    },
};
