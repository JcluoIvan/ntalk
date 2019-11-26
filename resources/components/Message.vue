<template>
    <div class="Message-Component self">
        <div class="content-wrapper">
            <div class="message">測試 123 測試test 123 123 123</div>
            <small>下午 06:30</small>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import '@/scss/colors';
.Message-Component {
    color: color(light-text-color);
    width: 100%;

    .content-wrapper {
        background-color: color(message-bg-color);
        display: inline-block;
        padding: 0.75rem;
        padding-bottom: 0.1rem;
        margin: 0.5rem;
        border-radius: 5px;
        max-width: 75%;
        .message {
            font-size: 15px;
            white-space: pre-wrap;
            word-break: break-all;
        }
        small {
            color: color(message-time-color);
            float: right;
        }
    }

    &.self {
        text-align: right;
        .content-wrapper {
            background-color: color(message-self-bg-color);
            color: color(text-color);
            .message {
                text-align: left;
            }
            small {
                color: color(message-self-time-color);
                float: right;
            }
        }
    }
}
</style>

