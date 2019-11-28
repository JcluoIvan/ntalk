import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class User extends Model {
    public id!: number;
    public token!: string;
    public sessid!: string;
    public avatar!: string;
    public name!: string;
    public createdAt!: Date;

    public static scopeWithout() {
        return User.scope('withoutToken');
    }
}
User.init(
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
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
