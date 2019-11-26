<template>
    <div class="Profile-Component" :class="className">
        <div class="profile">
            <img class="min-image" v-if="url" :src="url" />
        </div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
export enum PropSize {
    Mini = 'mini',
    Small = 'small',
    Medium = 'medium',
    Large = 'large',
}
export enum PropType {
    Service = 'service',
    Customer = 'customer',
}

export default Vue.extend({
    props: {
        url: String,
        size: String,
        online: Boolean,
    },
    computed: {
        className() {
            const { online, size } = this;
            const className = [];
            if (size) {
                className.push(`size-${size}`);
            }
            if (online !== null) {
                className.push(`status status-${online ? 'online' : 'offline'}`);
            }
            return className;
        },

    },
});
</script>
<style lang="scss" scoped>
@import '@/scss/colors.scss';
.Profile-Component {
    position: relative;
    display: inline-block;
    vertical-align: middle;

    // &:after {
    //     position: absolute;
    //     content: ' ';
    //     width: 15px;
    //     height: 15px;
    //     right: 2px;
    //     bottom: 5px;
    //     border-radius: 50%;
    //     background: color(success);
    //     display: none;
    //     border: 1px solid color(light-success);
    // }
    // &.status-offline:after {
    //     background: #eee;
    // }
    // &.status:after {
    //     display: block;
    // }
}
.profile {
    position: relative;
    // border: 1px solid #eee;
    border-radius: 50%;
    overflow: hidden;
    background: #fff;
    width: 64px;
    height: 64px;
    img {
        width: 100%;
        height: 100%;
    }
}
.Profile-Component {
    &.status-online .profile {
        border-color: #28a745;
    }
    &.size-large {
        .profile {
            width: 64px;
            height: 64px;
        }
    }
    &.size-medium {
        &:after {
            width: 12px;
            height: 12px;
            bottom: 2px;
            right: 0px;
        }
        .profile {
            width: 48px;
            height: 48px;
        }
    }
    &.size-small {
        &:after {
            width: 9px;
            height: 9px;
            bottom: 2px;
            right: 0px;
        }

        .profile {
            width: 32px;
            height: 32px;
        }
    }
    &.size-mini {
        .profile {
            width: 24px;
            height: 24px;
        }
    }
}
</style>
