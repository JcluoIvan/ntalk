const BaseRepository = require('./base_repository');

module.exports = class MessageResponse extends BaseRepository {
    constructor() {
        super();
        this.table = 'message';
        this.columnTimestamp.updatedAt = null;
    }

};
