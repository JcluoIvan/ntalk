<template>
    <div class="AccessLogin-Component">
        <div class="access-panel">
            <div class="row">
                <div class="col"></div>
                <div class="col-auto">
                    <div v-if="checking">
                        <div class="spinner-grow text-primary" role="status">
                            <span class="sr-only">Loading...</span>
                        </div>
                        <label>驗證中 ...</label>
                    </div>
                    <div class="text-center" v-else>
                        <button
                            class="btn btn-primary"
                            :disabled="emptyAccessToken"
                            @click.prevent="accessCheck()"
                        >登入認證</button>
                    </div>
                    <hr />
                    <div class="alert alert-danger" v-show="errorMessage">{{ errorMessage }}</div>
                </div>
                <div class="col"></div>
            </div>
        </div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
import store from '../store';
import helpers from '../helpers';
export default Vue.extend({
    name: 'AccessLogin',
    data: () => ({
        accessing: false,
    }),
    computed: {
        errorMessage() {
            return store.socket.errorMessage;
        },
        emptyAccessToken() {
            return !store.query.access_token;
        },
        socketConnecting(): boolean {
            return store.isReconnecting;
        },
        checking(): boolean {
            return this.accessing || this.socketConnecting;
        },
    },
    mounted() {
        if (this.emptyAccessToken) {
            this.errorMessage = `access_token 不正確 ( is empty )`;
        }
        this.accessCheck();
    },

    methods: {
        accessCheck() {
            if (this.accessing) {
                return;
            }
            this.accessing = true;
            store.access().finally(() => {
                this.accessing = false;
            });
        },
    },
});
</script>
<style lang="scss" scoped>
.AccessLogin-Component {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    background: rgba(0, 0, 0, 0.5);
    padding: 50px;

    .access-panel {
        position: relative;
        height: 100%;
        width: 100%;
        background: #fff;
        border-radius: 5px;
        padding-top: 50px;

        .spinner-grow {
            width: 20px;
            height: 20px;
        }
    }

    button[disabled] {
        cursor: not-allowed;
    }
}
</style>