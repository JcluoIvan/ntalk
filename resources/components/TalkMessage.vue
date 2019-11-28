<template>
    <div class="d-flex pa-2" :class="{'justify-end': isSelf}">
        <v-card class="d-inline-flex" max-width="75%">
            <v-list class="px-4 py-1" dark>
                <v-list-item-content>
                    <v-list-item-title>
                        <div class="message-content" v-text="message.content"></div>
                    </v-list-item-title>
                    <v-list-item-subtitle class="text-right pt-2">
                        <v-icon v-if="unsend">watch_later</v-icon>
                        <label v-else class="blue-grey--text text--lighten-3">{{ message.createdAt | dt('HH:mm:ss')}}</label>
                    </v-list-item-subtitle>
                </v-list-item-content>
            </v-list>
        </v-card>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import store from '../store';
export default Vue.extend({
    props: {
        unsend: Boolean,
        data: Object,
    },
    computed: {
        message(): NTalk.TalkMessage {
            return this.data as any;
        },
        isSelf() {
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
    transition: all 0.8s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter, .slide-fade-leave-to
/* .slide-fade-leave-active for below version 2.1.8 */ {
    transform: translateX(10px);
    opacity: 0;
}
</style>
