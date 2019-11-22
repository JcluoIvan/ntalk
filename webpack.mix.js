const mix = require('laravel-mix');

// mix.sass('./resource/scss/app.scss', 'dist')
//     .js('./resource/app.js', 'dist');

mix.sass('resources/scss/main.scss', 'public/assets')
    .ts('resources/main.ts', 'public/assets')
    .setPublicPath('public/assets');

mix.webpackConfig({
    output: {
        chunkFilename: 'js/[name].js?id=[hash]',
    },
});

if (mix.inProduction()) {
    mix.version();
}
