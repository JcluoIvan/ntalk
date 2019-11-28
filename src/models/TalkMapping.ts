import moment from 'moment';
import { Model, Sequelize, DataTypes } from 'sequelize/types';
import { sequelize } from '../config/database';

/**
 * @extends InterfaceModel
 */
export class TalkMapping extends Model {
    public id!: number;
    public talkId!: number;
    public userId!: number;
    public unread!: number;
    public lastReadId!: number;
    public readonly createdAt!: Date;
}

TalkMapping.init(
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
        },
        talkId: DataTypes.BIGINT,
        userId: DataTypes.BIGINT,
        unread: DataTypes.INTEGER,
        lastReadId: DataTypes.BIGINT,
        createdAt: DataTypes.DATE,
    },
    {
        underscored: true,
        tableName: 'talk_mapping',
        sequelize,
        updatedAt: false,
    },
);
