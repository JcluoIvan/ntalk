<template>
    <div id="app">
        <div>asdf</div>
        <non-login></non-login>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
// import { user } from './stores/user';
export default Vue.extend({
    computed: {
        sid() {
            return 0;
            // return user.sid;
        },
    },
});
</script>