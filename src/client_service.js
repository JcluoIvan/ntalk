const SocketIO = require('socket.io');
const Vue = require('Vue');
const axios = require('axios');
const env = require('./config/env');
const log = require('./config/logger');
const moment = require('moment');
const sha256 = require('sha256');
const Talk = require('./models/talk');
const User = require('./models/user');
const UserRepository = require('./repositories/user_repository');
const TalkRepository = require('./repositories/talk_repository');
const TalkMappingRepository = require('./repositories/talk_mapping_repository');
const { SocketResponseError } = require('./errors');
const TalkService = require('./talk_service');

/**
 *
 * @param {SocketIO.Socket} socket socket
 * @param {?string} message error.message
 */
const clientDisconnect = (socket, message = null) => {
    log.error(message);
    if (message) {
        socket.emit('error.message', message);
    }
    socket.disconnect();
};

/**
 * @async
 * @callback ClientOnCallback
 * @param {any} data response data
 * @param {ClientOnResponse} response response data
 * @returns {Promise<void>}
 */
/**
 *
 * @callback ClientOnResponse
 * @param {any} data response data
 * @returns {void}
 */
/**
 *
 * @param {SocketIO.Socket} socket socket
 * @param {string} event event name
 * @param {ClientOnCallback} callback
 */

const clientOn = (socket, event, callback) => {
    socket.on(event, async (data, response) => {
        try {
            await callback(data, (data) => response({ error: null, data }));
        } catch (err) {
            log.warn(err);
            response({
                error: err.message,
                code: err.code || '',
                data: null,
            });
        }
    });
};

/**
 * The complete Triforce, or one or more components of the Triforce.
 * @typedef {Object} InterfaceClient
 * @property {SocketIO.Socket} socket - Indicates whether the Courage component is present.
 * @property {User} user - Indicates whether the Power component is present.
 */
/**
 * @type {Map<number, InterfaceClient>}
 */
const mapClient  = new Map();
const clientService = {


    /** @type {SocketIO.Server} io   */
    io: null,


    get clients() {
        return Array.from(this.mapClients.values());
    },

    /**
     * 
     * @param {number} uid user id
     * @param {boolean} throwError 不存在時是否拋出錯誤
     * @returns {Client | null}
     */
    getClient(uid, throwError = true) {
        const client = mapClients.get(uid) || null;
        if (!client && throwError) {
            log.error('連線異常，請重新連線');
            throw new SocketResponseError('，請重新連線');
        }
        return client;
    },

    /**
     * 通知所有用戶更新在線用戶
     * @async
     */
    async broadcastOnlineUsers() {
        const showOffline = env.SHOW_OFFLINE;
        const clients = this.clients;
        let data = [];
        const users = await UserRepository.users();

        const data = users.forEach((user) => {
            const udata = user.toJSON();
            udata.online = mapClient.has(user.id);
            return udata;
        });

        this.io.emit('users', data);
    },

    /**
     * @async
     * @param {number} uid user id
     * @param {ClientOnResponse} response response
     */
    async onTalks(uid, response) {
        const talks = await TalkRepository.getByUser(uid);
        response(talks);
    },

    /**
     * 
     * @param {number} uid user
     * @param {number} data target id
     * @param {ClientOnResponse} response 
     */
    async onCreateSingleTalk(uid, data, response) {
        const targetId = Number(data);
        const exists = await this.userRepository.exists({ id: targetId });
        if (!exists) {
            throw new SocketResponseError(`用戶不存在 : ${targetId}`);
        }
        const talk = await this.talkRepository.createSingleTalk(uid, targetId);
        response(talk);
    },

    /**
     * 
     * @param {number} uid user id
     * @param {object} data 
     * @param {number} data.talkId talk id
     * @param {string} data.message send content
     * @param {ClientOnResponse} response 
     */
    async onSendMessage(uid, data, response) {
        const client = this.getClient(uid);
        const tid = data.talkId;
        const message = data.message;
        if (client.talks.indexOf(tid) < 0) {
            throw new SocketResponseError('對話不存在');
        }

        if (TalkService.exists(tid))



        const exists = await this.talkMappingRepository.exists({
            talk_id: tid,
            user_id: uid,
        });
        if (!exists) {
        }

        const message = await this.talkRepository.sendMessage(uid, tid, message);
        response(message.id);

        this.emitTalkMessage(message);
    },

    async updateTalkItem(uid) {}


}


/**
 * @param {SocketIO.Server} io 
 */
module.exports = function(io) {

    clientService.io = io;

    io.on('connection', async (socket) => {
        /** @type {number} user id  */
        const id = Number(socket.handshake.query.id) || 0;

        /** @type {string} sessid */
        const sessid = socket.handshake.query.sessid;
        if (!id || !sessid) {
            clientDisconnect(socket, `不正確的 id (${id}) or sessid (${sessid})`);
            return;
        }
        const user = await UserRepository.findUser(id);
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

        socket.on('disconnect', () => {
            log.warn(`on disconnected > ${socket.id}`);
            const client = this.mapClients.get(user.id);
            this.mapClients.delete(user.id);
            if (client && client.socket.connected) {
                clientDisconnect(client, `中斷連線`);
            }
        });

        this.mapClients.set(user.id, {
            socket,
            user,
        });

        clientOn(socket, 'talk.all', async (data, response) => {
            await this.onTalks(user.id, response);
        });

        clientOn(socket, 'talk.create-single', async (data, response) => {
            await this.onCreateSingleTalk(user.id, data, response);
        });

        clientOn(socket, 'talk.send-message', async (data, response) => {
            await this.onSendMessage(user.id, data, response);
        });

        this.updateOnlineUsers().catch((err) => {
            log.error(err.stack);
        });
    });
}
