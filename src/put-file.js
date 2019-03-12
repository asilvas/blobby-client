const retry = require('./retry');

module.exports = async (client, storage, fileKey, file, opts = {}) => {
  const { waitForReplicas, headers = {}, contentType='application/octet-stream' } = opts;
  if (!file.headers) file.headers = {};

  // use request content-type if known, otherwise try to auto-detect
  const headerContentType = headers['content-type'];
  // use content-type provided by header if explicit enough, otherwise use format detected by extension
  const ContentType = (headerContentType && headerContentType !== 'binary/octet-stream' && headerContentType !== 'application/x-www-form-urlencoded') ? headerContentType : contentType;
  const ETag = headers['etag'];
  const LastModified = headers['last-modified'];
  // use request cache-control if avail, otherwise fallback storage setting
  const CacheControl = headers['cache-control'] || storage.config.cacheControl;
  const AccessControl = headers['x-amz-acl'] || storage.config.accessControl || 'public-read';
  const CopySource = headers['x-amz-copy-source'];
  const CopyAndReplace = CopySource && headers['x-amz-metadata-directive'] === 'REPLACE';
  const copySourceSplit = CopySource && CopySource.split(':');
  const SourceBucket = (copySourceSplit && copySourceSplit.length >= 2 && copySourceSplit[0]) || null;
  const sourceKey = copySourceSplit && copySourceSplit[copySourceSplit.length - 1];
  const isCopySupported = CopySource
    && typeof storage.copy === 'function'
    && (!storage.config.replicas || storage.config.replicas.reduce((state, r) => !state ? false : typeof storage.copy === 'function', true))
  ; // all-or-nothing native copy support
  const CustomHeaders = {};
  Object.keys(headers).forEach(k => {
    const xHeader = /^x\-(.*)$/.exec(k);
    if (xHeader && k !== 'x-amz-acl') {
      CustomHeaders[xHeader[1]] = headers[k]; // forward custom headers
    }
  });
  const fileInfo = { ContentType, CacheControl, AccessControl, CustomHeaders, bucket: SourceBucket, CopyAndReplace }; // storage file headers
  if (ETag) fileInfo.ETag = ETag;
  if (LastModified) fileInfo.LastModified = LastModified;

  let copyFile;
  if (sourceKey) { // if source is provided, attempt a copy
    if (isCopySupported) { // native copy support comes later
      copyFile = { headers: fileInfo };
    } else {
      copyFile = await new Promise((resolve, reject) => {
        storage.fetch(sourceKey, { acl: 'private' }, (err, headers, buffer) => {
          if (err) {
            err.statusCode = 404;
            return void reject(err);
          }
    
          headers.bucket = SourceBucket;

          resolve({ headers, buffer });
        });
      });
    }
  } else if (!Buffer.isBuffer(file.buffer)) {
    throw new Error('Cannot write file without `buffer`');
  } else {
    file.headers = fileInfo;
  }

  let op = sourceKey && storage.copy
    ? storage.copy.bind(storage, sourceKey, fileKey, copyFile.headers)
    : storage.store.bind(storage, fileKey, copyFile ? copyFile : file, {})
  ;

  // always initiate write to master first
  const writeMasterPromise = new Promise((resolve, reject) => {
    retry(op, client.config.retry, (err, headers) => {
      if (err) return void reject(err);

      const finalHeaders = headers || (copyFile ? copyFile.headers : file.headers) || {};
      if (!finalHeaders.ETag && ETag) {
        finalHeaders.ETag = ETag; // not all clients provide ETag on write
      }
      finalHeaders.ContentType = finalHeaders.ContentType || ContentType;

      resolve(finalHeaders);
    });
  });

  if (Array.isArray(storage.config.replicas) && storage.config.replicas.length > 0) {
    try {
      const replicaTasks = storage.config.replicas.map(replica => writeToReplica(client, replica, sourceKey, fileKey, copyFile ? copyFile : file, opts));
      if (waitForReplicas !== false) {
        await Promise.all(replicaTasks);
      } // else do not wait
    } catch (ex) {
      throw ex;
    }
  }

  // let the caller wait on promise
  return writeMasterPromise;
}

async function writeToReplica(client, replica, sourceKey, destinationKey, file, opts) {
  const { headers = {} } = opts;

  const replicaSplit = replica.split('::');
  const configId = replicaSplit.length > 1 ? replicaSplit[0] : null;
  const storageId = replicaSplit.length > 1 ? replicaSplit[1] : replicaSplit[0];

  let config;
  if (configId) {
    config = await client.getConfig(configId);
  } else {
    config = client.config;
  }

  const storage = client.getStorage(storageId, config);

  // use caching provided by the specific environment storage config
  file.headers.CacheControl = headers['cache-control'] || storage.config.cacheControl;

  const op = sourceKey && storage.copy // use copy if requested and supported
    ? storage.copy.bind(storage, sourceKey, destinationKey, file.headers)
    : storage.store.bind(storage, destinationKey, file, {})
  ;

  return new Promise((resolve, reject) => {    
    retry(op, config.retry, (err, headers) => {
      if (err) return void reject(err);

      resolve(headers);
    })
  });
}
