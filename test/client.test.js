const test = require('ava');
const argv = require('../config/options');
const BlobbyClient = require('../');

const configPromise = BlobbyClient.getConfigs(argv);

async function getConfig() {
  const configs = await configPromise;
  return configs[0];
}

test('init client', async t => {
  const config = await getConfig();
  const client = new BlobbyClient(argv, config);
  t.pass();
});

test('get storage', async t => {
  const config = await getConfig();
  const client = new BlobbyClient(argv, config);
  const storage = client.getStorage('local');
  t.true(storage.id === 'local');
});
