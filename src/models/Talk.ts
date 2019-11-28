import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { TalkJoin } from './TalkJoin';

export enum TalkType {
    Single = 'single',
    Group = 'group',
}

/**
 * @extends InterfaceModel
 */
class Talk extends Model {
    public id!: number;
    public type!: TalkType;
    public name!: string;
    public avatar!: string;
    public creatorId!: number;
    public readonly createdAt!: Date;
    
    /** 若為 type = single 時, 這裡指的是對話的對象使用者 id */
    public targetId!: number;


    public TalkJoins!: TalkJoin[];
    public UserTalkJoin!: UserTalkJoin;
}



Talk.init(
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        type: DataTypes.ENUM('single', 'group'),
        name: DataTypes.STRING,
        avatar: DataTypes.STRING,
        creatorId: DataTypes.BIGINT,
        createdAt: DataTypes.DATE,
    },
    {
        underscored: true,
        tableName: 'talk',
        sequelize,
        updatedAt: false,
    },
);

Talk.hasMany(TalkJoin);

/* user talk_join data */
export class UserTalkJoin extends TalkJoin {}
Talk.hasOne(UserTalkJoin);

export default Talk;
