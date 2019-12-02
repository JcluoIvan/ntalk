<template>
    <v-dialog v-model="visible" width="500" persistent dark>
        <v-form @submit.prevent="onSave" v-model="input.verify">
            <v-card>
                <v-card-title class="headline" primary-title>{{ title }}</v-card-title>
                <v-text-field
                    :rules="[valids.required]"
                    v-model="input.name"
                    class="pa-4"
                    color="primary"
                    label="群組名稱"
                    autofocus
                    @focus="(e) => e.target.select()"
                ></v-text-field>
                <v-autocomplete
                    v-model="input.users"
                    :items="userOptions"
                    class="pa-4"
                    dense
                    chips
                    small-chips
                    label="成員"
                    multiple
                ></v-autocomplete>
                <v-divider></v-divider>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn text :disabled="saving" @click="() => visible = false">取消</v-btn>
                    <v-btn :loading="saving" type="submit" color="info" text>儲存</v-btn>
                </v-card-actions>
            </v-card>
        </v-form>
    </v-dialog>
</template>
<script lang="ts">
import Vue from 'vue';
import store from '../store';
export default Vue.extend({
    data: (): {
        visible: boolean;
        saving: boolean;
        input: {
            verify: boolean;
            id: number;
            name: string;
            users: number[];
        };
    } => ({
        visible: false,
        saving: false,
        input: {
            verify: false,
            id: 0,
            name: '',
            users: [],
        },
    }),
    computed: {
        valids() {
            return {
                required: (value: string) => value.length > 0 || '不得為空值',
            };
        },
        title() {
            return this.input.id ? '編輯群組' : '建立群組';
        },
        userOptions() {
            return store.users.map((u) => ({ value: u.id, text: u.name }));
        },
    },
    methods: {
        newTalk() {
            this.input.id = 0;
            this.input.name = '新群組';
            this.input.users = [];
            this.visible = true;
        },
        editTalk(id: number) {
            const talk = store.sourceTalks.find((t) => t.id);
            if (!talk) {
                store.notice('群組不存在！', 'error');
                return;
            }
            this.input.id = talk.id;
            this.input.name = talk.name;
            this.input.users = talk.users;
            this.visible = true;
        },
        async onSave() {
            if (this.saving) {
                return;
            }
            this.saving = true;
            await store.saveGroupTalk(this.input.id, this.input.name, this.input.users);
            this.saving = false;
            this.visible = false;
            this.$emit('saved');
        },
    },
});
</script>