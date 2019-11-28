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
        <v-card class="d-flex flex-column" color="grey darken-4" dark height="100%" v-else>
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
            <v-card tile class="flex-grow-1 pa-2" color="grey darken-4">
                <message v-for="msg in talk.messages" :key="msg" :data="msg"></message>
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
    </v-card>
</template>
<script lang="ts">
import Vue from 'vue';
import store from '../store';
export default Vue.extend({
    name: 'TalkContent',
    data: (): {
        input: { message: string };
        cacheMessages: NTalk.TalkMessage[];
        loading: boolean;
    } => ({
        input: {
            message: '',
        },
        cacheMessages: [],
        loading: false,
    }),

    computed: {
        talk() {
            return store.activeTalk;
        },
        lineRows() {
            return this.input.message.split('\n').length;
        },
    },
    watch: {
        talk: {
            immediate: true,
            handler(talk: NTalk.Talk) {
                console.info(talk);
                if (talk && !talk.id) {
                    this.createSingleTalk('single', talk.targetId);
                }
            },
        },
    },
    mounted() {
        const onKeydownEsc = this.onKeydownEsc.bind(this);
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
            store.activeTKey = 0;
        },
        async createSingleTalk(type: NTalk.TalkType, targetId: number) {
            if (this.loading) {
                return;
            }
            this.loading = true;

            return store
                .createSingleTalk(targetId)
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
            if (this.talk) {
                const id = await store.sendMessage(this.talk.id, this.input.message);
                this.input.message = '';
            }
        },
    },
});
</script>

<style lang="scss" scoped>
@import '@/scss/colors.scss';

.TalkContent-Component {
    position: relative;
    width: 100%;
    height: 100%;
    background: color(bg-dark-color);
    overflow: hidden;
    .content-panel {
        position: relative;
        width: 100%;
        height: 100%;
    }

    .empty-talk {
        position: relative;
        color: color(sub-text-color);
        text-align: center;
        top: 50%;
        transform: translateY(-50%);
    }
}
</style>