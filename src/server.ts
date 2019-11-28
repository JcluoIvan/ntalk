import express from 'express';
import env from './config/env';
import { viewRender } from './view';
import path from 'path';
import SocketIO from 'socket.io';
import { log } from './config/logger';
import { AccessService } from './services/AccessService';
import { User } from './models/User';
import sha256 from 'sha256';
const render = viewRender(path.resolve(__dirname, 'public'));
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
server.listen(env.SERVER_PORT, () => {
    log.info(`Server Start on ${env.SERVER_PORT}`);
});

// socket client handler
// new ClientService(io);

(async () => {
    const u = await User.scopeWithout().create({
        token: sha256(new Date().getTime() + ''),
    });
    log.info(u.toJSON());
    process.exit();
})();

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
    AccessService.oauth(access_token)
        .then((res) => response.send(res))
        .catch((err) => {
            log.error(err.stack);
            response.status(400).send({ message: err.message });
        });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    log.error(err.stack);
    res.status(400).send({ message: err.message });
});

// io.on('connection', (socket) => {

// });
