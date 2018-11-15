const test = require('ava');
const argv = require('../config/options');
const BlobbyClient = require('../');

const configPromise = BlobbyClient.getConfigs(argv);

async function getConfig() {
  const configs = await configPromise;
  return configs[0];
}

test('DELETE local/deleteFiles1', async t => {
  const config = await getConfig();
  const client = new BlobbyClient(argv, config);
  const storage = client.getStorage('local');
  const randText = Math.random().toString();
  await client.putFile(storage, 'deleteFiles1/a.txt', { buffer: Buffer.from(randText) });
  await client.putFile(storage, 'deleteFiles1/b.txt', { buffer: Buffer.from(randText) });
  await client.putFile(storage, 'deleteFiles1/c.txt', { buffer: Buffer.from(randText) });

  let [nextHeaders, data] = await client.getFile(storage, 'deleteFiles1/a.txt', { acl: 'public' });
  t.true(typeof nextHeaders === 'object');
  t.true(data.toString() === randText);
  [nextHeaders, data] = await client.getFile(storage, 'deleteFiles1/b.txt', { acl: 'public' });
  t.true(typeof nextHeaders === 'object');
  t.true(data.toString() === randText);
  [nextHeaders, data] = await client.getFile(storage, 'deleteFiles1/c.txt', { acl: 'public' });
  t.true(typeof nextHeaders === 'object');
  t.true(data.toString() === randText);

  await client.deleteFiles(storage, 'deleteFiles1');
  await t.throwsAsync(client.getFile(storage, 'deleteFiles1/a.txt', { acl: 'public' }));
  await t.throwsAsync(client.getFile(storage, 'deleteFiles1/b.txt', { acl: 'public' }));
  await t.throwsAsync(client.getFile(storage, 'deleteFiles1/c.txt', { acl: 'public' }));
});
