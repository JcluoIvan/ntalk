import Talk, { TalkType } from '../models/Talk';
import { TalkRepository } from '../repositories/TalkRepository';
import { env } from '../config/env';
import { TalkMessage } from '../models/TalkMessage';
import { TalkMessageRepository } from '../repositories/TalkMessageRepository';
import { log } from '../config/logger';

const mapTalks = new Map<
    number,
    {
        talk: Talk;
        firstMessage: TalkMessage | null;
        lastMessage: TalkMessage | null;
    }
>();
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
            item.lastMessage = message;
        }
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
        if (talk) {
            mapTalks.set(tid, {
                talk,
                firstMessage: null,
                lastMessage: null,
            });
            await TalkService.reloadMessages([talk.id]);
        }
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
        await TalkMessageRepository.deleteMessageIdLessThan(talk.id, firstMessage.id);
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
    
};
