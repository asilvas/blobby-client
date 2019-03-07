const retry = require('./retry');

module.exports = (client, storage, fileKey, opts = {}) => {
  const { waitForReplicas } = opts;

  return new Promise(async (resolve, reject) => {
    if (Array.isArray(storage.config.replicas) && storage.config.replicas.length > 0) {
      try {
        const replicaTasks = storage.config.replicas.map(replica => writeToReplica(client, replica, fileKey, opts));
        if (waitForReplicas !== false) {
          await Promise.all(replicaTasks);
        } // else do not wait
      } catch (ex) {
        // ignore, continue
      }
    }

    // ORDER MATTERS: we block on writing to replicas so that if a replica fails, the master will still reflect
    //                the previous state. This way it can retried at a later time.

    retry(storage.removeDirectory.bind(storage, fileKey), client.config.retry, err => {
      if (err) return void reject(err);

      resolve();
    });
  });
}

async function writeToReplica(client, replica, fileKey, opts) {
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

  return new Promise((resolve, reject) => {
    retry(storage.removeDirectory.bind(storage, fileKey), config.retry, err => {
      if (err) return void reject(err);

      resolve();
    })
  });
}
