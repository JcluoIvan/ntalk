import Talk from '../models/Talk';
import { TalkRepository } from '../repositories/TalkRepository';

const mapTalks = new Map<number, Talk>();
export const TalkService = {
    talks() {
        return Array.from(mapTalks.values());
    },

    /**
     * @param {number} id talk id
     */
    exists(id: number) {
        return mapTalks.has(id);
    },

    talkHasUser(tid: number, uid: number) {
        const talk = mapTalks.get(tid);
        if (!talk) {
            return false;
        }

        return talk.TalkJoins.some((m) => m.userId === uid);
    },

    talkJoinUsers (tid: number) {
        const talk = mapTalks.get(tid);
        return talk ? talk.TalkJoins.map(tj => tj.userId) : [];
    },

    /**
     *
     */
    async getUserTalks() {},
    /**
     *
     */
    async reloadTalks() {
        const talks = await TalkRepository.joinMappinTalks();
        mapTalks.clear();
        talks.map((talk) => mapTalks.set(talk.id, talk));
    },

    async reloadTalk(tid: number) {
        const talk = await TalkRepository.find(tid);
        mapTalks.delete(tid);
        if (talk) {
            mapTalks.set(tid, talk);
        }
    },

};
