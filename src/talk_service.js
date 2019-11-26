const Vue = require('Vue');
const axios = require('axios');
const env = require('./config/env');
const log = require('./config/logger');
const moment = require('moment');
const sha256 = require('sha256');
const UserRepository = require('./repositories/user_repository');
const TalkRepository = require('./repositories/talk_repository');

const clientDisconnect = (socket, message = null) => {
    log.error(message);
    if (message) {
        socket.emit('error.message', message);
    }
    socket.disconnect();
};

class TalkService {
    constructor(io) {
        this.mapClients = new Map();
        this.io = io;

        this.talkRepository = new TalkRepository();
        this.userRepository = new UserRepository();

        io.on('connection', async (socket) => {
            const id = socket.handshake.query.id;
            const sessid = socket.handshake.query.sessid;
            if (!id || !sessid) {
                clientDisconnect(socket, `不正確的 id (${id}) or sessid (${sessid})`);
                return;
            }
            const user = await this.userRepository.find({ id });
            if (!user) {
                clientDisconnect(socket, `使用者不存在`);
                return;
            }

            if (user.sessid !== sessid) {
                clientDisconnect(socket, `sessid 已失效`);
                return;
            }

            log.info(`on connected > ${socket.id}`);

            const old = this.mapClients.get(user.id);
            if (old) {
                if (old.socket) {
                    clientDisconnect(old.socket, `重複登入`);
                }
                this.mapClients.delete(user.id);
            }

            this.mapClients.set(user.id, {
                socket,
                user,
            });

            socket.on('disconnect', () => {
                log.warn(`on disconnected > ${socket.id}`);

                const client = this.mapClients.get(user.id);
                this.mapClients.delete(user.id);
                if (client && client.socket.connected) {
                    clientDisconnect(client, `中斷連線`);
                }
            });

            socket.on('reload.talks', (data, response) => {
                this.onReloadTalks(user.id, response);
            });

            this.updateOnlineUsers();
        });
    }

    get clients() {
        return Array.from(this.mapClients.values());
    }

    async updateOnlineUsers() {
        const showOffline = env.SHOW_OFFLINE;
        const clients = this.clients;
        let data = [];

        const users = await this.userRepository.query('SELECT id, name, image FROM `user`');

        users.forEach((user) => {
            const client = this.mapClients.get(user.id);
            if (showOffline || client) {
                data.push({
                    id: user.id,
                    name: user.name,
                    image: user.image,
                    online: client ? true : false,
                });
            }
        });

        this.io.emit('users', data);
    }

    async onReloadTalks(uid, response) {
        const talks = await this.talkRepository.allTalks(uid);
        response(talks);
    }

    async updateTalkItem(uid) {}
}

module.exports = TalkService;
