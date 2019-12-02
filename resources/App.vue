<template>
    <v-app>
        <app-menubar></app-menubar>
        <div class="app-container d-flex">
            <div class="pa-0 col-12 col-md-3 col-sm-4" :class="sidebarClass">
                <sidebar></sidebar>
            </div>
            <div class="flex-grow-1" :class="contentClass">
                <talk-content></talk-content>
            </div>
        </div>
        <access-login :visible="!online"></access-login>
        <notice-message></notice-message>
    </v-app>
</template>

<script lang="ts">
import Vue from 'vue';
import store, { SocketStatus } from './store';
// import { user } from './stores/user';

const DisplayCodeRange: {
    code: DisplayCode;
    min: number;
    max: number;
}[] = [
    { code: 'xs', min: 0, max: 600 },
    { code: 'sm', min: 600, max: 960 },
    { code: 'md', min: 960, max: 1264 },
    { code: 'lg', min: 1264, max: 1904 },
    { code: 'xl', min: 1904, max: 99999 },
];

export type DisplayCode = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export default Vue.extend({
    data: (): {
        displayCode: DisplayCode;
    } => ({
        displayCode: 'lg',
    }),
    computed: {
        user() {
            return store.user;
        },
        online() {
            return store.socket.status === SocketStatus.Connected;
        },
        sidebarClass() {
            return {
                'hidden-xs-only': store.activeTKey > 0,
            };
        },
        contentClass() {
            return {
                'hidden-xs-only': store.activeTKey === 0,
            };
        },
    },
    mounted() {
        // this.onResize();
    },
    methods: {
        // onResize() {
        //     const w = window.innerWidth;
        //     const codeItem = DisplayCodeRange.find((o) => o.min <= w && w <= (o.max || w));
        //     this.displayCode = (codeItem && codeItem.code) || 'xl';
        // },
    },
});
</script>
<style lang="scss" scoped>
.app-container {
    position: relative;
    width: 100%;
    height: 100%;

    .content-panel {
        position: relative;
        height: 100%;
        width: 100%;
    }
}
</style>