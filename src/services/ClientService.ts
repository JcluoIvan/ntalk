import { log } from '../config/logger';
import { User } from '../models/User';
import { SocketResponseError } from '../error';
import { TalkRepository } from '../repositories/TalkRepository';
import { UserRepository } from '../repositories/UserRepository';
import { TalkService } from './TalkService';
import { TalkMessage } from '../models/TalkMessage';
import { TalkMessageRepository } from '../repositories/TalkMessageRepository';
import { CronJob } from 'cron';
import moment = require('moment');
import { env } from '../config/env';
type ClientOnResponse = (data: any) => void;
type ClientOnCallback = (data: any, response: ClientOnResponse) => Promise<void>;
interface Client {
    socket: SocketIO.Socket;
    user: User;
}

const mapClients = new Map<number, Client>();
let ioServer!: SocketIO.Server;

const clientOn = (socket: SocketIO.Socket, event: string, callback: ClientOnCallback) => {
    socket.on(event, async (data, response) => {
        log.info('handle event = ', event, data);
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
const findClient = (uid: number) => {
    const client = mapClients.get(uid) || null;
    if (!client) {
        log.error('連線異常，請重新連線');
        throw new SocketResponseError('，請重新連線');
    }
    return client;
};

const clientEventHandler = {
    async onConfig(uid: number, response: ClientOnResponse) {
        response({
            maxLifetime: env.MAX_MESSAGE_LIFETIME,
        });
    },
    async onUsers(uid: number, response: ClientOnResponse) {
        const users = await UserRepository.users();
        const data = users.map((user) => {
            return {
                id: user.id,
                name: user.name,
                avatar: user.avatar,
                online: mapClients.has(user.id),
            };
        });
        response(data);
    },
    async onTalks(uid: number, response: ClientOnResponse) {
        const talks = await TalkRepository.getByUser(uid);
        const joins = await TalkRepository.getTalkJoinsByUser(uid);
        const targetJoins = await TalkRepository.getTargetJoinsByUser(uid);
        const tids = talks.map((t) => t.id);
        const lastMessages = await TalkMessageRepository.lastMessages(tids);
        response({ talks, joins, targetJoins, lastMessages });
    },

    async onCreateSingleTalk(uid: number, data: any, response: ClientOnResponse) {
        const targetId = Number(data);
        if (!(await UserRepository.exists(targetId))) {
            throw new SocketResponseError(`使用者不存在: ${targetId}`);
        }
        let talk = await TalkRepository.findSingleTalk(uid, targetId);
        if (!talk) {
            talk = await TalkRepository.createSingleTalk(uid, targetId);
        }
        await TalkService.reloadTalk(talk.id);
        const join = await TalkRepository.findTalkMapping(uid, talk.id);
        if (!join) {
            throw new SocketResponseError(`對話建立流程失敗，缺少 talk join data`);
        }
        response({
            talk,
            join,
        });
        clientService.broadcastNewTalk(uid, talk.id);
    },
    async onSendMessage(uid: number, data: any, response: ClientOnResponse) {
        const tid = Number(data.talkId);
        const content = data.content || '';

        if (!content) {
            throw new SocketResponseError('對話內容為空值');
        }
        if (!(await TalkService.talkHasUser(tid, uid))) {
            throw new SocketResponseError('群組不存在');
        }

        const message = await TalkService.sendMessage(tid, uid, content);

        response(message);

        clientService.broadcastTalkMessage(tid, message);
    },

    async onLoadMessageAfter(uid: number, data: any, response: ClientOnResponse) {
        const tid = Number(data.talkId);
        const mid = Number(data.messageId);
        if (!(await TalkService.talkHasUser(tid, uid))) {
            throw new SocketResponseError('群組不存在');
        }
        const messages = await TalkMessageRepository.loadMessageAfter(tid, mid);
        const nums = await TalkMessageRepository.numMessageAfters(tid, mid);
        response({
            messages,
            nums: nums - messages.length,
        });
    },
    async onLoadMessageBefore(uid: number, data: any, response: ClientOnResponse) {
        const tid = Number(data.talkId);
        const mid = Number(data.messageId);
        if (!(await TalkService.talkHasUser(tid, uid))) {
            throw new SocketResponseError('群組不存在');
        }
        const messages = await TalkMessageRepository.loadMessageBefore(tid, mid);
        const nums = await TalkMessageRepository.numMessageBefores(tid, mid);
        response({
            messages,
            nums: nums - messages.length,
        });
    },
    async onTalkMessageDeleteAll(uid: number, tid: number, response: ClientOnResponse) {
        if (!(await TalkService.talkHasUser(tid, uid))) {
            throw new SocketResponseError('群組不存在');
        }

        await TalkService.deleteAllTalkMessage(tid);
        await clientService.broadcastMessageDeleted(tid);
        response(true);
    },
    async onChangeTalkLifetime(uid: number, data, response: ClientOnResponse) {
        const tid = Number(data.talkId);
        const lifetime = Number(data.lifetime);
        if (!(await TalkService.talkHasUser(tid, uid))) {
            throw new SocketResponseError('群組不存在');
        }

        await TalkService.changeTalkLifetime(tid, lifetime);
        await clientService.broadcastChangeTalkLifeTime(tid);
        response(true);
    },
};

const clientService = {
    get clients() {
        return Array.from(mapClients.values());
    },

    getClient(uid: number, throwError = true) {
        const client = mapClients.get(uid) || null;
        if (!client && throwError) {
            log.error('連線異常，請重新連線');
            throw new SocketResponseError('，請重新連線');
        }
        return client;
    },

    clientDisconnect(socket: SocketIO.Socket, message?: string) {
        log.error(message);
        if (message) {
            socket.emit('error.message', message);
        }
        socket.disconnect();
    },

    /**
     * 通知所有用戶更新在線用戶
     * @async
     */
    async broadcastOnlineUsers() {
        const users = await UserRepository.users();
        const data = users.map((user) => {
            return {
                id: user.id,
                name: user.name,
                avatar: user.avatar,
                online: mapClients.has(user.id),
            };
        });
        ioServer.emit('users', data);
    },

    async broadcastNewTalk(uid: number, tid: number) {
        const item = TalkService.find(tid);
        if (!item) {
            log.error('資料異常, 查無對話群組');
            return;
        }
        const { talk, lastMessage } = item;

        const joins = talk.TalkJoins.filter((j) => j.userId !== uid);
        const targetJoin = TalkService.findTalkJoin(talk.id, uid);

        const talkData: any = talk.toJSON();
        delete talkData.TalkJoins;

        joins.forEach((join) => {
            const client = mapClients.get(join.userId);
            if (!client) {
                return;
            }
            client.socket.emit('talk.update', {
                talk: talkData,
                join,
                lastMessage,
                targetJoin,
            });
        });
    },

    async broadcastChangeTalkLifeTime(tid) {
        const item = TalkService.find(tid);
        if (!item) {
            log.error('資料異常！ 對話群組不存在');
            return;
        }
        const { talk } = item;
        talk.TalkJoins.forEach((join) => {
            const client = mapClients.get(join.userId);
            if (!client) {
                return;
            }
            client.socket.emit('talk.lifetime', { talkId: talk.id, lifetime: talk.lifetime });
        });
    },

    async broadcastMessageDeleted(tid: number) {
        const item = TalkService.find(tid);
        if (!item) {
            log.error('資料異常！ 對話群組不存在');
            return;
        }
        const { talk, firstMessage } = item;
        talk.TalkJoins.forEach((join) => {
            const client = mapClients.get(join.userId);
            if (!client) {
                return;
            }
            if (firstMessage) {
                client.socket.emit('talk.message.delete-less', {
                    talkId: talk.id,
                    messageId: firstMessage.id,
                });
            } else {
                client.socket.emit('talk.message.delete-all', {
                    talkId: talk.id,
                });
            }
        });
    },

    async broadcastTalkMessage(tid: number, message: TalkMessage) {
        const uids = TalkService.talkJoinUsers(tid);
        uids.forEach((uid) => {
            const client = mapClients.get(uid);
            if (!client) {
                return;
            }
            client.socket.emit('talk.message', message.toJSON());
        });
    },
};

/**
 * @param {SocketIO.Server} io
 */
export const handlerIOServer = async (io: SocketIO.Server) => {
    ioServer = io;

    // 重設存活時間
    await TalkRepository.reloadLifetime();

    // 載入所有對話
    await TalkService.reloadTalks();

    io.on('connection', async (socket) => {
        /** @type {number} user id  */
        const id = Number(socket.handshake.query.id) || 0;

        /** @type {string} sessid */
        const sessid = socket.handshake.query.sessid;
        if (!id || !sessid) {
            clientService.clientDisconnect(socket, `不正確的 id (${id}) or sessid (${sessid})`);
            return;
        }
        const user = await UserRepository.findWithoutToken(id);
        if (!user) {
            clientService.clientDisconnect(socket, `使用者不存在`);
            return;
        }

        if (user.sessid !== sessid) {
            clientService.clientDisconnect(socket, `sessid 已失效`);
            return;
        }

        log.info(`on connected > ${socket.id}`);

        const old = mapClients.get(user.id);
        if (old) {
            if (old.socket) {
                clientService.clientDisconnect(old.socket, `重複登入`);
            }
            mapClients.delete(user.id);
        }

        socket.on('disconnect', () => {
            log.warn(`on disconnected > ${socket.id}`);
            const client = mapClients.get(user.id);
            mapClients.delete(user.id);
            if (client && client.socket.connected) {
                clientService.clientDisconnect(client.socket, `中斷連線`);
            }
        });

        mapClients.set(user.id, {
            socket,
            user,
        });

        clientOn(socket, 'config', async (data, response) => {
            await clientEventHandler.onConfig(user.id, response);
        });

        clientOn(socket, 'users', async (data, response) => {
            await clientEventHandler.onUsers(user.id, response);
        });

        clientOn(socket, 'talk.all', async (data, response) => {
            log.warn('talk.all');
            await clientEventHandler.onTalks(user.id, response);
        });

        clientOn(socket, 'talk.create-single', async (data, response) => {
            await clientEventHandler.onCreateSingleTalk(user.id, data, response);
        });

        clientOn(socket, 'talk.message', async (data, response) => {
            await clientEventHandler.onSendMessage(user.id, data, response);
        });

        clientOn(socket, 'talk.load-message.before', async (data, response) => {
            await clientEventHandler.onLoadMessageBefore(user.id, data, response);
        });

        clientOn(socket, 'talk.load-message.after', async (data, response) => {
            await clientEventHandler.onLoadMessageAfter(user.id, data, response);
        });

        clientOn(socket, 'talk.message.delete-all', async (data, response) => {
            await clientEventHandler.onTalkMessageDeleteAll(user.id, data, response);
        });

        clientOn(socket, 'talk.lifetime', async (data, response) => {
            await clientEventHandler.onChangeTalkLifetime(user.id, data, response);
        });

        clientService.broadcastOnlineUsers().catch((err) => {
            log.error(err.stack);
        });
    });

    /**
     *
     * Seconds: 0-59
     * Minutes: 0-59
     * Hours: 0-23
     * Day of Month: 1-31
     * Months: 0-11 (Jan-Dec)
     * Day of Week: 0-6 (Sun-Sat)
     */

    /**
     * 每分鐘執行一次
     */
    const clearExpireTalkMessageJob = new CronJob('0 * * * * *', () => {
        const now = moment().valueOf();

        TalkService.all().filter(async ({ talk, firstMessage }) => {
            const lifetime = talk.lifetime;
            const firstMessageAt = firstMessage ? moment(firstMessage.createdAt).add(lifetime, 'minute') : null;
            console.warn('Frist > ', firstMessageAt);
            if (firstMessageAt && now > firstMessageAt.valueOf()) {
                await TalkService.clearExpireMessages(talk.id);
                clientService.broadcastMessageDeleted(talk.id);
            }
        });
    });
    clearExpireTalkMessageJob.start();
};
