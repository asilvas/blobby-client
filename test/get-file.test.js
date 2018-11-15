const test = require('ava');
const argv = require('../config/options');
const BlobbyClient = require('../');

const configPromise = BlobbyClient.getConfigs(argv);

async function getConfig() {
  const configs = await configPromise;
  return configs[0];
}

test('GET local/file1.log with public acls', async t => {
  const config = await getConfig();
  const client = new BlobbyClient(argv, config);
  const storage = client.getStorage('local');
  const [headers, data] = await client.getFile(storage, 'file1.log', { acl: 'public' });
  t.true(typeof headers === 'object');
  t.true(Buffer.isBuffer(data));
});
