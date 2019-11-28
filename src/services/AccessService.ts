import axios from 'axios';
import env from '../config/env';
import { log } from '../config/logger';
import moment from 'moment';
import sha256 from 'sha256';
import { UserRepository } from '../repositories/UserRepository';

export const AccessService = {
    async oauth(accessToken: string) {
        if (!accessToken) {
            throw new Error('access token is required');
        }

        const { data } = await axios.post(env.ACCESS_CHECK_URL, null, { params: { access_token: accessToken } });

        if (typeof data !== 'object') {
            log.fatal('access check response unkonwn > ' + data);
            throw new Error(data + '');
        }

        if (data.error) {
            throw new Error(data.error);
        }

        if (!data.token) {
            log.fatal('access check response no id > ' + JSON.stringify(data));
            throw new Error('empty id');
        }

        const user = await UserRepository.findOrCreateByToken(data.token);

        return user.toJSON();
    },
};
