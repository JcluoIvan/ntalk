<template>
    <!-- <div class="TalkContent-Component" > -->
    <v-card height="100%" @keydown.esc="unactiveTalk" tile>
        <v-card
            height="100%"
            color="grey darken-4"
            class="d-flex justify-center align-center"
            dark
            v-if="!talk"
        >
            <label class="blue-grey--text text--lighten-2">請選擇聊天對象，開始傳訊息</label>
        </v-card>
        <v-card class="d-flex flex-column content-panel" dark height="100%" v-else>
            <div>
                <v-app-bar color="blue-grey darken-4" dense dark>
                    <v-list-item>
                        <v-list-item-content>
                            <v-list-item-title>{{ talk.name }}</v-list-item-title>
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
                            <v-list-item @click="() => confirm.lifetime = true">
                                <v-list-item-title>設定訊息存活時間</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="() => confirm.deleteAll = true">
                                <v-list-item-title>清空記錄</v-list-item-title>
                            </v-list-item>
                            <v-divider></v-divider>
                            <v-list-item :disabled="talk.type === 'single'">
                                <v-list-item-title>離開群組</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </v-app-bar>
            </div>

            <v-overlay absolute :value="loading" opacity=".75" :z-index="100">
                <v-progress-circular indeterminate color="grey lighten-1" size="24"></v-progress-circular>
                <span>{{ loadMessage }}</span>
            </v-overlay>
            <v-card
                id="message-panel"
                ref="messages"
                color="grey darken-4"
                class="overflow-y-auto overflow-x-hidden message-panel flex-grow-1"
                v-resize="onMessageResize"
                v-scroll:#message-panel="onMessageScroll"
            >
                <transition-group name="slide-fade">
                    <talk-message v-for="msg in messages" :key="msg.id" :data="msg"></talk-message>
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
                        class="pa-1"
                        hide-details
                        :rows="lineRows"
                        dark
                        auto-grow
                        background-color="blue-grey darken-4"
                        v-model="input.message"
                        @keydown.enter.exact.prevent="sendMessage()"
                    ></v-textarea>
                </div>
                <div class="px-2">
                    <v-btn icon :disabled="!input.message" @click.prevent="sendMessage()">
                        <v-icon color="light-blue lighten-1">send</v-icon>
                    </v-btn>
                </div>
            </v-card>
        </v-card>
        <!-- </div> -->

        <v-dialog v-model="confirm.deleteAll" width="500">
            <v-card>
                <v-card-title class="headline grey lighten-2" primary-title>確認視窗</v-card-title>
                <v-card-text class="pt-4">確定要刪除此群組的所有對話內容？</v-card-text>
                <v-divider></v-divider>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn text @click="() => confirm.deleteAll = false">取消</v-btn>
                    <v-btn color="error" text @click="onDeleteAllMessage()">全部刪除</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="confirm.lifetime" width="300">
            <v-card>
                <v-card-title class="headline grey lighten-2" primary-title>變更記錄刪除時間</v-card-title>
                <v-text-field
                    suffix="分鐘"
                    :rules="[ruleLifetime]"
                    v-model="input.lifetime"
                    class="pa-4"
                    color="primary"
                    :hint="`設定上限為: ${maxLifetime} 分鐘`"
                    label="記錄刪除時間"
                ></v-text-field>
                <v-divider></v-divider>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn text @click="() => confirm.lifetime = false">取消</v-btn>
                    <v-btn color="primary" text @click="onSaveLifeTime()">儲存</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
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
        input: { message: string; lifetime: number };
        cacheMessages: NTalk.TalkMessage[];
        loading: boolean;
        loadMessage: string;
        messageHeight: number;
        noDownloadBefores: number;
        noDownloadAfters: number;
        lastReadId: number;
        confirm: {
            deleteAll: boolean;
            lifetime: boolean;
        };
    } => ({
        input: {
            message: '',
            lifetime: 0,
        },
        cacheMessages: [],
        loading: false,
        loadMessage: '',
        messageHeight: 0,
        noDownloadBefores: 1,
        noDownloadAfters: 1,
        lastReadId: 0,
        confirm: {
            deleteAll: false,
            lifetime: false,
        },
    }),
    computed: {
        talk(): NTalk.Talk | null {
            return store.activeTalk;
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
    },
    watch: {
        talk: {
            immediate: true,
            handler(talk: NTalk.Talk) {
                if (!talk) {
                    return;
                }

                if (talk.id > 0) {
                    talk.unread = 0;
                    this.lastReadId = talk.lastReadId;
                    this.loadAfterMessages();
                } else {
                    this.createSingleTalk('single', talk);
                }
            },
        },
        'talk.lifetime': {
            immediate: true,
            handler(value: number) {
                this.input.lifetime = Number(value);
            },
        },
    },
    mounted() {
        (window as any).content = this;
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
        onMessageScroll(e: any) {
            const divMessages: HTMLDivElement = e.target;

            const bottomDistance = divMessages.scrollHeight - (divMessages.scrollTop + this.messageHeight);

            if (bottomDistance < 10 && this.noDownloadAfters > 0) {
                this.loadAfterMessages();
            }
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
        ruleLifetime(value: string | number) {
            const maxLifetime = this.maxLifetime;
            return Number(value) <= maxLifetime || `不得大於 ${maxLifetime}`;
        },
        async onDeleteAllMessage() {
            if (!this.talk) {
                return;
            }
            if (this.loading) {
                return;
            }
            this.loading = true;
            this.loadMessage = '刪除記錄中 ... ';
            this.confirm.deleteAll = false;
            await store.deleteAllMessage(this.talk.id);
            this.loading = false;
        },
        async onSaveLifeTime() {
            if (!this.talk) {
                return;
            }
            if (this.ruleLifetime(this.input.lifetime) !== true) {
                return;
            }
            if (this.loading) {
                return;
            }
            this.loading = true;
            this.loadMessage = '變更記錄刪除時間 ... ';
            this.confirm.lifetime = false;
            await store.changeTalkLifetime(this.talk.id, this.input.lifetime);
            this.loading = false;
        },

        async createSingleTalk(type: NTalk.TalkType, talk: NTalk.Talk) {
            if (this.loading) {
                return;
            }
            this.loading = true;
            this.loadMessage = '建立對話中 ... ';
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
            const id = talk.messages.reduce((min, m) => Math.min(min, m.id), 0);
            if (this.loading) {
                return;
            }
            const { nums } = await store.loadMessageBefore(talk.id, id);
            this.noDownloadBefores = nums;
        },
        async loadAfterMessages() {
            const talk = this.talk;
            if (!talk || talk.id === 0) {
                return;
            }
            const id = talk.messages.reduce((max, m) => Math.max(max, m.id), 0);
            if (this.loading) {
                return;
            }
            const { nums } = await store.loadMessageAfter(talk.id, id);
            this.noDownloadAfters = nums;

            const $messages: any = this.$refs.messages;
            const divMessages: HTMLDivElement = ($messages && $messages.$el) || null;
            this.$nextTick(() => {
                divMessages.scrollTop = divMessages.scrollHeight;
            });
        },
    },
});
</script>

<style lang="scss">
#message-panel {
    /* width */
    &::-webkit-scrollbar {
        width: 5px;
    }

    /* Track */
    &::-webkit-scrollbar-track {
        background: #333;
    }

    /* Handle */
    &::-webkit-scrollbar-thumb {
        background: #777;
    }

    /* Handle on hover */
    &::-webkit-scrollbar-thumb:hover {
        background: #999;
    }
}
/* 可以设置不同的进入和离开动画 */
/* 设置持续时间和动画函数 */
.slide-fade-enter-active {
    transition: all 0.3s ease;
}
.slide-fade-leave-active {
    transition: all 0.8s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter, .slide-fade-leave-to
/* .slide-fade-leave-active for below version 2.1.8 */ {
    transform: translateX(10px);
    opacity: 0;
}
</style>