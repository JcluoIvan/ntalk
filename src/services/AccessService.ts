import axios from 'axios';
import { log } from '../config/logger';
import { UserRepository } from '../repositories/UserRepository';
import { env } from '../config/env';

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

        const user = await UserRepository.findOrCreateByToken({
            token: data.token,
            name: data.name || null,
        });

        return user.toJSON();
    },
};
