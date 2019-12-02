<template>
    <v-dialog v-model="visible" dark :width="width">
        <v-card>
            <v-card-title primary-title>{{ options.title }}</v-card-title>
            <slot>
                <v-card-text class="pt-4">{{ message }}</v-card-text>
            </slot>
            <v-divider></v-divider>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn text @click="onCancel">{{ options.btnCancel }}</v-btn>
                <v-btn color="error" text @click="onDone">{{ options.btnOk }}</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import Vue from 'vue';
export interface ConfirmOptions {
    title?: string;
    btnOk?: string;
    btnCancel?: string;
}
export default Vue.extend({
    props: {
        width: String,
    },
    data: (): {
        visible: boolean;
        message: string;
        options: ConfirmOptions;
        resolve: (() => void) | null;
        reject: (() => void) | null;
    } => ({
        visible: false,
        message: '',
        resolve: null,
        reject: null,
        options: {
            title: '訊息',
            btnOk: '確定',
            btnCancel: '取消',
        },
    }),
    methods: {
        open(message: string, options?: ConfirmOptions) {
            return new Promise((resolve, reject) => {
                this.options = {
                    title: '訊息',
                    btnOk: '確定',
                    btnCancel: '取消',
                    ...options,
                };
                this.message = message;
                this.resolve = resolve;
                this.reject = reject;
                this.visible = true;
            }).finally(() => {
                this.visible = false;
            });
        },
        onDone() {
            if (this.resolve) {
                this.resolve();
            }
        },
        onCancel() {
            if (this.reject) {
                this.reject();
            }
        },
    },
});
</script>