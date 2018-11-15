const test = require('ava');
const argv = require('../config/options');
const BlobbyClient = require('../');

const configPromise = BlobbyClient.getConfigs(argv);

async function getConfig() {
  const configs = await configPromise;
  return configs[0];
}

test('GET local/test/getFiles1/ with public acls', async t => {
  const config = await getConfig();
  const client = new BlobbyClient(argv, config);
  const storage = client.getStorage('local');

  const randText = Math.random().toString();
  await client.putFile(storage, 'test/getFiles1/a.txt', { buffer: Buffer.from(randText) });
  await client.putFile(storage, 'test/getFiles1/b.txt', { buffer: Buffer.from(randText) });
  await client.putFile(storage, 'test/getFiles1/c.txt', { buffer: Buffer.from(randText) });

  const [files, dirs, lastKey] = await client.getFiles(storage, 'test/getFiles1', { acl: 'public' });
  t.true(Array.isArray(files));
  t.is(files.length, 3);
  t.true(Array.isArray(dirs));
  t.is(dirs.length, 0);
  t.is(typeof lastKey, 'undefined');

  await client.deleteFiles(storage, 'test/getFiles1');
});
