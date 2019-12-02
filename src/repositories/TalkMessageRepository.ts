import Talk from '../models/Talk';
import { TalkRepository } from './TalkRepository';
import { Op, QueryTypes } from 'sequelize';
import { TalkMessage } from '../models/TalkMessage';
import { sequelize } from '../config/database';
import { log } from '../config/logger';

export const TalkMessageRepository = {
    async firstMessages(tids?: number[]) {
        const whereTalks = tids ? `WHERE talk_id IN (:tids)` : '';
        const sql = `
            SELECT MIN(id) AS id, talk_id
            FROM talk_message
            ${whereTalks}
            GROUP BY talk_id
        `;

        if (tids.length === 0) {
            return [];
        }

        const rows = await sequelize.query<{ id: string }>(sql, {
            replacements: { tids },
            type: QueryTypes.SELECT,
        });
        const mids = rows.map((row) => Number(row.id));
        return mids.length ? await TalkMessage.findAll({ where: { id: mids } }) : [];
    },
    async lastMessages(tids?: number[]) {
        const whereTalks = tids ? `WHERE talk_id IN (:tids)` : '';
        const sql = `
            SELECT MAX(id) AS id, talk_id
            FROM talk_message
            ${whereTalks}
            GROUP BY talk_id
        `;
        
        if (tids.length === 0) {
            return [];
        }

        const rows = await sequelize.query<{ id: string }>(sql, {
            replacements: { tids },
            type: QueryTypes.SELECT,
        });
        const mids = rows.map((row) => Number(row.id));
        return mids.length ? await TalkMessage.findAll({ where: { id: mids } }) : [];
    },
    async loadMessageAfter(tid: number, mid: number, size = 15) {
        const options: any = {
            where: { talkId: tid },
            order: [['id', 'asc']],
            limit: size,
        };
        if (mid) {
            options.where.id = {
                [Op.gt]: mid,
            };
        } else {
            /** 若 id = 0, 則只取後面的資料 */
            options.order = [['id', 'desc']];
        }

        return await TalkMessage.findAll(options);
    },
    async numMessageAfters(tid: number, mid: number) {
        const where: any = { talkId: tid };
        if (mid) {
            where.id = {
                [Op.gt]: mid,
            };
        }
        return await TalkMessage.count({
            where,
        });
    },
    async loadMessageBefore(tid: number, mid: number, size = 15) {
        const options: any = {
            where: { talkId: tid },
            order: [['id', 'desc']],
            limit: size,
        };
        if (mid) {
            options.where.id = {
                [Op.lt]: mid,
            };
        }

        return await TalkMessage.findAll(options);
    },
    async numMessageBefores(tid: number, mid: number) {
        const where: any = { talkId: tid };
        if (mid) {
            where.id = {
                [Op.lt]: mid,
            };
        }
        return await TalkMessage.count({
            where,
        });
    },

    async deleteMessageIdLessThan(tid: number, mid: number) {
        return await TalkMessage.destroy({
            where: {
                id: {
                    [Op.lte]: mid,
                },
                talk_id: tid,
            },
        });
    },

    async deleteAllMessage(tid: number) {
        return await TalkMessage.destroy({
            where: {
                talk_id: tid,
            },
        });
    },
};
