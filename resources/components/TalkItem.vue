<template>
    <div
        class="TalkItem-Component row no-gutters"
        :class="{active: active}"
        @click.prevent="activeTalk"
    >
        <div class="col-auto profile-panel">
            <profile size="medium" url="https://via.placeholder.com/64"></profile>
        </div>
        <div class="col message-panel">
            <p class="title">{{ talk.name }}</p>
            <small class="sub-message" v-if="talk.lastMessage">{{ talk.lastMessage.content }}</small>
        </div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
import store from '../store';
export default Vue.extend({
    props: ['data'],
    computed: {
        talk(): NTalk.Talk {
            return this.data;
        },
        active(): boolean {
            return store.activeTKey === this.talk.key;
        },
    },
    methods: {
        activeTalk() {
            store.activeTKey = this.talk.key;
        },
    },
});
</script>
<style lang="scss" scoped>
@import '@/scss/colors';
.TalkItem-Component {
    color: color(light-text-color);
    padding: 0.5rem;
    .profile-panel {
        padding-right: 1rem;
    }
    .message-panel {
        .title {
            margin: 0;
        }
        .sub-message {
            color: color(sub-text-color);
        }
    }
    &:hover {
        background-color: color(hover-bg-color);
    }
    &.active {
        background-color: color(active-bg-color);
        .sub-message {
            color: color(light-text-color);
        }
    }
}
</style>