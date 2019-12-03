<template>
    <v-navigation-drawer permanent dark width="100%">
        <v-card class="d-flex flex-column" height="100%" tile>
            <div>
                <v-app-bar dark>
                    <v-app-bar-nav-icon @click="showAppMenubar"></v-app-bar-nav-icon>
                    <v-text-field
                        v-model="input.search"
                        hide-details
                        append-icon="search"
                        single-line
                        placeholder="搜尋"
                    ></v-text-field>
                </v-app-bar>
            </div>
            <v-card class="group-panel overflow-y-auto overflow-x-hidden flex-grow-1">
                <v-subheader>Talk Group</v-subheader>
                <v-list two-line subheader>
                    <v-list-item-group v-model="activeIndex">
                        <v-list-item v-for="(talk, i) in talks" :key="i" link>
                            <v-list-item-avatar>
                                <v-img v-if="talk.avatar" :src="talk.avatar"></v-img>
                                <v-avatar v-else color="primary">
                                    <span
                                        class="white--text headline"
                                    >{{ textAvatar(talk.name, talk.key) }}</span>
                                </v-avatar>
                            </v-list-item-avatar>
                            <v-list-item-content>
                                <template v-slot:badge>1</template>
                                <v-list-item-title>
                                    <v-icon v-if="talk.type === 'group'">supervisor_account</v-icon>
                                    {{ talk.name }}
                                </v-list-item-title>
                                <v-list-item-subtitle
                                    v-if="talk.lastMessage"
                                    v-text="talk.lastMessage.content"
                                ></v-list-item-subtitle>
                            </v-list-item-content>
                            <v-list-item-action class="pr-2">
                                <v-badge color="cyan darken-2">
                                    <template v-slot:badge v-if="talk.unread > 0">{{ talk.unread }}</template>
                                    <v-list-item-action-text
                                        v-if="talk.lastMessage"
                                    >{{ talk.lastMessage.createdAt | dt('A HH:mm') }}</v-list-item-action-text>
                                </v-badge>
                            </v-list-item-action>
                        </v-list-item>
                    </v-list-item-group>
                </v-list>
            </v-card>
        </v-card>
        <sound-effect ref="effectMessage" :src="effects.notification01" :loop="false"></sound-effect>
        <sound-effect ref="effectUnread" :src="effects.notification02" :loop="false"></sound-effect>
    </v-navigation-drawer>
</template>
<script lang="ts">
import Vue from 'vue';
import store from '@/store';

const effects = {
    notification01: require('@/assets/sound-effect/Notification-01.wav'),
    notification02: require('@/assets/sound-effect/Notification-02.wav'),
};
namespace P {}
export default Vue.extend({
    data: () => ({
        input: {
            userName: '',
            search: '',
        },
        confirm: {
            userName: false,
        },
    }),
    computed: {
        effects() {
            return effects;
        },
        talks(): NTalk.Talk[] {
            const search = this.input.search;
            return store.talks.filter((t) => !search || t.name.indexOf(search) >= 0);
        },
        activeTKey(): number {
            return store.activeTKey;
        },
        activeTalk(): NTalk.Talk | null {
            return store.activeTalk;
        },
        activeIndex: {
            set(idx: number) {
                const talk = this.talks[idx];
                this.$nextTick(() => {
                    store.activeTKey = talk ? talk.key : -1;
                });
            },
            get(): number {
                const talks = this.talks;
                const key = store.activeTKey;
                return key ? this.talks.findIndex((t) => t.key === key) : -1;
            },
        },

        numUnreads(): number {
            const talks: NTalk.Talk[] = this.talks;
            return talks.reduce((nums, t) => t.unread + nums, 0);
        },
    },
    watch: {
        'activeTalk.lastMessage'(message: NTalk.TalkMessage, old: NTalk.TalkMessage | null) {
            const effectMessage: any = this.$refs.effectMessage;

            /**
             * 切換 activeTalk 時, 此監聽也會觸發, 所以加上 old 檢查是否保持在同一個聊天視窗內
             */
            if (old && message && old.talkId === message.talkId && message.userId !== store.user.id) {
                effectMessage.play();
            }
        },
        numUnreads(value: number, old: number) {
            const effectUnread: any = this.$refs.effectUnread;
            if (value > old) {
                effectUnread.play();
            }
        },
    },

    methods: {
        updateActiveIndex() {},

        textAvatar(name: string, talkKey = 0) {
            return store.textAvatar(name, talkKey);
        },
        showAppMenubar() {
            store.appMenubar.visible = true;
        },
    },
});
</script>
<style lang="scss" scoped>
.group-panel {
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
</style>