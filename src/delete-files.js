const retry = require('./retry');

module.exports = async (client, storage, fileKey, opts = {}) => {
  const { waitForReplicas } = opts;

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

  return retry(storage.removeDirectory.bind(storage, fileKey), client.config.retry);
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

  return retry(storage.removeDirectory.bind(storage, fileKey), config.retry);
}
