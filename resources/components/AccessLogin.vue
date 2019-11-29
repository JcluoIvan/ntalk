<template>
    <div class="AccessLogin-Component">
        <v-dialog persistent :value="visible" width="50%" dark>
            <v-card>
                <v-card-title class="headline">登入驗證</v-card-title>
                <div class="pa-4">
                    <v-alert dense outlined v-show="checking" class="text-center" key="access">
                        <v-progress-circular indeterminate color="amber" size="24"></v-progress-circular>
                        <label class="ml-4">驗證中 ...</label>
                    </v-alert>
                    <v-alert
                        v-if="!checking && errorMessage"
                        type="error"
                        key="message"
                        transition="slide-x-transition"
                    >{{ errorMessage }}</v-alert>
                </div>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn :disabled="emptyAccessToken" @click.prevent="accessCheck()">登入認證</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
import store from '../store';
import { helpers } from '../helpers';
import { AxiosResponse, AxiosError } from 'axios';
export default Vue.extend({
    props: {
        visible: Boolean,
    },
    name: 'AccessLogin',
    data: () => ({
        accessing: false,
        errorMessage: '',
    }),
    computed: {
        // errorMessage() {
        //     return store.socket.errorMessage;
        // },
        emptyAccessToken() {
            return false;
            // return !store.query.access_token;
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
        } else {
            this.accessCheck();
        }
    },

    methods: {
        accessCheck() {
            if (this.accessing) {
                return;
            }
            this.errorMessage = '';
            this.accessing = true;
            store
                .access()
                .catch((res: AxiosError<{ message: string }>) => {
                    if (res.response) {
                        this.errorMessage = res.response.data.message;
                    }
                })
                .finally(() => {
                    window.setTimeout(() => {
                        this.accessing = false;
                    }, 250);
                });
        },
    },
});
</script>
<style lang="scss" scoped>
.AccessLogin-Component {
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
}
</style>