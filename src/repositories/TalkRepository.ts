import { TalkJoin } from '../models/TalkJoin';
import Talk, { UserTalkJoin, TalkType } from '../models/Talk';
import { sequelize } from '../config/database';
import { QueryTypes, Op } from 'sequelize';
import { log } from '../config/logger';
import { TalkMessage } from '../models/TalkMessage';
import { env } from '../config/env';

export const TalkRepository = {
    async reloadLifetime() {
        await Talk.update(
            {
                lifetime: env.MAX_MESSAGE_LIFETIME,
            },
            {
                where: {
                    lifetime: {
                        [Op.or]: [{ [Op.gt]: env.MAX_MESSAGE_LIFETIME }, { [Op.eq]: 0 }],
                    },
                },
            },
        );
    },
    /**
     * @returns {Promise<Talk[]>}
     */
    async talks() {
        return await Talk.findAll();
    },

    async find(tid: number) {
        return await Talk.findByPk(tid, {
            include: [TalkJoin],
        });
    },

    /**
     *
     * @param {number} uid user id
     * @returns {Promise<Talk[]>}
     */
    async getByUser(uid: number) {
        const talks = await Talk.findAll({
            include: [
                {
                    model: UserTalkJoin,
                    where: { user_id: uid },
                    required: true,
                },
            ],
        });
        return talks;
    },

    async getTargetJoinsByUser(uid: number): Promise<{ talkId: number; userId: number }[]> {
        const sql = `
            SELECT mtj.talk_id as talkId, mtj.user_id as userId
            FROM talk_join AS mtj
            RIGHT JOIN talk ON (talk.id = mtj.talk_id)
            RIGHT JOIN (
                SELECT talk_id
                FROM talk_join
                WHERE user_id = :uid 
            ) AS tjoin ON (tjoin.talk_id = mtj.talk_id)
            WHERE talk.type = 'single' AND user_id != :uid
        `;
        return await sequelize.query(sql, {
            type: QueryTypes.SELECT,
            replacements: { uid },
        });
    },

    async getTalkJoinsByUser(uid: number) {
        return await TalkJoin.findAll({
            where: {
                user_id: uid,
            },
        });
    },

    async updateLifetime(id: number, lifetime: number) {
        return await Talk.update({ lifetime }, { where: { id } });
    },

    /**
     * @returns {Promise<Talk[]>}
     */
    async joinMappinTalks() {
        return await Talk.findAll({
            include: [TalkJoin],
        });
    },

    async findSingleTalk(uid: number, targetId: number) {
        const sql = `
            SELECT talk.*
            FROM talk
            RIGHT JOIN (
                SELECT COUNT(1) AS nums, talk_id
                FROM talk_join
                WHERE user_id IN (:uids)
                GROUP BY talk_id
                HAVING nums = 2
            ) AS tjmap ON (tjmap.talk_id = talk.id)
            WHERE talk.type = 'single'
        `;

        const talks = await sequelize.query<Talk>(sql, {
            type: QueryTypes.SELECT,
            mapToModel: true,
            model: Talk,
            replacements: {
                uids: [uid, targetId],
            },
        });

        return talks.length ? talks[0] : null;
    },

    async createSingleTalk(uid: number, targetId: number) {
        let newTalk;
        await sequelize
            .transaction({}, async (transaction) => {
                newTalk = await Talk.create(
                    {
                        type: TalkType.Single,
                        name: '',
                        avatar: '',
                        creatorId: uid,
                    },
                    { transaction },
                );

                log.info('>> ', newTalk.id);
                await TalkJoin.bulkCreate(
                    [
                        { talkId: newTalk.id, userId: uid },
                        { talkId: newTalk.id, userId: targetId },
                    ],
                    { transaction },
                );
            })
            .catch((err) => {
                throw new err();
            });
        if (!newTalk) {
            log.error(`對話群組建立失敗`);
            throw new Error(`對話群組建立失敗`);
        }
        return newTalk;
    },

    async findTalkMapping(uid: number, tid: number) {
        return await TalkJoin.findOne({ where: { talk_id: tid, user_id: uid } });
    },

    async sendMessage(uid: number, tid: number, content: string) {
        const message = await TalkMessage.create({
            talkId: tid,
            userId: uid,
            content,
        });

        return message;
    },
};
