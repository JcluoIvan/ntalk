const BaseRepository = require('./base_repository');

module.exports = class TalkResponse extends BaseRepository {
    constructor() {
        super();
        this.table = 'talk';
        this.columnTimestamp.updatedAt = null;
    }

    async allTalks(uid) {
        const talks = await this.getTalks(uid);
        const talkIds = talks.map((t) => t.id);
        const singleIds = talks.filter((t) => t.type === 'single').map((t) => t.id);

        // 查詢各對話群的最後一筆對話記錄
        const messages = await this.getTalkLastMessages(uid, talkIds);

        // 查詢 1對1 的對話
        const singleMaps = this.getSingleTargetUserId(uid, singleIds);

        return talks.map((talk) => {
            // 組合 1對1 對話的對象至 target_id
            if (talk.type === 'single') {
                const target = singleMaps.find((s) => s.talk_id === talk.id);
                talk.target_id = target ? target.user_id : 0;
            }

            // 組合 最後一次對話記錄
            const last = messages.find((m) => m.talk_id === talk.id);
            talk.last_message = last || null;
            return talk;
        });
    }

    /**
     *
     * @param {Number} uid
     */
    async getTalks(uid) {
        let sql = `
            SELECT 
                talk.id, 
                talk.type, 
                talk.name, 
                talk.image, 
                talk.created_at,
                tkmap.unread, 
                tkmap.last_read_id
            FROM talk
            RIGHT JOIN (
                SELECT *
                FROM talk_mapping
                WHERE user_id = ?
            ) AS tkmap ON (talk.id = tkmap.talk_id)`;
        const talks = await this.query(sql, [uid]);
        return talks.map((talk) => {
            talk.id = Number(talk.id);
            talk.last_read_id = Number(talk.last_read_id) || 0;
            talk.unread = Number(talk.unread) || 0;
            return talk;
        });
    }

    async getTalkLastMessages(uid, talkIds) {
        if (!talkIds || talkIds.length === 0) {
            return [];
        }

        const joinIds = talkIds.map((t) => Number(t.id) || 0).join(',');
        let sql = `
            SELECT *
            FROM message
            WHERE id IN (
                SELECT MAX(id)
                FROM message
                WHERE talk_id in (${joinIds})
                    AND user_id = ?
                GROUP BY talk_id
            )
        `;
        const messages = await this.query(sql, [uid]);
        return messages.map((msg) => {
            msg.id = Number(msg.id);
            msg.user_id = Number(msg.user_id);
            msg.talk_id = Number(msg.talk_id);
        });
    }

    async getSingleTargetUserId(uid, singleTalkIds) {
        const joinIds = singleTalkIds.map((t) => Number(t.id)).join(',');
        if (!joinIds) {
            return [];
        }
        sql = `
            SELECT id, user_id, talk_id
            FROM talk_mapping 
            WHERE talk_id IN (${joinIds})
                AND user_id != ?`;
        const maps = await this.query(sql, [uid]);
        return maps.map((o) => {
            o.id = Number(o.id);
            o.user_id = Number(o.user_id);
            o.talk_id = Number(o.talk_id);
            return o;
        });
    }
};
