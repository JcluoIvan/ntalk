export const helpers = {
    hasKeys(obj: any, key: string) {
        let target = obj;
        return key.split('.').every((k) => {
            target = obj[k];
            return !!target;
        });
    },
    value(obj: any, key: string, def = null) {
        let target = obj;
        const keys = key.split('.');
        target = keys.reduce<any>((t, k) => (t && t[k] === undefined ? null : t[k]), target);
        return target === null ? def : target;
    },
};
