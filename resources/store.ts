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
        users: [],
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
        appMenubar: {
            visible: boolean;
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
        appMenubar: {
            visible: false,
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
        mapUsers() {
            const mapUsers: { [id: number]: NTalk.User } = {};
            this.users.forEach((user) => {
                mapUsers[user.id] = user;
            });
            return mapUsers;
        },
        activeTalk(): NTalk.Talk | null {
            const tkey = this.activeTKey;
            return this.talks.find((t) => t.key === tkey) || null;
        },
        talkAvatarTexts(): { key: number; name: string; ids: string[] }[] {
            const talks = store.talks;
            return talks.map(({ key, name, id, targetId }) => {
                return {
                    key,
                    name: name.toUpperCase(),
                    ids: [id.toString(), targetId.toString()],
                };
            });
        },
        numUnreads(): number {
            return this.sourceTalks.reduce((nums, talk) => nums + talk.unread, 0);
        },
    },
    watch: {
        activeTKey(tkey: number, old: number): void {
            const talk = this.sourceTalks.find((t) => t.key === old);

            // 切換群組後，只保留最後 30筆資料
            if (talk) {
                talk.messages = talk.messages.slice(-30);
            }
        },
        numUnreads(nums: number) {
            const popup = window.parent || window;
            popup.postMessage(JSON.stringify({ numUnreads: nums }), '*');
        },
    },
    methods: {
        async access(): Promise<any> {
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
        refreshApp() {
            // window.sessionStorage.setItem('sessid', this.user.sessid);
            // window.location.reload();
            this.sourceTalks = [];
            this.users = [];
            this.init();
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
            client.on('logout', () => {
                store.user.id = 0;
                store.user.name = '';
                store.user.sessid = '';
                store.user.avatar = '';
                this.users = [];
                this.sourceTalks = [];
            });

            client.on('error.message', (message: string) => {
                this.notice(message, 'error');
            });

            client.on('user.update', (user: NTalk.User) => {
                this.onUserUpdate(user);
            });

            client.on('talk.update', (data: any) => {
                this.updateTalk({ talk: data });
            });

            client.on('talk.message', (data: NTalk.TalkMessage) => {
                const talk = this.sourceTalks.find((t) => t.id === data.talkId);
                if (talk) {
                    talk.lastMessage = data;
                    talk.messages.push(data);
                    if (this.activeTalk && this.activeTalk.id === talk.id) {
                        talk.lastReadId = data.id;
                    } else {
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
                this.users = users.filter((u) => u.id !== this.user.id);
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
            store.activeTKey = 0;
        },
        textAvatar(name: string, talkKey = 0) {
            var txt = '';
            const talkTexts = this.talkAvatarTexts;
            if (!name) {
                return talkKey;
            }

            for (let i = 1; i < name.length; i++) {
                txt = name.substring(0, i).toUpperCase();
                const exists = talkTexts.some(
                    ({ key, name, ids }) => key !== talkKey && (name.startsWith(txt) || ids.indexOf(txt) >= 0),
                );
                if (!exists) {
                    break;
                }
            }
            return txt;
        },
        updateTalk(data: { key?: number; talk: NTalk.Talk }) {
            let oldtalk =
                this.sourceTalks.find((o) => {
                    return (
                        o.key === data.key ||
                        o.id === data.talk.id ||
                        (o.targetId > 0 && o.targetId === data.talk.targetId)
                    );
                }) || null;

            let target: NTalk.User | null = null;
            if (data.talk.targetId) {
                target = this.users.find((u) => u.id === data.talk.targetId) || null;
            }

            const newTalk = createTalk({
                key: (oldtalk && oldtalk.key) || 0,
                ...(oldtalk || {}),
                ...data.talk,
                name: (target && target.name) || data.talk.name,
                unread: (oldtalk && oldtalk.unread) || data.talk.unread,
            });
            if (oldtalk !== null) {
                this.sourceTalks = this.sourceTalks.filter((o) => o !== oldtalk);
            }
            this.sourceTalks.push(newTalk);
            return newTalk;
        },
        onUserUpdate(user: NTalk.User) {
            if (user.id === this.user.id) {
                this.user = { ...this.user, ...user };
            } else {
                this.users = this.users.filter((u) => u.id !== user.id);
                this.users.push({
                    ...user,
                    id: user.id,
                    online: !!user.online,
                });
                this.generateSingleTalk();
            }
        },
        /** 建立未產生對話的 user  */
        generateSingleTalk() {
            const talks = this.sourceTalks;
            this.users
                .filter((u) => u.id !== this.user.id)
                .forEach((u) => {
                    const talk = talks.find((r) => r.type === 'single' && r.targetId === u.id);
                    if (talk) {
                        talk.name = u.name;
                        return;
                    }
                    const newTalk = createTalk({
                        targetId: u.id,
                        type: 'single',
                        name: u.name,
                    });
                    talks.push(newTalk);
                });

            this.sourceTalks = talks;
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
            const talks = await clientEmit<NTalk.Talk[]>('talk.all');
            this.sourceTalks = talks.map<NTalk.Talk>((o: any) => {
                const t = createTalk({
                    ...o,
                });
                return t;
            });
            this.generateSingleTalk();
        },
        async reloadUsers() {
            const uid = this.user.id;
            const users = await clientEmit<NTalk.User[]>('users');
            this.users = users
                .filter((u) => u.id !== uid)
                .map<NTalk.User>((user) => {
                    return {
                        ...user,
                        id: user.id,
                        online: !!user.online,
                    };
                });
        },

        async createSingleTalk(targetId: number, tkey: number) {
            const talk = await clientEmit<NTalk.Talk>('talk.create-single', targetId);
            return this.updateTalk({
                key: tkey,
                talk,
            });
        },
        async saveGroupTalk(id: number, name: string, users: number[]) {
            const talk = await clientEmit<NTalk.Talk>('talk.save-group', { id, name, users });
            return this.updateTalk({ talk });
        },
        async leaveGroupTalk(tid: number) {
            const done = await clientEmit<boolean>('talk.leave', tid);
            if (done) {
                this.sourceTalks = this.sourceTalks.filter((t) => t.id !== tid);
            }
            return done;
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

            return { nums, messages };
        },
        async saveUserName(name: string) {
            const res = await clientEmit<boolean>('user.name', name);
            if (res) {
                this.user.name = name;
            }
            return res;
        },
    },
});
export default store;
