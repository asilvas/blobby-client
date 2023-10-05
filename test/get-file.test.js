const test = require('ava');
const sinon = require('sinon');
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

test('GET local/test/ab.txt returns error on non-existent file', async t => {
  const config = await getConfig();
  const client = new BlobbyClient(argv, config);
  const storage = client.getStorage('local');
  const fetchStub = sinon.stub(storage, "fetch");
  fetchStub.rejects(new Error('an error'));
  await client.getFile(storage, 'test/ab.txt', { acl: 'public' })
    .catch(err => {
      t.is(err.message, 'an error');
      t.true(fetchStub.calledOnce);
    });
  fetchStub.restore();
});

test('GET local/test/a+b.txt returns error if status code is not 403 or 404', async t => {
  const config = await getConfig();
  const client = new BlobbyClient(argv, config);
  const storage = client.getStorage('local');
  const fetchStub = sinon.stub(storage, "fetch");
  fetchStub.rejects(new Error('an error'));
  await client.getFile(storage, 'test/a+b.txt', { acl: 'public' })
    .catch(err => {
      t.is(err.message, 'an error');
      t.true(fetchStub.calledOnce);
    });
  fetchStub.restore();
});

test('GET local/test/a+b.txt auto retries a%2Bb.txt', async t => {
  const randText = Math.random().toString();
  const config = await getConfig();
  const client = new BlobbyClient(argv, config);
  const storage = client.getStorage('local');
  const fetchStub = sinon.stub(storage, "fetch");
  fetchStub
    .onFirstCall().rejects({ statusCode: 403 })
    .onSecondCall().resolves([{ etag: '123' }, Buffer.from(randText)]);
  await client.putFile(storage, 'test/a%2Bb.txt', { buffer: Buffer.from(randText) }, { headers: { etag: '123' } });
  const [, data] = await client.getFile(storage, 'test/a+b.txt', { acl: 'public' });
  t.is(fetchStub.args[0][0], 'test/a+b.txt');
  t.is(fetchStub.args[1][0], 'test/a%2Bb.txt');
  t.true(Buffer.isBuffer(data));
  t.is(data.toString(), randText);

  fetchStub.restore();

  await client.deleteFile(storage, 'test/a+b.txt');
  await client.deleteFile(storage, 'test/a%2Bb.txt');
});

test('GET local/test/a b, c d.txt auto retries test/a b%2C c d.txt', async t => {
  const randText = Math.random().toString();
  const config = await getConfig();
  const client = new BlobbyClient(argv, config);
  const storage = client.getStorage('local');
  const fetchStub = sinon.stub(storage, 'fetch');
  fetchStub
    .onFirstCall().rejects({ statusCode: 403 })
    .onSecondCall().resolves([{ etag: '123' }, Buffer.from(randText)]);
  await client.putFile(storage, 'test/a b%2C c d.txt', { buffer: Buffer.from(randText) }, { headers: { etag: '123' } });
  const [, data] = await client.getFile(storage, 'test/a b, c d.txt', { acl: 'public' });
  t.is(fetchStub.args[0][0], 'test/a b, c d.txt');
  t.is(fetchStub.args[1][0], 'test/a b%2C c d.txt');

  t.true(Buffer.isBuffer(data));
  t.is(data.toString(), randText);

  fetchStub.restore();

  await client.deleteFile(storage, 'test/a b, c d.txt');
  await client.deleteFile(storage, 'test/a b%2C c d.txt');
});
