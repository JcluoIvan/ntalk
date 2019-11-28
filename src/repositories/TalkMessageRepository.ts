import Talk from '../models/Talk';
import { TalkRepository } from './TalkRepository';
import { Op } from 'sequelize';
import { TalkMessage } from '../models/TalkMessage';

export const TalkMessageRepository = {
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
};
