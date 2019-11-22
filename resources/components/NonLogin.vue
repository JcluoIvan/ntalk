<template>
    <div class="NonLogin-Component">
        <button class="btn btn-outline-primary btn-sm" disabled>
            <div class="spinner-grow text-primary" role="status">
                <span class="sr-only">Loading...</span>
            </div>Access Check
        </button>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
export default Vue.extend({
    mounted() {},

    methods: {
        accessCheck() {},
    },
});
</script>