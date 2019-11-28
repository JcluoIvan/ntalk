import fs from 'fs';
import path from 'path';
import { log } from './config/logger';
const config = {
    basepath: __dirname,
};

async function render(fpath: string, data?: { [key: string]: string }) {
    return new Promise((resolve, reject) => {
        fs.readFile(path.resolve(config.basepath, fpath), (err, buffer) => {
            if (err) {
                log.error(`<${err.code}> ${err.message}`);
                reject(err);
                return;
            }
            let str = buffer.toString();
            if (data) {
                let str = Object.keys(data || {}).reduce(
                    (s, key) => s.replace(`{{${key}}}`, data[key]),
                    buffer.toString(),
                );
            }
            resolve(str);
        });
    });
}

export const viewRender = (basepath: string) => {
    config.basepath = basepath;
    return render;
};
