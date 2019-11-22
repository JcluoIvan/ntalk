const BaseRepository = require('./base_repository');

module.exports = class UserResponse extends BaseRepository {
    constructor() {
        super();
        this.table = 'user';
        this.columnTimestamp.updatedAt = null;
    }

    async findOrCreateByToken(token) {
        const user = this.find({ token });
        if (!user) {
            const uid = await userRepository.insert({
                token: data.token,
                name: data.name || `User`,
            });

            return await userRepository.findOrFail(uid);
        }

        return user;
    }
};
