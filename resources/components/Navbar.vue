<template>
    <div class="Navbar-Component row no-gutters">
        <div class="col-auto">
            <span class="material-icons">menus</span>
        </div>
        <div class="col"></div>
        <div class="col-auto user-image ">
            <img src="https://via.placeholder.com/64" alt />
        </div>
        <div class="col-auto user-name">{{ userName }}</div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
import store from '../store';
export default Vue.extend({
    name: 'Navbar',
    computed: {
        userName() {
            return store.user.name;
        },
    },
});
</script>

<style lang="scss" scoped>
@import '@/scss/colors.scss';
</style>