import { log } from '../config/logger';
import { User } from '../models/User';
import { SocketResponseError } from '../error';
import { TalkRepository } from '../repositories/TalkRepository';
import { UserRepository } from '../repositories/UserRepository';
import { TalkService } from './TalkService';
import { TalkMessage } from '../models/TalkMessage';
import { TalkMessageRepository } from '../repositories/TalkMessageRepository';
import { CronJob } from 'cron';
import moment from 'moment';
import _ from 'lodash';
import { env } from '../config/env';
import Talk from '../models/Talk';
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
        try {
            await callback(data, (data) => response({ error: null, data }));
        } catch (err) {
            response({
                error: err.message,
                code: err.code || '',
                data: null,
            });
        }
    });
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
    async onUpdateUserName(uid: number, name: string, response: ClientOnResponse) {
        const client = mapClients.get(uid);
        if (!client) {
            log.error('查無使用者資料(嚴重錯誤)');
            throw new SocketResponseError('查無使用者資料');
        }

        if (!name) {
            throw new SocketResponseError('名稱不得為空值');
        }

        client.user.name = name;
        await client.user.save();

        clientService.broadcastUserUpdate(uid);
        response(true);
    },
    async onTalks(uid: number, response: ClientOnResponse) {
        const joins = await TalkRepository.getTalkJoinsByUser(uid);
        const talks = joins.map((tj) => {
            try {
                return TalkService.toTalkData(tj.talkId, uid);
            } catch (err) {
                throw new SocketResponseError(err.message);
            }
        });
        response(talks);
    },

    async onCreateSingleTalk(uid: number, data: any, response: ClientOnResponse) {
        const targetId = Number(data);
        const tid = await TalkService.createSingleTalk(uid, targetId);
        response(TalkService.toTalkData(tid, uid));
        clientService.broadcastTalkUpdate(uid, tid);
    },

    async onSaveGroupTalk(uid: number, data: any, response: ClientOnResponse) {
        const id: number = Number(data.id) || 0;
        const name: string = data.name;
        const users: number[] = data.users;

        const tid = await TalkService.saveGroupTalk(uid, {
            id,
            name,
            users,
        });
        response(TalkService.toTalkData(tid, uid));
        clientService.broadcastTalkUpdate(uid, tid);
    },

    async onLeaveTalk(uid: number, tid: number, response: ClientOnResponse) {
        const user = await UserRepository.find(uid);
        if (!user) {
            log.error(`嚴重錯誤, 使用者不存在 : ${uid}`);
            throw new SocketResponseError(`使用者不存在 : ${uid}`);
        }
        await TalkService.leaveTalk(tid, uid);
        if (TalkService.exists(tid)) {
            const message = await TalkService.sendMessage(tid, 0, `${user.name} 離開群組`);
            clientService.broadcastTalkMessage(tid, message);
            clientService.broadcastTalkUpdate(uid, tid);
        }
        response(true);
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
    clients() {
        return Array.from(mapClients.values());
    },

    toUserData(user: User) {
        return {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            online: mapClients.has(user.id),
        };
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
        if (message) {
            socket.emit('error.message', message);
        }
        socket.disconnect();
    },

    /**
     * 更新使用者資料
     */
    async broadcastUserUpdate(id) {
        const client = mapClients.get(id);
        const udata = client ? clientService.toUserData(client.user) : null;
        if (!udata) {
            return;
        }

        clientService.clients().forEach((client) => {
            client.socket.emit('user.update', udata);
        });
    },

    /**
     * 通知所有用戶更新在線用戶
     * @async
     */
    async broadcastUsers() {
        const users = await UserRepository.users();
        const data = users.map((user) => clientService.toUserData(user));
        console.info(data);
        ioServer.emit('users', data);
    },

    async broadcastTalkUpdate(uid: number, tid: number) {
        const item = TalkService.find(tid);
        if (!item) {
            log.error('資料異常, 查無對話群組');
            return;
        }
        const joins = item.talk.TalkJoins.filter((j) => j.userId !== uid);
        joins.forEach((join) => {
            const client = mapClients.get(join.userId);
            if (!client) {
                return;
            }
            client.socket.emit('talk.update', TalkService.toTalkData(tid, client.user.id));
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
            /* 登出使用者 */
            socket.emit('logout');
            clientService.clientDisconnect(socket, `sessid 已失效`);
            return;
        }

        const old = mapClients.get(user.id);
        if (old) {
            if (old.socket) {
                /* 登出使用者 */
                old.socket.emit('logout');
                clientService.clientDisconnect(old.socket, `重複登入`);
            }
            mapClients.delete(user.id);
        }

        socket.on('disconnect', () => {
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

        clientOn(socket, 'user.name', async (data, response) => {
            await clientEventHandler.onUpdateUserName(user.id, data, response);
        });

        clientOn(socket, 'talk.all', async (data, response) => {
            await clientEventHandler.onTalks(user.id, response);
        });

        clientOn(socket, 'talk.create-single', async (data, response) => {
            await clientEventHandler.onCreateSingleTalk(user.id, data, response);
        });

        clientOn(socket, 'talk.save-group', async (data, response) => {
            await clientEventHandler.onSaveGroupTalk(user.id, data, response);
        });

        clientOn(socket, 'talk.leave', async (data, response) => {
            await clientEventHandler.onLeaveTalk(user.id, data, response);
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

        clientService.broadcastUserUpdate(user.id);
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
    const checkExpireMessage = () => {
        const now = moment().valueOf();

        TalkService.all().filter(async ({ talk, firstMessage }) => {
            const lifetime = talk.lifetime;
            const firstMessageAt = firstMessage ? moment(firstMessage.createdAt).add(lifetime, 'minute') : null;
            if (firstMessageAt && now > firstMessageAt.valueOf()) {
                await TalkService.clearExpireMessages(talk.id);
                clientService.broadcastMessageDeleted(talk.id);
            }
        });
    };

    /**
     * 每分鐘執行一次
     */
    const clearExpireTalkMessageJob = new CronJob('0 * * * * *', checkExpireMessage);
    clearExpireTalkMessageJob.start();
    checkExpireMessage();
};
