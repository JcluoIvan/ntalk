const mix = require('laravel-mix');
require('laravel-mix-alias');
let enabledSourceMaps = !mix.inProduction();

// mix.sass('./resource/scss/app.scss', 'dist')
//     .js('./resource/app.js', 'dist');

mix.sass('resources/scss/main.scss', 'public/assets')
    .ts('resources/main.ts', 'public/assets')
    .sourceMaps(enabledSourceMaps, 'source-map')
    .setResourceRoot('/assets')
    .setPublicPath('public');

mix.alias({ '@': '/resources' }).webpackConfig({
    output: {
        chunkFilename: 'js/[name].js?id=[hash]',
    },
});

if (mix.inProduction()) {
    mix.version();
}
