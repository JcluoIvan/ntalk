import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class TalkMessage extends Model {
    public id!: number;
    public userId!: string;
    public talkId!: string;
    public content!: string;
    public createdAt!: Date;
}
TalkMessage.init(
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        userId: DataTypes.BIGINT,
        talkId: DataTypes.BIGINT,
        content: DataTypes.STRING,
        createdAt: DataTypes.DATE,
    },
    {
        underscored: true,
        tableName: 'talk_message',
        sequelize,
        updatedAt: false,
    },
);
