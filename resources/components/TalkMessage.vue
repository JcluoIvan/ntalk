<template>
    <div :id="`message-${message.id}`">
        <div class="d-flex pa-2" :class="className">
            <v-card class="d-inline-flex" max-width="75%" v-if="message.userId">
                <v-list class="px-4 py-1" dark :class="messageClass">
                    <v-list-item-content>
                        <v-list-item-title>
                            <div class="message-content" v-text="message.content"></div>
                        </v-list-item-title>
                        <v-list-item-subtitle class="text-right pt-2">
                            <v-icon v-if="unsend">watch_later</v-icon>

                            <div
                                v-else-if="isSelf"
                                class="created-at blue-grey--text text--lighten-3"
                            >
                                <span>{{ message.createdAt | dt('A HH:mm')}}</span>
                            </div>
                            <div v-else class="created-at blue-grey--text text--lighten-3">
                                <span>{{ user.name }}</span>
                                <span>-</span>
                                <span>{{ message.createdAt | dt('A HH:mm')}}</span>
                            </div>
                        </v-list-item-subtitle>
                    </v-list-item-content>
                </v-list>
            </v-card>

            <v-card v-else class="system-message text-center flex-grow-1">
                {{ message.content }} -
                {{ message.createdAt | dt('A HH:mm')}}
            </v-card>
        </div>
        <v-card v-if="message.id === lastReadId" class="text-center ma-2">以下未讀訊息</v-card>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import store from '../store';
export default Vue.extend({
    props: {
        unsend: Boolean,
        data: Object,
        lastReadId: Number,
    },
    computed: {
        message(): NTalk.TalkMessage {
            return this.data as any;
        },
        user(): NTalk.User {
            return (
                store.mapUsers[this.message.userId] || {
                    id: 0,
                    name: 'unknown',
                    avatar: '',
                }
            );
        },
        className(): any {
            return {
                'justify-end': this.isSelf,
            };
        },
        messageClass(): any {
            return {
                'grey darken-2': !this.isSelf,
            };
        },
        isSelf(): boolean {
            const message: NTalk.TalkMessage = this.message as any;
            return store.user.id === message.userId;
        },
    },
});
</script>
<style lang="scss" scoped>
.message-content {
    min-width: 60%;
    max-width: 75%;
    unicode-bidi: embed;
    font-family: 'Microsoft JhengHei';
    white-space: pre-wrap;
    word-break: break-all;
}

.created-at {
    font-family: monospace;
}
.system-message {
    font-style: italic;
}
</style>


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
    display: none;
    transition: none;
    // transition: all 0s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter, .slide-fade-leave-to
/* .slide-fade-leave-active for below version 2.1.8 */ {
    transform: translateX(10px);
    opacity: 0;
}
</style>
