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
        <!-- <div class="d-flex flex-column" v-else> -->
        <v-card class="d-flex flex-column content-panel" dark height="100%" v-else>
            <div>
                <v-app-bar color="blue darken-1" dense dark>
                    <v-app-bar-nav-icon></v-app-bar-nav-icon>

                    <v-toolbar-title>Page title</v-toolbar-title>

                    <v-spacer></v-spacer>

                    <v-btn icon>
                        <v-icon>mdi-heart</v-icon>
                    </v-btn>

                    <v-btn icon>
                        <v-icon>mdi-magnify</v-icon>
                    </v-btn>

                    <v-menu left bottom>
                        <template v-slot:activator="{ on }">
                            <v-btn icon v-on="on">
                                <v-icon>mdi-dots-vertical</v-icon>
                            </v-btn>
                        </template>

                        <v-list>
                            <v-list-item v-for="n in 5" :key="n" @click="() => {}">
                                <v-list-item-title>Option {{ n }}</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </v-app-bar>
            </div>
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
            <!-- <v-card tile class="flex-grow-1 pa-2" color="grey darken-4">
                <talk-message v-for="msg in talk.messages" :key="msg.id" :data="msg"></talk-message>
                <talk-message v-for="msg in cacheMessages" :key="`c-${msg.id}`" :data="msg" unsend></talk-message>
            </v-card>-->
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
        messageHeight: number;
        noDownloadBefores: number;
        noDownloadAfters: number;
    } => ({
        input: {
            message: '',
        },
        cacheMessages: [],
        loading: false,
        messageHeight: 0,
        noDownloadBefores: 1,
        noDownloadAfters: 1,
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
    },
    watch: {
        talk: {
            immediate: true,
            handler(talk: NTalk.Talk) {
                if (!talk) {
                    return;
                }

                if (talk.id > 0) {
                    this.loadAfterMessages();
                } else {
                    this.createSingleTalk('single', talk);
                }
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
        onMessageScroll(e: any) {
            const divMessages: HTMLDivElement = e.target;

            const bottomDistance = divMessages.scrollHeight - (divMessages.scrollTop + this.messageHeight);

            if (bottomDistance < 10 && this.noDownloadAfters > 0) {
                this.loadAfterMessages();
            }

            // const
            // const e.target.scrollTop);
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
        async createSingleTalk(type: NTalk.TalkType, talk: NTalk.Talk) {
            if (this.loading) {
                return;
            }
            this.loading = true;

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
// .message-panel {
//     overflow: auto;
// }
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