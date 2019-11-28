<template>
    <div>
        <v-snackbar
            class="notice"
            v-for="notice in notices"
            :key="notice.id"
            v-model="notice.visible"
            :bottom="notice.y === 'bottom'"
            :color="notice.type"
            :left="notice.x === 'left'"
            :right="notice.x === 'right'"
            :timeout="notice.timeout"
            :top="notice.y === 'top'"
            @click="removeNotice(notice)"
        >{{ notice.message }}</v-snackbar>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
import store from '../store';

namespace P {
    export interface Notice extends NTalk.NoticeMessage {
        id: number;
        visible: boolean;
        timer: number;
    }
}

let autoincrement = 0;

export default Vue.extend({
    data: (): {
        notices: P.Notice[];
    } => ({
        notices: [],
    }),
    computed: {
        storeNotices() {
            return store.notices;
        },
    },

    watch: {
        storeNotices() {
            const ids = [];
            if (store.notices.length === 0) {
                return;
            }
            const notices = store.notices.splice(0).forEach((notice) => {
                const id = ++autoincrement;
                const newNotice = {
                    ...notice,
                    id,
                    visible: false,
                    timer: 0,
                };
                this.notices.push(newNotice);
                newNotice.timer = window.setTimeout(() => this.removeNotice(newNotice), newNotice.timeout);
            });
            this.$nextTick(() => {
                this.notices.map((n) => (n.visible = true));
            });
        },
    },
    methods: {
        removeNotice(notice: P.Notice) {
            window.clearTimeout(notice.timer);
            this.notices = this.notices.filter((n) => n.id !== notice.id);
        },
    },
});
</script>
<style lang="scss" scoped>
.notice {
    cursor: pointer;
}
</style>