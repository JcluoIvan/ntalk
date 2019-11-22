const Vue = require('Vue');
const axios = require('axios');
const env = require('./config/env');
const log = require('./config/logger');
const moment = require('moment');
const sha256 = require('sha256');
const UserRepository = require('./repositories/user_repository');

class Client {
    constructor(user) {
        this.socket = null;
        this.online = false;
        this.user = { ...user };
    }

    onConnect(socket, sid) {
        if (!sid) {
            throw new Error('sid is required');
        }

        if (this.user.sid !== sid && this.socket) {
            this.socket.disconnect();
        }

        this.user.sid = sid;
        this.socket = socket;

        socket.on('disconnect', () => {
            this.online = false;
            this.socket = null;
        });
    }
}

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

        const { data } = await axios.post(env.ACCESS_CHECK_URL, { access_token });

        if (typeof data !== 'object') {
            log.fatal('access check response unkonwn > ' + data);
            throw new Error(data + '');
        }

        if (data.error) {
            throw new Error(data.error);
        }

        if (!data.token) {
            log.fatal('access check response no token > ' + JSON.stringify(data));
            throw new Error('empty token');
        }

        const user = await new UserRepository().findOrCreateByToken(data.token);
        const stoken = sha256(`${user.token}-${moment().valueOf()}-${Math.random()}`);
        this.disconnectClient(user.id);
        this.createClient(user);
        return { id: user.id, stoken };
    }
}

module.exports = new AccessService();
