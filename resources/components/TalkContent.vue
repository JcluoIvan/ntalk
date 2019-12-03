<template>
    <!-- <div class="TalkContent-Component" > -->
    <v-card height="100%" @keydown.esc="unactiveTalk" tile>
        <v-card
            height="100%"
            color="grey darken-4"
            class="d-flex justify-center align-center"
            dark
            tile
            v-if="!talk"
        >
            <label class="blue-grey--text text--lighten-2">請選擇聊天對象，開始傳訊息</label>
        </v-card>
        <v-card class="d-flex flex-column content-panel" tile dark height="100%" v-else>
            <div>
                <v-app-bar color="blue-grey darken-4" dense dark>
                    <v-btn icon @click="backToSidebar" class="hidden-sm-and-up">
                        <v-badge>
                            <template v-slot:badge v-if="numUnreads > 0">{{ numUnreads }}</template>
                            <v-icon>chevron_left</v-icon>
                        </v-badge>
                    </v-btn>
                    <!-- <v-app-bar-nav-icon @click="showAppMenubar"></v-app-bar-nav-icon> -->

                    <v-list-item>
                        <v-list-item-content>
                            <v-list-item-title>
                                {{ talk.name }}
                                <v-menu open-on-hover offset-y v-if="talk.type === 'group'">
                                    <template v-slot:activator="{ on }">
                                        <v-chip class="ml-4" small v-on="on">
                                            <v-icon>supervisor_account</v-icon>
                                            {{ talk.users.length }}
                                        </v-chip>
                                    </template>
                                    <v-list dense>
                                        <v-list-item
                                            class="px-4"
                                            v-for="(uname, i) in talkUserNames"
                                            :key="i"
                                            @click.prevent
                                        >
                                            <v-list-item-title>{{ uname }}</v-list-item-title>
                                        </v-list-item>
                                    </v-list>
                                </v-menu>
                            </v-list-item-title>
                            <v-list-item-subtitle>{{ lifetimeText(talk.lifetime) }}</v-list-item-subtitle>
                        </v-list-item-content>
                    </v-list-item>
                    <v-spacer></v-spacer>
                    <v-menu offset-y>
                        <template v-slot:activator="{ on }">
                            <v-btn icon v-on="on">
                                <v-icon>more_vert</v-icon>
                            </v-btn>
                        </template>

                        <v-list dense>
                            <v-list-item @click="() => editLifetimeDialog.visible = true">
                                <v-list-item-title>設定訊息存活時間</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="onDeleteAllMessage">
                                <v-list-item-title>清空記錄</v-list-item-title>
                            </v-list-item>
                            <v-divider></v-divider>
                            <v-list-item @click="editGroupTalk" :disabled="talk.type === 'single'">
                                <v-list-item-title>修改群組</v-list-item-title>
                            </v-list-item>

                            <v-list-item @click="leaveGroupTalk" :disabled="talk.type === 'single'">
                                <v-list-item-title>離開群組</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </v-app-bar>
            </div>

            <v-overlay absolute :value="loading" opacity=".75" :z-index="100">
                <v-progress-circular indeterminate color="grey lighten-1" size="24"></v-progress-circular>
                <span>{{ loadContent }}</span>
            </v-overlay>
            <v-card
                id="message-panel"
                ref="messages"
                color="grey darken-4"
                class="overflow-y-auto overflow-x-hidden custom-scrollbar flex-grow-1"
                v-resize="onMessageResize"
                v-scroll:#message-panel="onMessageScroll"
            >
                <transition-group name="slide-x-fade">
                    <talk-message
                        v-for="msg in messages"
                        :last-read-id="lastReadId"
                        :key="msg.id"
                        :data="msg"
                    ></talk-message>
                </transition-group>
                <talk-message v-for="msg in cacheMessages" :key="`c-${msg.id}`" :data="msg" unsend></talk-message>
            </v-card>
            <v-card tile class="d-flex align-end pb-1" color="blue-grey darken-4">
                <div class="px-2">
                    <v-btn icon>
                        <v-icon color="light-blue lighten-1">attach_file</v-icon>
                    </v-btn>
                </div>
                <div class="flex-grow-1">
                    <v-textarea
                        ref="inputMessage"
                        class="pa-1"
                        hide-details
                        :rows="lineRows"
                        dark
                        auto-grow
                        background-color="blue-grey darken-4"
                        v-model="input.message"
                        @keydown.enter.exact.prevent="sendMessage()"
                        autofocus
                    ></v-textarea>
                </div>
                <div class="px-2">
                    <v-btn icon :disabled="!input.message" @click.prevent="sendMessage()">
                        <v-icon color="light-blue lighten-1">send</v-icon>
                    </v-btn>
                </div>
            </v-card>
        </v-card>
        <confirm-dialog ref="confirm" width="300px"></confirm-dialog>
        <v-dialog v-model="editLifetimeDialog.visible" width="300">
            <v-form @submit.prevent="onSaveLifetime" v-model="editLifetimeDialog.input.verify">
                <v-card>
                    <v-card-title class="headline grey lighten-2" primary-title>變更記錄刪除時間</v-card-title>
                    <v-text-field
                        suffix="分鐘"
                        :rules="[valids.lifetimeLimit]"
                        v-model="editLifetimeDialog.input.lifetime"
                        class="pa-4"
                        color="primary"
                        :hint="`設定上限為: ${maxLifetime} 分鐘`"
                        label="記錄刪除時間"
                        autofocus
                        @focus="(e) => e.target.select()"
                    ></v-text-field>
                    <v-divider></v-divider>
                    <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn text @click="() => editLifetimeDialog.visible = false">取消</v-btn>
                        <v-btn type="submit" color="primary">儲存</v-btn>
                    </v-card-actions>
                </v-card>
            </v-form>
        </v-dialog>
        <group-talk-dialog ref="talkDialog" @saved="() => visible = false"></group-talk-dialog>
    </v-card>
