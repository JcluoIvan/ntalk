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
    module: {
        rules: [
            // your rules may go here
            // next rules are just example, you can modify them according to your needs
            {
                test: /\.(wav)(\?.*$|$)/,
                loader: 'file-loader?name=assets/[name].[ext]?[hash]',
            },
        ],
    },
});

if (mix.inProduction()) {
    mix.version();
}
