<template>
    <v-app>
        <div class="app-container d-flex">
            <div class>
                <sidebar></sidebar>
            </div>
            <div class="flex-grow-1">
                <talk-content></talk-content>
            </div>
        </div>
        <access-login v-show="!online"></access-login>
        <notice-message></notice-message>
    </v-app>
</template>

<script lang="ts">
import Vue from 'vue';
import store, { SocketStatus } from './store';
// import { user } from './stores/user';
export default Vue.extend({
    computed: {
        user() {
            return store.user;
        },
        online() {
            return store.socket.status === SocketStatus.Connected;
        },
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