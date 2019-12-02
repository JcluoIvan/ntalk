import { User } from '../models/User';
import sha256 from 'sha256';
import { log } from '../config/logger';

interface WithoutTokenUserJSON {
    id: number;
    sessid: string;
    avatar: string;
    name: string;
    createdAt: Date;
}

export const UserRepository = {
    generateSessid(token: string) {
        return sha256(`${token}-${new Date().getTime()}-${Math.random()}`);
    },

    async find(id: number) {
        return await User.findByPk(id);
    },

    async updateUserName(id: number, name: string) {
        return await User.update(
            { name },
            {
                where: { id },
            },
        );
    },

    async findWithoutToken(id: number) {
        return await User.scope('withoutToken').findByPk(id);
    },

    async users() {
        return await User.scope('withoutToken').findAll();
    },

    async exists(id: number) {
        return (await User.count({ where: { id } })) > 0;
    },

    async existsAll(ids: number[]) {
        return (await User.count({ where: { id: ids } })) === ids.length;
    },

    async findOrCreateByToken(data: { token: string; name?: string }) {
        const user = await User.findOne({ where: { token: data.token } });
        const sessid = this.generateSessid(data.token);
        let uid = 0;
        if (user) {
            user.sessid = this.generateSessid(user.token);
            await user.save();
            uid = user.id;
        } else {
            const createUser = await User.create({
                token: data.token,
                sessid,
                name: data.name || `${sessid.substr(0, 2).toUpperCase()}-User`,
            });
            uid = createUser.id;
        }

        const withoutTokenUser = await User.scopeWithout().findByPk(uid);
        if (!withoutTokenUser) {
            log.error('認證寫入失敗，無法登入');
            throw new Error('認證寫入失敗，無法登入');
        }

        return withoutTokenUser;
    },
};
