import { log } from '../config/logger';
import { User } from '../models/User';
import { SocketResponseError } from '../error';
import { env } from '../config/env';
import { TalkRepository } from '../repositories/TalkRepository';
import { UserRepository } from '../repositories/UserRepository';
import { TalkService } from './TalkService';
import { TalkMessage } from '../models/TalkMessage';
import { TalkMessageRepository } from '../repositories/TalkMessageRepository';

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
    async onTalks(uid: number, response: ClientOnResponse) {
        const talks = await TalkRepository.getByUser(uid);
        const joins = await TalkRepository.getTalkJoinsByUser(uid);
        const singleJoins = await TalkRepository.getSingleJoinsByUser(uid);
        response({ talks, joins, singleJoins });
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
            mapping: join,
        });
    },
    async onSendMessage(uid: number, data: any, response: ClientOnResponse) {
        const client = findClient(uid);
        const tid = Number(data.talkId);
        const content = data.content || '';

        if (!content) {
            throw new SocketResponseError('對話內容為空值');
        }
        if (!(await TalkService.talkHasUser(tid, uid))) {
            throw new SocketResponseError('群組不存在');
        }

        const message = await TalkRepository.sendMessage(uid, tid, content);

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
        clientService.broadcastOnlineUsers().catch((err) => {
            log.error(err.stack);
        });
    });
};
