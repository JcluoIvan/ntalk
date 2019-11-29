import Vue from 'vue';
import axios, { AxiosResponse } from 'axios';
import io from 'socket.io-client';
import { resolve } from 'dns';
import moment from 'moment';

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
    console.info('emit > ', event, data);
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
    return {
        lastMessage: data.lastMessage || null,
        unread: 0,
        lastReadId: 0,
        id: 0,
        avatar: '',
        lifetime: 0,
        createdAt: '',
        name: '',
        type: 'single',
        messages: [],
        targetId: 0,
        ...data,
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
        config: NTalk.SystemConfig;
        socket: {
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
        config: {
            maxLifetime: 0,
        },
        notices: [],
        users: [],
        sourceTalks: [],
        activeTKey: 0,
        socket: {
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
            return this.sourceTalks
                .sort((a, b) => {
                    return (
                        ((b.lastMessage && b.lastMessage.id) || 0) - ((a.lastMessage && a.lastMessage.id) || 0) ||
                        b.key - a.key
                    );
                })
                .slice();
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
                this.init();
            });
            client.on('reconnect_attempt', () => {
                this.socket.status = SocketStatus.Reconnecting;
                console.warn('RECONNECTING');
            });
            client.on('error', (message: string) => {
                this.notice(message, 'error');
            });

            client.on('disconnect', () => {
                this.socket.status = SocketStatus.Disconnected;
                console.error('disconnect');
            });

            client.on('error.message', (message: string) => {
                this.notice(message, 'error');
            });

            client.on('talk.update', (data: any) => {
                this.updateTalk(data);
            });

            client.on('talk.message', (data: NTalk.TalkMessage) => {
                const talk = this.sourceTalks.find((t) => t.id === data.talkId);
                if (talk) {
                    talk.lastMessage = data;
                    talk.messages.push(data);
                    if (!this.activeTalk || this.activeTalk.id !== talk.id) {
                        talk.unread += 1;
                    }
                }
            });

            client.on('talk.message.delete-less', (data: { talkId: number; messageId: number }) => {
                const talk = this.sourceTalks.find((t) => t.id === data.talkId);
                if (talk) {
                    talk.messages = talk.messages.filter((m) => m.id >= data.messageId);
                }
            });

            client.on('talk.message.delete-all', (data: { talkId: number }) => {
                const talk = this.sourceTalks.find((t) => t.id === data.talkId);
                if (talk) {
                    talk.messages = [];
                    talk.unread = 0;
                    talk.lastMessage = null;
                }
            });
            client.on('talk.lifetime', (data: { talkId: number; lifetime: number }) => {
                const talk = this.sourceTalks.find((t) => t.id === data.talkId);
                if (talk) {
                    talk.lifetime = data.lifetime;
                }
            });

            /**
             * 更新成員
             */
            client.on('users', (users: NTalk.User[]) => {
                this.users = users;
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
        unActiveTKey() {
            store.activeTKey = -1;
        },
        async init() {
            await this.reloadConfig();
            await this.reloadUsers();
            await this.reloadTalks();
        },
        async reloadConfig() {
            this.config = await clientEmit<NTalk.SystemConfig>('config');
        },
        async reloadTalks() {
            const { talks, joins, targetJoins } = await clientEmit<{
                talks: NTalk.Talk[];
                joins: NTalk.TalkJoin[];
                targetJoins: NTalk.TalkTargetJoin[];
            }>('talk.all');
            const rows = talks.map<NTalk.Talk>((o: any) => {
                const sjoin = targetJoins.find((sj) => sj.talkId === o.id);
                const { unread, lastReadId } = joins.find((j) => j.talkId === o.id) || { unread: 0, lastReadId: 0 };
                o.targetId = sjoin ? sjoin.userId : 0;
                const t = createTalk({
                    unread,
                    lastReadId,
                    ...o,
                });
                return t;
            });

            this.users
                .filter((u) => u.id !== this.user.id)
                .forEach((u) => {
                    const talk = rows.find((r) => r.type === 'single' && r.targetId === u.id);
                    if (talk) {
                        talk.name = u.name;
                        return;
                    }
                    const newTalk = createTalk({
                        targetId: u.id,
                        type: 'single',
                        name: u.name,
                    });
                    rows.push(newTalk);
                });

            this.sourceTalks = rows;
        },
        async reloadUsers() {
            const users = await clientEmit<NTalk.User[]>('users');
            this.users = users;
        },

        async createSingleTalk(targetId: number, tkey: number) {
            const { talk, join } = await clientEmit<{ talk: NTalk.Talk; join: NTalk.TalkJoin }>(
                'talk.create-single',
                targetId,
            );
            return this.updateTalk({
                key: tkey,
                talk,
                join,
                targetJoin: {
                    talkId: talk.id,
                    userId: targetId,
                },
            });
        },

        async updateTalk(data: {
            key: number;
            talk: NTalk.Talk;
            join: NTalk.TalkJoin;
            targetJoin?: NTalk.TalkTargetJoin;
        }) {
            console.warn(data);
            const targetId = data.talk.type === 'single' && data.targetJoin ? data.targetJoin.userId : 0;
            const target = this.users.find((u) => u.id === targetId);

            const oldTalk = targetId
                ? this.sourceTalks.find((t) => t.targetId === targetId)
                : this.sourceTalks.find((t) => t.key === data.key);
            const oldKey = (oldTalk && oldTalk.key) || 0;

            const newTalk = createTalk({
                key: data.key || oldKey,
                ...data.talk,
                name: target ? target.name : data.talk.name,
                unread: data.join.unread,
                lastReadId: data.join.lastReadId,
                targetId,
                messages: [],
            });
            if (oldKey) {
                this.sourceTalks = this.sourceTalks.filter((t) => t.key !== oldKey);
            }
            this.sourceTalks.push(newTalk);
            return newTalk;
        },

        async sendMessage(tid: number, content: string) {
            const data = {
                talkId: tid,
                content,
            };
            return await clientEmit<number>('talk.message', data);
        },

        async setTalkMessageExpire(tid: number, lifetime: number) {},

        async deleteAllMessage(tid: number) {
            return await clientEmit<boolean>('talk.message.delete-all', tid);
        },
        async changeTalkLifetime(tid: number, lifetime: number) {
            return await clientEmit<boolean>('talk.lifetime', { talkId: tid, lifetime });
        },
        async loadMessageBefore(tid: number, mid = 0) {
            const data = {
                talkId: tid,
                messageId: mid,
            };
            const talk = this.talks.find((t) => t.id === tid);
            if (!talk) {
                throw new Error(`talk not found : ${tid}`);
            }
            const { nums, messages } = await clientEmit<{ nums: number; messages: NTalk.TalkMessage[] }>(
                'talk.load-message.before',
                data,
            );
            talk.messages = [...messages, ...talk.messages].slice();
            talk.messages = talk.messages.sort((a, b) => a.id - b.id);
            return { nums, messages };
        },

        async loadMessageAfter(tid: number, mid = 0) {
            const data = {
                talkId: tid,
                messageId: mid,
            };
            const talk = this.talks.find((t) => t.id === tid);
            if (!talk) {
                throw new Error(`talk not found : ${tid}`);
            }
            const { nums, messages } = await clientEmit<{ nums: number; messages: NTalk.TalkMessage[] }>(
                'talk.load-message.after',
                data,
            );
            talk.messages = [...talk.messages, ...messages];
            talk.messages = talk.messages.sort((a, b) => a.id - b.id);

            // 只保留 30筆
            const numMessages = talk.messages.length;
            const max = Math.max(30, talk.messages.length);
            talk.messages = talk.messages.slice(numMessages - max);

            return { nums, messages };
        },
    },
});
(window as any).store = store;
export default store;