</template>
<script lang="ts">
import Vue from 'vue';
import store from '../store';
import moment from 'moment';

namespace P {
    export interface CacheMessage {
        id: number;
        content: string;
    }
}
let autoincrement = 0;

export default Vue.extend({
    name: 'TalkContent',
    data: (): {
        input: { message: string };
        cacheMessages: NTalk.TalkMessage[];
        loading: boolean;
        loadContent: string;
        messageHeight: number;
        lastReadId: number;
        loadMessage: {
            numBefores: number;
            numAfters: number;
            beforeLoading: boolean;
            afterLoading: boolean;
        };
        editLifetimeDialog: {
            visible: boolean;
            input: {
                verify: boolean;
                lifetime: number;
            };
        };
        isBottom: boolean;
    } => ({
        input: {
            message: '',
        },
        cacheMessages: [],
        loading: false,
        loadContent: '',
        messageHeight: 0,
        loadMessage: {
            numBefores: 1,
            numAfters: 1,
            beforeLoading: false,
            afterLoading: false,
        },
        lastReadId: 0,
        editLifetimeDialog: {
            visible: false,
            input: {
                verify: false,
                lifetime: 0,
            },
        },
        isBottom: true,
    }),
    computed: {
        talk(): NTalk.Talk | null {
            return store.activeTalk;
        },
        valids() {
            const maxLifetime = this.maxLifetime;
            return {
                lifetimeLimit: (value: string | number) => Number(value) <= maxLifetime || `不得大於 ${maxLifetime}`,
            };
        },
        lineRows(): number {
            return this.input.message.split('\n').length;
        },
        messages(): NTalk.TalkMessage[] {
            const talk = store.activeTalk;
            return talk ? talk.messages : [];
        },
        maxLifetime() {
            return store.config.maxLifetime;
        },
        talkUserNames(): string[] {
            const names = [store.user.name];
            const users = this.talk ? this.talk.users : [];
            const mapUsers = store.mapUsers;
            users.forEach((uid) => {
                const user = mapUsers[uid];
                if (user) {
                    names.push(user.name);
                }
            });
            return names;
        },
        numUnreads() {
            return store.numUnreads;
        },
    },
    watch: {
        talk: {
            immediate: true,
            handler(talk: NTalk.Talk, old: NTalk.Talk) {
                this.$nextTick(() => {
                    const inputMessage = (this.$refs as any).inputMessage;
                    if (inputMessage && inputMessage.$refs.input) {
                        inputMessage.$refs.input.select();
                    }
                });

                if (!talk || talk === old) {
                    return;
                }

                const lastMessage = talk.lastMessage;
                this.loadMessage.numBefores = 1;
                this.loadMessage.numAfters = 1;

                if (talk.id === 0) {
                    this.createSingleTalk('single', talk);
                    return;
                }

                talk.unread = 0;

                // 將上次已讀的最後一筆記錄下來
                this.lastReadId = !lastMessage || lastMessage.id !== talk.lastReadId ? talk.lastReadId : 0;

                // 更新已讀的最後一筆的資料
                talk.lastReadId = lastMessage ? lastMessage.id : talk.lastReadId;

                // 資料不滿 30筆時拉資料
                if (talk.messages.length < 30) {
                    this.loadAfterMessages();
                    return;
                }

                // 避免自動載入
                this.loadMessage.beforeLoading = true;
                this.loadMessage.afterLoading = true;

                // 跳至未讀的訊息位置
                this.$nextTick(() => {
                    const messageDiv: HTMLDivElement = (this.$refs.messages as any).$el;
                    const lastDiv: HTMLDivElement = document.querySelector(`#message-${this.lastReadId}`) as any;

                    if (lastDiv) {
                        messageDiv.scrollTop = lastDiv.getBoundingClientRect().top;
                    } else {
                        messageDiv.scrollTop = messageDiv.scrollHeight;
                    }
                    // 避免自動載入
                    this.loadMessage.beforeLoading = false;
                    this.loadMessage.afterLoading = false;
                    this.onMessageScroll();
                });
            },
        },
        'talk.lifetime': {
            immediate: true,
            handler(value: number) {
                this.editLifetimeDialog.input.lifetime = Number(value);
            },
        },
        'talk.lastMessage'(message: NTalk.TalkMessage | null, old: NTalk.TalkMessage | null) {
            console.info(this.isBottom, message, old);
            // 僅處理同群組有新訊息的變化，其他都不處理
            if (!message || !old || message.talkId !== old.talkId) {
                return;
            }
            const divMessages: HTMLDivElement = (this.$refs.messages as any).$el;

            if (this.isBottom) {
                this.messageScrollTo(divMessages.scrollHeight);
            }
        },
    },
    mounted() {
        const onKeydownEsc = this.onKeydownEsc.bind(this);
        this.onMessageResize();
        this.loadAfterMessages();
        window.addEventListener('keydown', onKeydownEsc);
        this.$on('beforeDestroy', () => {
            window.removeEventListener('keydown', onKeydownEsc);
        });
    },
    beforeDestroy() {
        this.$emit('beforeDestroy');
    },
    methods: {
        onKeydownEsc(event: KeyboardEvent) {
            if (event.keyCode !== 27) {
                return;
            }
            store.unActiveTKey();
        },
        backToSidebar() {
            store.unActiveTKey();
        },
        lifetimeText(lifetime: number) {
            const hours = Math.floor(lifetime / 60);
            const minutes = lifetime % 60;
            const texts: string[] = ['訊息存活時間: '];
            if (hours) {
                texts.push(`${hours}小時`);
            }
            if (minutes) {
                texts.push(`${minutes}分`);
            }
            return texts.join(' ');
        },
        onMessageScroll() {
            const divMessages: HTMLDivElement = (this.$refs.messages as any).$el;

            const bottomDistance = divMessages.scrollHeight - (divMessages.scrollTop + this.messageHeight);
            this.isBottom = bottomDistance < 10;
            if (this.isBottom && this.loadMessage.numAfters > 0) {
                this.isBottom = true;
                this.loadAfterMessages();
            } else if (this.loadMessage.numBefores > 0 && divMessages.scrollTop < 10) {
                this.loadBeforeMessages();
            }
        },
        messageScrollTo(top: number, nextTick = true) {
            const divMessages: HTMLDivElement = (this.$refs.messages as any).$el;
            if (nextTick) {
                this.$nextTick(() => {
                    divMessages.scrollTop = top;
                });
                return;
            }
            divMessages.scrollTop = top;
        },
        onMessageResize() {
            const $messages: any = this.$refs.messages;
            const divMessages: HTMLDivElement = ($messages && $messages.$el) || null;
            if (divMessages) {
                const { height } = divMessages.getBoundingClientRect();
                this.messageHeight = height;
                console.info(height);
            }
        },
        editGroupTalk() {
            const dialog: any = this.$refs.talkDialog;
            const talk = this.talk;
            if (talk && talk.type === 'group') {
                dialog.editTalk(talk.id);
            }
        },
        async onDeleteAllMessage() {
            const confirm: any = this.$refs.confirm;
            confirm
                .open('確定要刪除此群組的所有對話內容？')
                .then(async () => {
                    if (!this.talk) {
                        return;
                    }
                    if (this.loading) {
                        return;
                    }
                    this.loading = true;
                    this.loadContent = '刪除記錄中 ... ';
                    await store.deleteAllMessage(this.talk.id);
                    this.loading = false;
                })
                .catch(() => {
                    // reject
                });
        },

        async onSaveLifetime() {
            console.info(this.editLifetimeDialog.input.verify);
            if (!this.talk) {
                return;
            }
            if (!this.editLifetimeDialog.input.verify) {
                return;
            }
            if (this.loading) {
                return;
            }
            this.loading = true;
            this.loadContent = '變更記錄刪除時間 ... ';
            await store.changeTalkLifetime(this.talk.id, this.editLifetimeDialog.input.lifetime);
            this.editLifetimeDialog.visible = false;
            this.loading = false;
        },

        async createSingleTalk(type: NTalk.TalkType, talk: NTalk.Talk) {
            if (this.loading) {
                return;
            }
            this.loading = true;
            this.loadContent = '建立對話中 ... ';
            return store
                .createSingleTalk(talk.targetId, talk.key)
                .then((res) => {
                    console.info('tkey =>', res.key);
                    store.activeTKey = res.key;
                })
                .catch(() => {
                    store.activeTKey = 0;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        async leaveGroupTalk() {
            if (this.loading) {
                return;
            }
            if (!this.talk || this.talk.type !== 'group') {
                return;
            }
            this.loading = true;
            this.loadContent = '離開群組 ... ';
            const done = await store.leaveGroupTalk(this.talk.id);
            this.loading = false;
            if (done) {
                store.activeTKey = 0;
            }
        },
        async sendMessage() {
            const talk = this.talk;
            if (talk && this.input.message) {
                const message = this.input.message;
                const now = moment();
                const cmid = ++autoincrement;
                this.input.message = '';
                const timer = window.setTimeout(() => {
                    this.cacheMessages.push({
                        id: cmid,
                        userId: store.user.id,
                        talkId: talk.id,
                        createdAt: now.format('YYYY-MM-DD HH:mm:ss'),
                        content: message,
                    });
                }, 500);

                const id = await store.sendMessage(talk.id, message);
                window.clearTimeout(timer);
                this.cacheMessages = this.cacheMessages.filter((cm) => cm.id !== cmid);
            }
        },
        async loadBeforeMessages() {
            const talk = this.talk;
            if (!talk || talk.id === 0) {
                return;
            }
            const def = talk.messages.length ? talk.messages[0].id : 0;

            const id = talk.messages.reduce((min, m) => Math.min(min, m.id), def);
            if (this.loadMessage.beforeLoading) {
                return;
            }
            const divMessages: HTMLDivElement = (this.$refs.messages as any).$el;
            const scrollHeight = divMessages.scrollHeight;

            this.loadMessage.beforeLoading = true;
            const { nums } = await store.loadMessageBefore(talk.id, id);
            this.loadMessage.numBefores = nums;
            this.loadMessage.beforeLoading = false;

            this.$nextTick(() => {
                this.messageScrollTo(divMessages.scrollHeight - scrollHeight);
            });
        },
        async loadAfterMessages() {
            const talk = this.talk;
            console.warn('after');
            if (!talk || talk.id === 0) {
                return;
            }
            const id = talk.messages.reduce((max, m) => Math.max(max, m.id), 0);
            if (this.loadMessage.afterLoading) {
                return;
            }
            this.loadMessage.afterLoading = true;
            const { nums } = await store.loadMessageAfter(talk.id, id);
            this.loadMessage.numAfters = nums;

            const $messages: any = this.$refs.messages;
            const divMessages: HTMLDivElement = ($messages && $messages.$el) || null;
            this.loadMessage.afterLoading = false;
            this.$nextTick(() => {
                this.messageScrollTo(divMessages.scrollHeight);
            });
        },
    },
});
</script>
<style lang="scss" scoped>
#message-panel {
    position: relative;
}
</style>