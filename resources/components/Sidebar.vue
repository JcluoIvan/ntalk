<template>
    <div class="Sidebar-Component">
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
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
import store from '../store';
namespace P {
    export interface TalkItem extends NTalk.Talk {
        key: string;
    }
}
export default Vue.extend({
    computed: {
        talks(): P.TalkItem[] {
            return store.talks.map((t) => {
                return {
                    ...t,
                    key: `${t.type}-${t.id}`,
                };
            });
        },
    },
});
</script>

<style lang="scss" scoped>
@import '@/scss/colors.scss';

.Sidebar-Component {
    position: relative;
    width: 300px;
    height: 100%;
    border-right: 1px solid color(bg-dark-color);
    background: color(bg-color);
    cursor: pointer;

    .sidebar-header {
        padding: 1rem;
        .material-icons {
            display: inline-block;
            padding-right: 1rem;
            margin: 0;
            font-size: 24px;
            color: color(sub-text-color);
        }
        input {
            background: color(input-bg-color);
            border-color: color(input-bg-color);
            input::placeholder {
                color: color(sub-text-color);
            }
        }
    }
}
</style>