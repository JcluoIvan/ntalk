import { User } from '../models/User';
import sha256 from 'sha256';

export const UserRepository = {
    async findUser(id: number) {
        return await User.scope('withoutToken').findByPk(id);
    },

    async users() {
        return await User.scope('withoutToken').findAll();
    },

    generateSessid(token: string) {
        return sha256(`${token}-${new Date().getTime()}-${Math.random()}`);
    },

    async findOrCreateByToken(data: { token: string; name?: string }) {
        const user = await User.scopeWithout().findOne({ where: { token: data.token } });
        User.scope('');
        const sessid = this.generateSessid(data.token);

        if (user) {
            user.sessid = this.generateSessid(user.token);
            return await user.save();
        }
        const createUser = await User.scopeWithout().create({
            token: data.token,
            sessid,
            name: data.name || `${sessid.substr(0, 2).toUpperCase()}-User`,
        });

        return createUser;
    },
};
