const test = require('ava');
const argv = require('../config/options');
const BlobbyClient = require('../');

const configPromise = BlobbyClient.getConfigs(argv);

async function getConfig() {
  const configs = await configPromise;
  return configs[0];
}

test('getConfigs', async t => {
  const config = await getConfig();
  t.true(config.id === 'local');
});

test('get local config', async t => {
  const config = await getConfig();
  const client = new BlobbyClient(argv, config);
  const local = await client.getConfig('local');
  t.true(local.id === 'local');
  t.is(local.secret, 'local-secret', 'local secret');
});

test('get local-alt config', async t => {
  const config = await getConfig();
  const client = new BlobbyClient(argv, config);
  const local = await client.getConfig('local-alt');
  t.true(local.id === 'local-alt');
  t.is(local.secret, 'local-alt-secret', 'local secret');
});

test('get test1.json config', async t => {
  const config = await getConfig();
  const client = new BlobbyClient(argv, config);
  const local = await client.getConfig('test1');
  t.true(local && local.id === 'test1');
});

test('get test2.js config', async t => {
  const config = await getConfig();
  const client = new BlobbyClient(argv, config);
  const local = await client.getConfig('test2');
  t.true(local && local.id === 'test2');
});
