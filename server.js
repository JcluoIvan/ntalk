const env = require('./src/config/env');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const log = require('./src/config/logger');
const io = require('socket.io')(server);
const path = require('path');
const render = require('./src/view')(path.resolve(__dirname, 'public'));
const access = require('./src/access_service');
const TalkService = require('./src/talk_service');

server.listen(env.SERVER_PORT, () => {
    log.info(`Server Start on ${env.SERVER_PORT}`);
});

// socket manager
new TalkService(io);

log.info(`debug = ${env.DEBUG}`);

app.use(express.json({ limit: '20mb' }));
app.use('/assets', express.static('public/assets'));

app.get('/', (request, response) => {
    const data = {
        mainjs: env.DEBUG ? 'http://127.0.0.1:8080/assets/main.js' : '/assets/main.js',
    };
    render('index.html', data)
        .then((html) => response.send(html))
        .catch((err) => response.status(404).send('page not found'));
});

app.post('/access', (request, response) => {
    const access_token = request.body.access_token;
    access
        .oauth(access_token)
        .then((res) => response.send(res))
        .catch((err) => {
            log.error(err.stack);
            response.status(400).send({ message: err.message });
        });
});

app.use((err, req, res, next) => {
    log.error(err.stack);
    res.status(400).send({ message: err.message });
});

// io.on('connection', (socket) => {

// });
