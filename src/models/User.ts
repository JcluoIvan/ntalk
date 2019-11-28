import { Sequelize, Model, DataTypes } from 'sequelize/types';
import { sequelize } from '../config/database';
import { TalkMapping } from './TalkMapping';
import { userInfo } from 'os';

export class User extends Model {
    public id!: number;
    public token!: string;
    public sessid!: string;
    public avatar!: string;
    public name!: string;
    public createdAt!: Date;

    public static scopeWithout() {
        return User.scope('without');
    }
}
User.init(
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
        },
        token: DataTypes.STRING,
        sessid: DataTypes.STRING,
        avatar: DataTypes.STRING,
        name: DataTypes.BIGINT,
        createdAt: DataTypes.DATE,
    },
    {
        underscored: true,
        tableName: 'user',
        sequelize,
        updatedAt: false,
        scopes: {
            withoutToken: {
                attributes: { exclude: ['token'] },
            },
        },
    },
);
