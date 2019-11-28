import Vue from 'vue';
import axios from 'axios';
import io from 'socket.io-client';
import helpers from '@/helpers';
import { resolve } from 'dns';

export enum SocketStatus {
    Connected = 'connected',
    Reconnecting = 'reconnecting',
    Disconnected = 'disconnected',
}
let client: SocketIOClient.Socket = io('/', {
    autoConnect: false,
});

let autoincrementTalkKey = 0;

const clientEmit = async <T = any>(event: string, data?: any): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
        client.emit(event, data, (res: NTalk.Socket.EmitResponse<T>) => {
            if (!res) {
                return reject(new Error(`response is empty`));
            }
            if (res.error) {
                store.notice(res.error, 'error');
                return reject(new Error(res.error));
            }
            resolve(res.data);
        });
    });
};

const createTalk = (data: any): NTalk.Talk => {
    const lastMessage = data.last_message || data.lastMessage;
    return {
        messages: [],
        id: data.id,
        type: data.type,
        name: data.name,
        avatar: data.avatar,
        unread: data.unread,
        targetId: data.target_id || data.targetId || 0,
        lastMessage: lastMessage
            ? {
                  id: lastMessage.id,
                  userId: lastMessage.user_id || lastMessage.userId,
                  talkId: lastMessage.talk_id || lastMessage.talkId,
                  content: lastMessage.content,
                  createdAt: lastMessage.created_at || lastMessage.createdAt,
              }
            : null,
        lastReadId: data.last_read_id || data.lastReadId,
        createdAt: data.created_at || data.createdAt,
        key: data.key ? data.key : ++autoincrementTalkKey,
    };
};

const store = new Vue({
    data: (): {
        user: NTalk.UserSelf;
        users: NTalk.User[];
        notices: NTalk.NoticeMessage[];
        sourceTalks: NTalk.Talk[];
        activeTKey: number;
        socket: {
            errorMessage: string;
            status: SocketStatus;
        };
    } => ({
        user: {
            id: 0,
            sessid: '',
            name: '',
            avatar: '',
            online: false,
        },
        notices: [],
        users: [],
        sourceTalks: [],
        activeTKey: 0,
        socket: {
            errorMessage: '',
            status: SocketStatus.Disconnected,
        },
    }),
    computed: {
        query(): NTalk.Query {
            const queryStr = location.href.split('?')[1] || '';
            const query = queryStr.split('&').reduce<any>((obj, str: string) => {
                if (str.indexOf('=') > 0) {
                    const [key, value] = str.split('=');
                    obj[key] = value;
                }
                return obj;
            }, {});
            return {
                access_token: query.access_token,
            };
        },
        isConnected(): boolean {
            return this.socket.status === SocketStatus.Connected;
        },
        isReconnecting(): boolean {
            return this.socket.status === SocketStatus.Reconnecting;
        },
        talks(): NTalk.Talk[] {
            const sources = this.sourceTalks;
            const uid = this.user.id;
            const talks: NTalk.Talk[] = this.users
                .filter((u) => u.id !== uid)
                .map<NTalk.Talk>((u) => {
                    const talk = sources.find((t) => t.type === 'single' && t.targetId === u.id) || {};
                    return createTalk({
                        id: 0,
                        type: 'single',
                        unread: 0,
                        targetId: u.id,
                        lastMessage: null,
                        lastReadId: 0,
                        createdAt: '',
                        ...talk,
                        name: u.name,
                        avatar: u.avatar,
                    });
                });

            sources.filter((t) => t.type === 'group').forEach((t) => talks.push(t));
            return talks.sort((a, b) => {
                return ((a.lastMessage && a.lastMessage.id) || a.id) - ((b.lastMessage && b.lastMessage.id) || b.id);
            });
        },
        activeTalk(): NTalk.Talk | null {
            const tkey = this.activeTKey;
            return this.talks.find((t) => t.key === tkey) || null;
        },
    },
    methods: {
        async access() {
            const data = {
                access_token: this.query.access_token,
            };
            this.socket.errorMessage = '';

            return axios
                .post<{
                    id: number;
                    sessid: string;
                    name: string;
                    avatar: string;
                }>('/access', data)
                .then((res) => {
                    this.user.sessid = res.data.sessid;
                    this.user.id = res.data.id;
                    this.user.name = res.data.name;
                    this.user.avatar = res.data.avatar;
                    this.connect();
                })
                .catch((res) => {
                    this.socket.errorMessage = helpers.value(res, 'response.data.message', res.message);
                });
        },

        connect() {
            client = io('/', {
                query: {
                    id: this.user.id,
                    sessid: this.user.sessid,
                },
            });

            client.on('connect', () => {
                this.socket.status = SocketStatus.Connected;
                console.info('connect');

                this.reloadTalks();
            });
            client.on('reconnect_attempt', () => {
                this.socket.status = SocketStatus.Reconnecting;
                console.warn('RECONNECTING');
            });
            client.on('error', (message: string) => {
                this.socket.errorMessage = message;
            });
            client.on('disconnect', () => {
                this.socket.status = SocketStatus.Disconnected;
                console.error('disconnect');
            });

            client.on('error.message', (message: string) => {
                console.error(message);
                this.socket.errorMessage = message;
            });

            /**
             * 更新成員
             */
            client.on('users', (users: NTalk.User[]) => {
                console.info('users', users);
                this.users = users;
            });
        },

        async reloadTalks() {
            const rows = await clientEmit<any[]>('talk.all');
            this.sourceTalks = rows.map<NTalk.Talk>((o: any) => {
                return createTalk(o);
            });
        },

        notice(message: string, option: NTalk.NoticeType | NTalk.NoticeOption) {
            const opt: NTalk.NoticeOption =
                typeof option === 'string' ? { type: option, timeout: 3000, x: 'right', y: 'top' } : option;

            this.notices.push({
                message,
                ...opt,
            });
        },

        async createSingleTalk(targetId: number) {
            const talk = await clientEmit<NTalk.Talk>('talk.create-single', targetId);
            this.sourceTalks = this.sourceTalks.filter((t) => t.type !== 'single' && t.targetId !== targetId);
            const newTalk = createTalk(talk);
            this.sourceTalks.push(newTalk);
            return newTalk;
        },

        async sendMessage(tid: number, message: string) {
            const data = {
                talkId: tid,
                message,
            };
            return await clientEmit<number>('talk.send-message', data);
        },

        async loadMessageAfterId(tid: number, mid = 0) {
            const data = {
                talkId: tid,
                messageId: mid,
            };
            const talk = this.talks.find((t) => t.id === tid);
            if (!talk) {
                throw new Error(`talk not found : ${tid}`);
            }
            const messages = await clientEmit<NTalk.TalkMessage[]>('talk.load-message.after', data);
            talk.messages = [...talk.messages, ...messages];
            return true;
        },

        async loadMessageBeforeId(tid: number, mid = 0) {
            const data = {
                talkId: tid,
                messageId: mid,
            };
            const talk = this.talks.find((t) => t.id === tid);
            if (!talk) {
                throw new Error(`talk not found : ${tid}`);
            }
            const messages = await clientEmit<NTalk.TalkMessage[]>('talk.load-message.before', data);
            talk.messages = [...messages, ...talk.messages];
            return true;
        },
    },
});
export default store;
