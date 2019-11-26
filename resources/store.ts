import Vue from 'vue';
import axios from 'axios';
import io from 'socket.io-client';
import helpers from '@/helpers';

export enum SocketStatus {
    Connected = 'connected',
    Reconnecting = 'reconnecting',
    Disconnected = 'disconnected',
}

let client: SocketIOClient.Socket = io('/', {
    autoConnect: false,
});
(window as any).c = client;

const store = new Vue({
    data: (): {
        user: NTalk.UserSelf;
        users: NTalk.User[];
        sourceTalks: NTalk.Talk[];
        activeTalkId: number;
        socket: {
            errorMessage: string;
            status: SocketStatus;
        };
    } => ({
        user: {
            id: 0,
            sessid: '',
            name: '',
            image: '',
            online: false,
        },
        users: [],
        sourceTalks: [],
        activeTalkId: 0,
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
            const users = this.users;
            const talks: NTalk.Talk[] = this.users.map<NTalk.Talk>((u) => {
                const talk = sources.find((t) => t.type === 'single' && t.targetId === u.id) || {};
                return {
                    id: u.id,
                    type: 'single',
                    name: u.name,
                    image: u.image,
                    unread: 0,
                    targetId: u.id,
                    lastMessage: null,
                    lastReadId: 0,
                    createdAt: '',
                    ...talk,
                };
            });

            sources.filter((t) => t.type === 'group').forEach((t) => talks.push(t));
            return talks.sort((a, b) => {
                return ((a.lastMessage && a.lastMessage.id) || a.id) - ((b.lastMessage && b.lastMessage.id) || b.id);
            });
        },
        activeTalk(): NTalk.Talk | null {
            const activeId = this.activeTalkId;
            return this.talks.find((t) => t.id === activeId) || null;
        },
    },
    created() {},
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
                    image: string;
                }>('/access', data)
                .then((res) => {
                    this.user.sessid = res.data.sessid;
                    this.user.id = res.data.id;
                    this.user.name = res.data.name;
                    this.user.image = res.data.image;
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

        reloadTalks() {
            client.emit('reload.talks', null, (res: any[]) => {
                this.sourceTalks = res.map<NTalk.Talk>((o: any) => {
                    return {
                        id: o.id,
                        type: o.type,
                        name: o.name,
                        image: o.image,
                        unread: o.unread,
                        targetId: o.target_id || 0,
                        lastMessage: o.last_message
                            ? {
                                  id: o.last_message.id,
                                  userId: o.last_message.user_id,
                                  talkId: o.last_message.talk_id,
                                  content: o.last_message.content,
                                  createdAt: o.last_message.created_at,
                              }
                            : null,
                        lastReadId: o.last_read_id,
                        createdAt: o.created_at,
                    };
                });
            });
        },
    },
});
export default store;
