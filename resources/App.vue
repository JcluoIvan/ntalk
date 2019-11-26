<template>
    <div id="app">
        <div class="app-container row no-gutters">
            <div class="col-auto">
                <sidebar></sidebar>
            </div>
            <div class="col">
                <talk-content></talk-content>
            </div>
        </div>
        <access-login v-show="!online"></access-login>
    </div>
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
        }
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