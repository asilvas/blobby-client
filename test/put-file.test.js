const test = require('ava');
const argv = require('../config/options');
const BlobbyClient = require('../');

const configPromise = BlobbyClient.getConfigs(argv);

async function getConfig() {
  const configs = await configPromise;
  return configs[0];
}

test('PUT local/test/put1.txt', async t => {
  const config = await getConfig();
  const client = new BlobbyClient(argv, config);
  const storage = client.getStorage('local');
  const randText = Math.random().toString();
  const headers = await client.putFile(storage, 'test/put1.txt', { buffer: Buffer.from(randText) });
  t.true(typeof headers === 'object');

  const [nextHeaders, data] = await client.getFile(storage, 'test/put1.txt', { acl: 'public' });
  t.true(typeof nextHeaders === 'object');
  t.true(data.toString() === randText);

  await client.deleteFile(storage, 'test/put1.txt');
});

test('Cannot write file without file.buffer', async t => {
  const config = await getConfig();
  const client = new BlobbyClient(argv, config);
  const storage = client.getStorage('local');
  const randText = Math.random().toString();
  await t.throwsAsync(client.putFile(storage, 'test/put0.txt'));
});

test('COPY local/test/put2.txt put3.txt', async t => {
  const config = await getConfig();
  const client = new BlobbyClient(argv, config);
  const storage = client.getStorage('local');
  const randText = Math.random().toString();
  await client.putFile(storage, 'test/put2.txt', { buffer: Buffer.from(randText) });
  await client.putFile(storage, 'test/put3.txt', {}, { headers: { 'x-amz-copy-source': 'local:test/put2.txt' } });

  const [, data] = await client.getFile(storage, 'test/put3.txt', { acl: 'public' });
  t.true(Buffer.isBuffer(data));
  t.is(data.toString(), randText);

  await client.deleteFile(storage, 'test/put2.txt');
  await client.deleteFile(storage, 'test/put3.txt');
});
