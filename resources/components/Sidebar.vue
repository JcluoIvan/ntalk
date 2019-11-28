<template>
    <v-navigation-drawer permanent dark>
        <v-app-bar dark>
            <v-app-bar-nav-icon></v-app-bar-nav-icon>
            <v-text-field hide-details append-icon="search" single-line placeholder="搜尋"></v-text-field>
        </v-app-bar>
        <v-subheader>Talk Group</v-subheader>
        <v-list two-line subheader>
            <v-list-item-group v-model="activeIndex">
                <v-list-item v-for="talk in talks" :key="talk.key" link>
                    <v-list-item-avatar>
                        <v-img :src="talk.avatar" v-if="talk.avatar"></v-img>
                        <v-avatar v-else color="primary">
                            <span class="white--text headline">{{ textAvatar(talk) }}</span>
                        </v-avatar>
                    </v-list-item-avatar>
                    <v-list-item-content>
                        <template v-slot:badge>1</template>
                        <v-list-item-title v-text="talk.name"></v-list-item-title>
                        <v-list-item-subtitle
                            v-if="talk.lastMessage"
                            v-text="talk.lastMessage.content"
                        ></v-list-item-subtitle>
                    </v-list-item-content>
                    <v-list-item-action class="pr-2">
                        <v-badge>
                            <template v-slot:badge v-if="talk.unread > 0">{{ talk.unread }}</template>
                            <v-list-item-action-text>{{ talk.createdAt | dt('HH:mm') }}</v-list-item-action-text>
                        </v-badge>
                    </v-list-item-action>
                </v-list-item>
            </v-list-item-group>
        </v-list>
    </v-navigation-drawer>
    <!-- <div class="Sidebar-Component">
        <div class="sidebar-header row no-gutters">
            <div class="col-auto">
                <i class="material-icons">menu</i>
            </div>
            <div class="col">
                <input type="text" class="form-control form-control-sm" placeholder="搜尋" />
            </div>
        </div>
        <div class="talk-list">
            <talk-item v-for="talk in talks" :key="talk.key" :data="talk"></talk-item>
        </div>
    </div>-->
</template>
<script lang="ts">
import Vue from 'vue';
import store from '../store';
namespace P {
    export interface TalkItem extends NTalk.Talk {
        active: boolean;
    }
}
export default Vue.extend({
    computed: {
        talks(): P.TalkItem[] {
            const tkey = store.activeTKey;
            return store.talks.map((t) => {
                return {
                    ...t,
                    active: t.key === tkey,
                    lastMessage: { content: 'test' } as any,
                };
            });
        },
        activeIndex: {
            set(idx: number) {
                const talk = this.talks[idx];
                store.activeTKey = talk ? talk.key : -1;
                console.info('sett actid = ', store.activeTKey);
            },
            get(): number {
                const key = store.activeTKey;
                return key ? this.talks.findIndex((t) => t.key === key) : -1;
            },
        },
    },

    methods: {
        textAvatar(talk: P.TalkItem) {
            if (talk.name) {
                return talk.name.match(/^\w{2}/) ? talk.name.substr(0, 2) : talk.name.substr(0, 1);
            }
            return talk.id;
        },
    },
});
</script>
