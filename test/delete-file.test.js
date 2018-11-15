const test = require('ava');
const argv = require('../config/options');
const BlobbyClient = require('../');

const configPromise = BlobbyClient.getConfigs(argv);

async function getConfig() {
  const configs = await configPromise;
  return configs[0];
}

test('DELETE local/test/delete1.txt', async t => {
  const config = await getConfig();
  const client = new BlobbyClient(argv, config);
  const storage = client.getStorage('local');
  const randText = Math.random().toString();
  const headers = await client.putFile(storage, 'test/delete1.txt', { buffer: Buffer.from(randText) });
  t.true(typeof headers === 'object');

  const [nextHeaders, data] = await client.getFile(storage, 'test/delete1.txt', { acl: 'public' });
  t.true(typeof nextHeaders === 'object');
  t.true(data.toString() === randText);

  await client.deleteFile(storage, 'test/delete1.txt');
  await t.throwsAsync(client.getFile(storage, 'test/delete1.txt', { acl: 'public' }));
});
