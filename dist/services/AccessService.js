"use strict";
const Vue = require('Vue');
const axios = require('axios');
const env = require('./config/env');
const log = require('./config/logger');
const moment = require('moment');
const sha256 = require('sha256');
const UserRepository = require('./repositories/user_repository');
class AccessService {
    constructor() {
        this.mapClients = new Map();
    }
    disconnectClient(id) {
        const client = this.findClient(id);
        if (client) {
            client.socket.disconnect();
        }
    }
    findClient(id) {
        return this.mapClients.get(id);
    }
    createClient(user) {
        if (!this.findClient(user.id)) {
        }
    }
    async oauth(access_token) {
        if (!access_token) {
            throw new Error('access token is required');
        }
        const { data } = await axios.post(env.ACCESS_CHECK_URL, null, { params: { access_token } });
        if (typeof data !== 'object') {
            log.fatal('access check response unkonwn > ' + data);
            throw new Error(data + '');
        }
        if (data.error) {
            throw new Error(data.error);
        }
        if (!data.token) {
            log.fatal('access check response no id > ' + JSON.stringify(data));
            throw new Error('empty id');
        }
        const sessid = sha256(`${data.token}-${moment().valueOf()}-${Math.random()}`);
        const userRepository = new UserRepository();
        const user = await userRepository.findOrCreateByToken(data.token, data.name || null);
        await userRepository.updateSassid(user.id, sessid);
        this.disconnectClient(user.id);
        this.createClient(user);
        return { id: user.id, sessid, name: user.name, image: user.image };
    }
}
module.exports = new AccessService();
//# sourceMappingURL=AccessService.js.map