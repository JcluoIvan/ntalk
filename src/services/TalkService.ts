import Talk, { TalkType } from '../models/Talk';
import { TalkRepository } from '../repositories/TalkRepository';
import { env } from '../config/env';
import { TalkMessage } from '../models/TalkMessage';
import { TalkMessageRepository } from '../repositories/TalkMessageRepository';
import { log } from '../config/logger';
import { UserRepository } from '../repositories/UserRepository';
import _ from 'lodash';
import moment from 'moment';

interface TalkItem {
    talk: Talk;
    firstMessage: TalkMessage | null;
    lastMessage: TalkMessage | null;
}
const mapTalks = new Map<number, TalkItem>();
export const TalkService = {
    find(id: number) {
        return mapTalks.get(id);
    },

    all() {
        return Array.from(mapTalks.values());
    },

    /**
     * @param {number} id talk id
     */
    exists(id: number) {
        return mapTalks.has(id);
    },

    talkHasUser(tid: number, uid: number) {
        const item = mapTalks.get(tid);
        if (!item) {
            return false;
        }
        return item.talk.TalkJoins.some((m) => m.userId === uid);
    },

    talkJoinUsers(tid: number) {
        const item = mapTalks.get(tid);
        return item ? item.talk.TalkJoins.map((tj) => tj.userId) : [];
    },

    findTalkJoin(tid: number, uid: number) {
        const item = mapTalks.get(tid);
        if (item && item.talk.type === TalkType.Single) {
            return item.talk.TalkJoins.find((tj) => tj.userId === uid) || null;
        }
        return null;
    },

    toTalkData(tid: number, uid: number = 0) {
        const item = mapTalks.get(tid);
        if (!item) {
            throw new Error('對話不存在');
        }
        const join = item.talk.TalkJoins.find((tj) => tj.userId === uid);
        const target =
            (item.talk.type === TalkType.Single && item.talk.TalkJoins.find((tj) => tj.userId !== uid)) || null;
        if (uid && !join) {
            throw new Error('會員不屬於此群組');
        }
        if (uid && item.talk.type === TalkType.Single && !target) {
            throw new Error('單一對話對象不存在');
        }

        const data = {
            id: item.talk.id,
            type: item.talk.type,
            name: item.talk.name,
            avatar: item.talk.avatar,
            lifetime: item.talk.lifetime,
            creatorId: item.talk.creatorId,
            createdAt: item.talk.createdAt,
            users: item.talk.TalkJoins.map((tj) => tj.userId),
            unread: join ? join.unread : 0,
            lastReadId: 0,
            targetId: target ? target.userId : 0,
            lastMessage: item.lastMessage,
            firstMessage: item.firstMessage,
        };

        if (item.talk.type === TalkType.Single && uid) {
            data.targetId = data.users.find((id) => id !== uid) || 0;
        }
        return data;
    },

    async changeTalkLifetime(tid: number, lifetime: number) {
        const item = mapTalks.get(tid);
        if (!item) {
            log.error('資料異常！ 對話群組不存在');
            throw new Error('資料異常！ 對話群組不存在');
        }
        const value = Math.min(lifetime || env.MAX_MESSAGE_LIFETIME, lifetime);
        await TalkRepository.updateLifetime(tid, value);
        item.talk.lifetime = value;
        return value;
    },

    async sendMessage(tid: number, uid: number, content: string) {
        const item = mapTalks.get(tid);
        if (!item) {
            log.error('資料異常！ 對話群組不存在');
            throw new Error('資料異常！ 對話群組不存在');
        }
        const message = await TalkRepository.sendMessage(uid, tid, content);
        if (!item.firstMessage) {
            item.firstMessage = message;
        }
        item.lastMessage = message;
        return message;
    },

    /**
     *
     */
    async reloadTalks() {
        const talks = await TalkRepository.joinMappinTalks();
        mapTalks.clear();
        talks.forEach((talk) => {
            mapTalks.set(talk.id, {
                talk,
                firstMessage: null,
                lastMessage: null,
            });
        });
        await TalkService.reloadMessages(talks.map((t) => t.id));
    },

    async reloadTalk(tid: number) {
        const talk = await TalkRepository.find(tid);
        mapTalks.delete(tid);
        if (!talk) {
            return null;
        }
        mapTalks.set(tid, {
            talk,
            firstMessage: null,
            lastMessage: null,
        });
        await TalkService.reloadMessages([talk.id]);
    },

    async reloadMessages(tids: number[]) {
        await TalkService.reloadFirstMessage(tids);
        await TalkService.reloadLastMessage(tids);
    },

    async reloadFirstMessage(ids: number[]) {
        const items = ids.map((id) => mapTalks.get(id)).filter((it) => it);
        const tids = items.map((it) => it.talk.id);
        const firstMessages = await TalkMessageRepository.firstMessages(tids);
        items.map((item) => {
            const firstMessage = firstMessages.find((m) => m.talkId === item.talk.id) || null;
            mapTalks.set(item.talk.id, {
                ...item,
                firstMessage: firstMessages.find((m) => m.talkId === item.talk.id) || null,

                /* 若 firstMessage 不存在, 代表 lastMessage 也不存在 */
                lastMessage: firstMessage ? item.lastMessage : null,
            });
        });
    },
    async reloadLastMessage(ids: number[]) {
        const items = ids.map((id) => mapTalks.get(id)).filter((it) => it);
        const tids = items.map((it) => it.talk.id);
        const lastMessages = await TalkMessageRepository.lastMessages(tids);

        items.map((item) => {
            const lastMessage = lastMessages.find((m) => m.talkId === item.talk.id) || null;

            mapTalks.set(item.talk.id, {
                ...item,
                lastMessage,

                /* 若 lastMessage 不存在, 代表 firstMessage 也不存在 */
                firstMessage: lastMessage ? item.firstMessage : null,
            });
        });
    },

    async clearExpireMessages(tid: number) {
        const item = mapTalks.get(tid);
        if (!item) {
            log.error('資料異常！ 對話群組不存在');
            return;
        }
        const { talk, firstMessage } = item;
        const expireLessAt = moment()
            .add(env.MAX_MESSAGE_LIFETIME, 'minutes')
            .format('YYYY-MM-DD HH:mm:ss');
        await TalkMessageRepository.deleteMessageLessAt(talk.id, expireLessAt);
        await TalkService.reloadFirstMessage([talk.id]);
    },

    async deleteAllTalkMessage(tid: number) {
        const item = mapTalks.get(tid);
        if (!item) {
            log.error('資料異常！ 對話群組不存在');
            return;
        }
        const { talk } = item;
        await TalkMessageRepository.deleteAllMessage(talk.id);
        await TalkService.reloadFirstMessage([talk.id]);
    },

    async createSingleTalk(uid: number, targetId: number) {
        if (!(await UserRepository.exists(targetId))) {
            throw new Error(`使用者不存在: ${targetId}`);
        }
        let talk = await TalkRepository.findSingleTalk(uid, targetId);
        if (!talk) {
            talk = await TalkRepository.createSingleTalk(uid, targetId);
        }
        await TalkService.reloadTalk(talk.id);
        return talk.id;
    },

    // async createGroupTalk(uid: number, name: string, users: number[]) {
    //     if (!(await UserRepository.existsAll([uid, ...users]))) {
    //         throw new Error('部分使用者不存在');
    //     }
    //     const talk = await TalkRepository.createGroupTalk(uid, name, users);
    //     await TalkService.reloadTalk(talk.id);
    //     return talk.id;
    // },

    async saveGroupTalk(uid: number, data: { id: number; name: string; users: number[] }) {
        const uids = _.uniq([uid, ...data.users]);
        if (!(await UserRepository.existsAll(uids))) {
            throw new Error('部分使用者不存在');
        }
        let talk: Talk | null = null;

        if (data.id) {
            if (!TalkService.exists(data.id)) {
                await TalkService.reloadTalk(data.id);
            }

            if (!TalkService.exists(data.id)) {
                throw new Error(`群組不存在 id = ${data.id}`);
            }

            talk = await TalkRepository.updateGroupTalk(uid, data);
        } else {
            talk = await TalkRepository.createGroupTalk(uid, data.name, data.users);
        }

        if (!talk) {
            throw new Error(`群組更新失敗`);
        }

        await TalkService.reloadTalk(talk.id);
        return talk.id;
    },

    async leaveTalk(tid: number, uid: number) {
        await TalkRepository.leaveTalk(tid, uid);
        await TalkService.reloadTalk(tid);
    },
};
