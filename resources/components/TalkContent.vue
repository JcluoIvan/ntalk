<template>
    <div class="TalkContent-Component" @keydown.esc="unactiveTalk">
        <div class="empty-talk flex-grow-1" v-if="!talk">請選擇聊天對象，開始傳訊息</div>
        <div class="content-panel d-flex flex-column" v-else>
            <div class="content-navbar row no-gutters">
                <div class="col-auto talk-name-panel">
                    <p>{{ talk.name }}</p>
                    <small>其他資訊</small>
                </div>
                <div class="col"></div>
            </div>
            <div class="message-content flex-grow-1">
                <message></message>
            </div>
            <div class="footer-options row no-gutters">
                <div class="col-auto">
                    <i class="material-icons file-btn">attach_file</i>
                </div>
                <div class="col">
                    <textarea
                        class="form-control form-control-sm input-content"
                        v-model="input.content"
                        :rows="lineRows"
                        @keydown.enter.exact.prevent="sendMessage()"
                    ></textarea>
                </div>
                <div class="col-auto">
                    <i class="material-icons send-btn align-bottom">send</i>
                </div>
            </div>
        </div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
import store from '../store';
export default Vue.extend({
    name: 'TalkContent',
    data: () => ({
        input: {
            content: '',
        },
    }),

    computed: {
        talk() {
            return store.activeTalk;
        },
        lineRows() {
            return this.input.content.split('\n').length;
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
            store.activeTalkId = 0;
        },
        sendMessage() {
            console.info('send message');
            this.input.content = '';
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

    .empty-talk {
        position: relative;
        color: color(sub-text-color);
        text-align: center;
        top: 50%;
        transform: translateY(-50%);
    }

    .content-panel {
        position: relative;
        height: 100%;
        width: 100%;
    }

    .content-navbar {
        position: relative;
        background: #17212b;
        color: #f5f5f5;
        height: 60px;
        padding: 0.5rem;
        & > .col,
        & > .col-auto {
            padding: 0 0.5rem;
        }
        .talk-name-panel {
            p {
                font-size: 15px;
                margin: 0;
            }
            small {
                color: color(sub-text-color);
            }
        }
    }
    .footer-options {
        padding: 0.5rem;
        .col,
        .col-auto {
            + .col,
            + .col-auto {
                padding-left: 0.5rem;
            }
        }
        .file-btn,
        .send-btn {
            cursor: pointer;
            position: relative;
            bottom: 0;
            line-height: 30px;
            font-size: 26px;
            vertical-align: bottom;
            color: color(link-text-color);
            top: 100%;
            transform: translateY(-100%);
        }
        .input-content {
            resize: none;
            background: color(input-bg-color);
            border-color: color(input-bg-color);
            color: color(text-color);
        }
    }
}
</style>