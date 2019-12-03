import * as fs from 'fs';
import * as path from 'path';
import { log } from './config/logger';
const config = {
    basepath: __dirname,
};

async function render(fpath: string, data?: { [key: string]: string }) {
    return new Promise((resolve, reject) => {
        fs.readFile(path.resolve(config.basepath, fpath), (err: NodeJS.ErrnoException | null, buffer: Buffer) => {
            if (err) {
                log.error(`<${err.code}> ${err.message}`);
                reject(err);
                return;
            }
            let str = buffer.toString();
            log.warn(data);
            if (data) {
                str = Object.keys(data || {}).reduce((s, key) => s.replace(`{{${key}}}`, data[key]), str);
            }
            resolve(str);
        });
    });
}

export const viewRender = (basepath: string) => {
    config.basepath = basepath;
    return render;
};
