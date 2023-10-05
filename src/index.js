const EventEmitter = require('events');
const chalk = require('chalk');
const getConfigById = require('./config/get-config-by-id');
const getConfigs = require('./config/get-configs');
const getStorage = require('./storage');
const putFile = require('./put-file');
const deleteFile = require('./delete-file');
const deleteFiles = require('./delete-files');

module.exports = class BlobbyClient extends EventEmitter {
  constructor(argv, globalConfig) {
    super();

    this.argv = argv;
    this.config = globalConfig;

    const log = this.config.log;
    if (log.warnings) {
      this.on('warn', msg => {
        const o = typeof msg === 'object' ? msg : { message: msg };
        o.level = 'warn';
        console.warn(chalk.yellow(JSON.stringify(o)));
      });
    }
    if (log.errors) {
      this.on('error', msg => {
        const o = typeof msg === 'object' ? msg : { message: msg };
        o.level = 'error';
        console.error(chalk.red(JSON.stringify(o)));
      });
    }
  }

  static getConfigs(argv) {
    return getConfigs(argv);
  }

  getConfig(configId) {
    return getConfigById(configId, this.argv);
  }

  getStorage(storageId, customConfig) {
    return getStorage(customConfig || this.config, storageId);
  }

  headFile(storage, fileKey, opts) {
    return storage.fetchInfo(fileKey, opts);
  }

  async getFile(storage, fileKey, opts) {
    const $client = this;

    return storage.fetch(fileKey, opts).catch(err => {
      console.log('err', err)
      const { statusCode } = err;
      const encodedFileKey = decodeURI(fileKey.split('/').map(encodeURIComponent).join('/'));
      if (encodedFileKey === fileKey || ![403, 404].includes(statusCode)) {
        throw err;
      }
      return storage.fetch(encodedFileKey, opts).then(([headers1, data1]) => {
        // fire-and-forget (non-blocking)
        putFile($client, storage, fileKey, { headers: headers1, buffer: data1 }, { contentType: headers1.ContentType })
          .catch(() => null);
        return [headers1, data1];
      });
    });
  }

  getFiles(storage, dirPath, opts) {
    return storage.list(dirPath, opts);
  }

  putFile(storage, fileKey, file, opts) {
    return putFile(this, storage, fileKey, file, opts);
  }

  deleteFile(storage, fileKey, opts) {
    return deleteFile(this, storage, fileKey, opts);
  }

  deleteFiles(storage, fileKey, opts) {
    return deleteFiles(this, storage, fileKey, opts);
  }
}
