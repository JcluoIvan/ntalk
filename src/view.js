const fs = require('fs');
const path = require('path');
const log = require('./config/logger');

const config = {
    basepath: __dirname,
};

async function render(fpath, data = {}) {
    return new Promise((resolve, reject) => {
        fs.readFile(path.resolve(config.basepath, fpath), (err, buffer) => {
            if (err) {
                log.error(`<${err.code}> ${err.message}`);
                reject(err);
                return;
            }
            let str = Object.keys(data).reduce((s, key) => s.replace(`{{${key}}}`, data[key]), buffer.toString());
            resolve(str);
            str = null;
        });
    });
}

module.exports = (basepath) => {
    config.basepath = basepath;
    return render;
};
