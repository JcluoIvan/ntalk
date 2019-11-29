<template>
    <audio
        ref="audio"
        webkit-playsinline="true"
        playsinline="true"
        :loop="loop"
        @loadeddata="onLoaded"
        allow="autoplay"
        :src="src"
    />
</template>
<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
    props: {
        src: String,
        loop: {
            type: Boolean,
            default: true,
        },
    },
    data: (): {
        loaded: boolean;
        paused: boolean;
        playQueue: boolean;
    } => ({
        loaded: false,

        paused: true,

        playQueue: false,
    }),
    computed: {
        isPaused(): boolean {
            return this.paused;
        },
    },

    mounted() {
        const audio: HTMLAudioElement = this.$refs.audio as any;
        const onPause = () => (this.paused = true);
        const onPlaying = () => (this.paused = false);

        audio.addEventListener('pause', onPause);
        audio.addEventListener('playing', onPlaying);

        this.$on('beforeDestroy', () => {
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('playing', onPlaying);
        });
    },

    beforeDestroy() {
        this.$emit('beforeDestroy');
    },

    methods: {
        play(reset = true) {
            const audio: HTMLAudioElement = this.$refs.audio as any;
            if (!this.loaded) {
                this.playQueue = true;
                return;
            }

            if (reset) {
                audio.currentTime = 0;
            }

            if (audio.paused) {
                audio.play().catch((err) => {
                    console.error(err);
                });
            }
        },

        pause() {
            const audio: HTMLAudioElement = this.$refs.audio as any;
            if (!this.loaded) {
                this.playQueue = false;
                return;
            }

            audio.pause();
        },
        stop() {
            const audio: HTMLAudioElement = this.$refs.audio as any;
            audio.pause();
            audio.currentTime = 0;
        },
        onLoaded() {
            this.loaded = true;
            if (this.playQueue) {
                this.play();
            }
            this.$emit('load');
        },
    },
});
</script>
