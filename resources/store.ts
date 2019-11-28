import Vue from 'vue';
import axios from 'axios';
import io from 'socket.io-client';
import helpers from '@/helpers';
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
    const lastMessage = data.last_message || data.lastMessage;
    return {
        lastMessage: lastMessage
            ? {
                  id: lastMessage.id,
                  userId: lastMessage.userId,
                  talkId: lastMessage.talkId,
                  content: lastMessage.content,
                  createdAt: lastMessage.createdAt,
                  intCreatedAt: moment(lastMessage.createdAt).valueOf(),
              }
            : null,
        id: 0,
        avatar: '',
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
        source: {
            talks: NTalk.Talk[];
            joins: NTalk.TalkJoin[];
        };
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
        source: {
            talks: [],
            joins: [],
        },
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
            return this.source.talks
                .sort((a, b) => {
                    return (
                        ((b.lastMessage && b.lastMessage.id) || b.id) - ((a.lastMessage && a.lastMessage.id) || a.id)
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

            client.on('talk.message', (data: NTalk.TalkMessage) => {
                console.info('talk.message', data);
                const talk = this.source.talks.find((t) => t.id === data.talkId);
                if (talk) {
                    talk.lastMessage = data;
                    talk.messages.push(data);
                }
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
            const { talks, joins, singleJoins } = await clientEmit<{
                talks: NTalk.Talk[];
                joins: NTalk.TalkJoin[];
                singleJoins: NTalk.SingleTalkJoin[];
            }>('talk.all');
            const rows = talks.map<NTalk.Talk>((o: any) => {
                const sjoin = singleJoins.find((sj) => sj.talkId === o.id);
                o.targetId = sjoin ? sjoin.userId : 0;
                const t = createTalk({ ...o });
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

            this.source.talks = rows;
            this.source.joins = joins;
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

        async createSingleTalk(targetId: number, tkey: number) {
            const { talk, join } = await clientEmit<{ talk: NTalk.Talk; join: NTalk.TalkJoin }>(
                'talk.create-single',
                targetId,
            );
            const newTalk = createTalk({ ...talk, targetId, messages: [] });
            this.source.talks = this.source.talks.filter((t) => t.key !== tkey);
            this.source.talks.push(newTalk);

            if (join) {
                this.source.joins = this.source.joins.filter((j) => j.talkId !== talk.id);
                this.source.joins.push(join);
            }
            return newTalk;
        },

        async sendMessage(tid: number, content: string) {
            const data = {
                talkId: tid,
                content,
            };
            return await clientEmit<number>('talk.message', data);
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
