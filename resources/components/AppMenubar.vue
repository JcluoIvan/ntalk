<template>
    <v-navigation-drawer v-model="visible" absolute temporary dark>
        <v-card class="d-flex flex-column" tile height="100%">
            <v-card tile class="py-4 px-2">
                <v-list-item>
                    <v-list-item-avatar>
                        <v-img v-if="user.avatar" :src="user.avatar"></v-img>
                        <v-avatar v-else color="primary">
                            <span class="white--text headline">{{ textAvatar(user.name) }}</span>
                        </v-avatar>
                    </v-list-item-avatar>

                    <v-list-item-content>
                        <v-list-item-title>{{ user.name }}</v-list-item-title>
                    </v-list-item-content>
                    <v-list-item-action>
                        <v-btn icon @click="openEditNameDialog()">
                            <v-icon>edit</v-icon>
                        </v-btn>
                    </v-list-item-action>
                </v-list-item>
            </v-card>
            <v-divider></v-divider>
            <v-card tile class="overflow-y-auto overflow-x-hidden flex-grow-1">
                <v-list dense>
                    <v-list-item link class="py-2" @click="createGroupTalk">
                        <v-list-item-icon>
                            <v-icon>supervisor_account</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title>建立群組</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>
                    <v-divider></v-divider>
                    <v-list-item link class="py-2" @click="refreshApp">
                        <v-list-item-icon>
                            <v-icon>refresh</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title>重新載入</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>
                </v-list>
            </v-card>
            <v-divider></v-divider>
            <v-card tile>
                <div class="version-text pa-2 text-right">Ver. 1.0.0</div>
            </v-card>
        </v-card>

        <v-dialog v-model="editNameDialog.visible" width="300" dark>
            <v-form @submit.prevent="onSaveName" v-model="editNameDialog.verify">
                <v-card>
                    <v-card-title primary-title>修改名稱</v-card-title>
                    <v-text-field
                        :rules="[valids.required]"
                        v-model="editNameDialog.inputName"
                        class="pa-4"
                        color="primary"
                        label="名稱"
                        autofocus
                        @focus="(e) => e.target.select()"
                    ></v-text-field>
                    <v-divider></v-divider>
                    <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn text @click="() => editNameDialog.visible = false">取消</v-btn>
                        <v-btn type="submit" color="primary" text>儲存</v-btn>
                    </v-card-actions>
                </v-card>
            </v-form>
        </v-dialog>
        <group-talk-dialog ref="talkDialog" @saved="() => visible = false"></group-talk-dialog>
    </v-navigation-drawer>
</template>

<script lang="ts">
import Vue from 'vue';
import store from '../store';
export default Vue.extend({
    data: (): {
        editNameDialog: {
            visible: boolean;
            loading: boolean;
            inputName: string;
            verify: boolean;
        };
    } => ({
        editNameDialog: {
            visible: false,
            loading: false,
            verify: false,
            inputName: '',
        },
    }),
    computed: {
        valids() {
            return {
                required: (value: string) => value.length > 0 || '不得為空值',
            };
        },
        visible: {
            get: () => store.appMenubar.visible,
            set: (value) => (store.appMenubar.visible = Boolean(value)),
        },
        user() {
            return store.user;
        },
    },
    methods: {
        textAvatar(name: string) {
            return store.textAvatar(name);
        },
        openEditNameDialog() {
            this.editNameDialog.inputName = store.user.name;
            this.editNameDialog.visible = true;
        },
        async onSaveName() {
            const dialog = this.editNameDialog;
            if (!dialog.verify) {
                return;
            }
            if (dialog.loading) {
                return;
            }
            dialog.loading = true;
            await store.saveUserName(dialog.inputName);
            dialog.loading = false;
            dialog.visible = false;
        },

        createGroupTalk() {
            const dialog: any = this.$refs.talkDialog;
            dialog.newTalk();
        },
        refreshApp() {
            store.refreshApp();
        },
    },
});
</script>
<style lang="scss" scoped>
.version-text {
    font-family: monospace;
}
</style>