const BaseRepository = require('./base_repository');

module.exports = class UserResponse extends BaseRepository {
    constructor() {
        super();
        this.table = 'user';
        this.columnTimestamp.updatedAt = null;
    }

    
    static newClass () {
        return new UserResponse();
    }

    async findOrCreateByToken(token, name = null) {
        const user = await this.find({ token });
        if (!user) {
            const uid = await this.insert({
                token,
                name: name || `User`,
            });
            return await this.findOrFail(uid);
        }
        return user;
    }

    async updateSassid(id, sessid) {
        const affecteds = await this.update({sessid}, {id});
        if (affecteds < 1) {
            throw new Error('update sessid fail');
        }
        return true;
    }
};
