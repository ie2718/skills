import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { main, chooseModel, workspaceOutput, preferencePath, readConfig, parseArgs, request } from '../scripts/codex_image_generate.mjs';
import toml from '../scripts/vendor/smol-toml/index.cjs';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=', 'base64');
async function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-image-node-'));
  const calls = [];
  let mode = 'base64';
  const server = http.createServer(async (req, res) => {
    const parts = []; for await (const part of req) parts.push(part);
    calls.push({ url: req.url, headers: req.headers, body: Buffer.concat(parts) });
    if (req.url.endsWith('/models')) return res.end(JSON.stringify({ data: ['chat-model', 'gpt-image-2', 'gpt-image-2.5-sunburst', 'gpt-image-2.5', 'gemini-3.1-flash-image'].map(id => ({ id })) }));
    if (req.url === '/download') return res.end(PNG);
    if (mode === 'error') { res.writeHead(401); return res.end('fake-secret echoed by gateway'); }
    if (mode === 'redirect') { res.writeHead(302, { Location: '/download' }); return res.end(); }
    if (mode === 'slow') { const timer = setTimeout(() => res.end('{}'), 1000); res.on('close', () => clearTimeout(timer)); return; }
    if (mode === 'empty') return res.end('{"data":[]}');
    if (mode === 'invalid-image') return res.end(JSON.stringify({ data: [{ b64_json: Buffer.from('<html>error</html>').toString('base64') }] }));
    if (mode === 'bad-base64') return res.end('{"data":[{"b64_json":"@@@="}]}');
    if (mode === 'url') return res.end(JSON.stringify({ data: [{ url: `http://127.0.0.1:${server.address().port}/download` }] }));
    if (req.url.endsWith(':generateContent')) return res.end(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: PNG.toString('base64') } }] } }] }));
    res.end(JSON.stringify({ data: [{ b64_json: PNG.toString('base64') }] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); fs.rmSync(root, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const config = `model_provider="proxy"\n[model_providers.proxy]\nbase_url="${base}/prefix/v1"\n`;
  fs.writeFileSync(path.join(root, 'config.toml'), config);
  fs.writeFileSync(path.join(root, 'auth.json'), '{"OPENAI_API_KEY":"fake-secret"}');
  const run = async (...args) => {
    const out = [], err = [];
    const code = await main(['--codex-home', root, '--workspace-dir', root, ...args], { out: x => out.push(x), err: x => err.push(x) });
    assert.ok(![...out, ...err].join('\n').includes('fake-secret'));
    return { code, out, err, file: out.at(-1) };
  };
  return { root, base, config, calls, run, setMode: value => { mode = value; } };
}

test('numeric version ranking and canonical model preference', () => {
  assert.equal(chooseModel(['gpt-image-2.5-flare','gpt-image-2.5','gpt-image-2','gemini-3.1-flash-image'].map(id => ({ id }))), 'gpt-image-2.5');
  assert.equal(chooseModel(['gpt-image-2.9','gpt-image-2.10'].map(id => ({ id }))), 'gpt-image-2.10');
  assert.throws(() => chooseModel([{ id: 'chat' }]));
});
test('TOML quoted keys, multiline strings, arrays and inline tables', () => {
  const doc = toml.parse(`title="""hello\nworld"""\n[model_providers."a.b"]\nbase_url='https://example.com/v1'\nhttp_headers={ "X-Test" = "value#1" }\nlist=["a",\n"b"]\n`);
  assert.equal(doc.model_providers['a.b'].http_headers['X-Test'], 'value#1');
  assert.equal(doc.title, 'hello\nworld');
  assert.deepEqual(doc.model_providers['a.b'].list, ['a', 'b']);
});
test('discover, save unique workspace outputs and remember latest model', async t => {
  const f = await fixture(t);
  const first = await f.run('a panda'); assert.equal(first.code, 0, first.err.join());
  assert.deepEqual(fs.readFileSync(first.file), PNG);
  assert.equal(path.dirname(first.file), path.join(fs.realpathSync(f.root), 'output'));
  assert.equal(f.calls[0].url, '/prefix/v1/models');
  const body = JSON.parse(f.calls[1].body); assert.equal(body.model, 'gpt-image-2.5'); assert.equal(body.response_format, undefined);
  assert.ok(first.err.includes('Image saved successfully. Generation model ID: gpt-image-2.5'));
  f.calls.length = 0;
  const next = await f.run('another panda'); assert.equal(next.code, 0); assert.notEqual(first.file, next.file); assert.equal(f.calls.length, 1);
});
test('explicit model, --latest and failed generation preserve memory', async t => {
  const f = await fixture(t);
  assert.equal((await f.run('--model', 'gpt-image-2', 'panda')).code, 0);
  f.setMode('error'); assert.equal((await f.run('--model', 'gpt-image-2.5', 'panda')).code, 1);
  f.setMode('base64'); f.calls.length = 0;
  assert.equal((await f.run('panda')).code, 0); assert.equal(JSON.parse(f.calls[0].body).model, 'gpt-image-2');
  assert.equal((await f.run('--latest', 'panda')).code, 0); assert.equal(JSON.parse(f.calls.at(-1).body).model, 'gpt-image-2.5');
});
test('Gemini references and remembered route for alias', async t => {
  const f = await fixture(t); const ref = path.join(f.root, 'ref.png'); fs.writeFileSync(ref, PNG);
  assert.equal((await f.run('--model','custom-alias','--api','gemini','--image',ref,'panda')).code, 0);
  assert.equal(f.calls[0].url, '/prefix/v1beta/models/custom-alias:generateContent');
  assert.equal(JSON.parse(f.calls[0].body).contents[0].parts[1].inlineData.mimeType, 'image/png');
  f.calls.length = 0; assert.equal((await f.run('panda')).code, 0); assert.equal(f.calls[0].url, '/prefix/v1beta/models/custom-alias:generateContent');
});
test('OpenAI multipart references and DALL-E response format', async t => {
  const f = await fixture(t); const ref = path.join(f.root, 'ref.png'); fs.writeFileSync(ref, PNG);
  assert.equal((await f.run('--model','dall-e-2','--image',ref,'--image',ref,'panda')).code, 0);
  assert.equal(f.calls[0].url, '/prefix/v1/images/edits');
  assert.equal(f.calls[0].body.toString().match(/name="image\[\]"/g).length, 2);
  assert.ok(f.calls[0].body.includes(PNG)); assert.ok(f.calls[0].body.includes(Buffer.from('b64_json')));
});
test('URL image downloads omit all API headers', async t => {
  const f = await fixture(t); f.setMode('url');
  fs.writeFileSync(path.join(f.root,'config.toml'), f.config + '[model_providers.proxy.http_headers]\nX-Api-Key="secret-header"\n');
  assert.equal((await f.run('--model','gpt-image-2','panda')).code, 0);
  assert.equal(f.calls[0].headers['x-api-key'], 'secret-header');
  assert.equal(f.calls[1].headers.authorization, undefined); assert.equal(f.calls[1].headers['x-api-key'], undefined);
});
test('errors, redirects, empty responses and invalid images do not retry or save', async t => {
  const f = await fixture(t);
  for (const mode of ['error','redirect','empty','invalid-image','bad-base64']) {
    f.setMode(mode); f.calls.length = 0;
    const result = await f.run('--model','gpt-image-2','panda'); assert.equal(result.code, 1); assert.equal(f.calls.length, 1); assert.equal(result.out.length, 0);
  }
});
test('timeout is bounded and does not retry', async t => {
  const f = await fixture(t); f.setMode('slow');
  const result = await f.run('--model','gpt-image-2','--timeout','0.05','panda');
  assert.equal(result.code, 1); assert.equal(f.calls.length, 1);
});
test('relative outputs, corrected extensions, overwrite and escape protection', async t => {
  const f = await fixture(t);
  const result = await f.run('--model','gpt-image-2','--output','images/panda.jpg','panda'); assert.equal(result.code, 0); assert.ok(result.file.endsWith('panda.png'));
  f.calls.length = 0;
  assert.equal((await f.run('--output','images/panda.jpg','panda')).code, 1);
  assert.equal((await f.run('--output','../outside.png','panda')).code, 1); assert.equal(f.calls.length, 0);
  assert.equal((await f.run('--output','images/panda.jpg','--overwrite','panda')).code, 0);
});
test('symlink escape including dangling corrected extension', async t => {
  const f = await fixture(t);
  fs.symlinkSync(path.dirname(f.root), path.join(f.root,'external'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => workspaceOutput(f.root,'external/x.png'));
  if (process.platform !== 'win32') {
    fs.symlinkSync(path.join(path.dirname(f.root),'missing.jpg'), path.join(f.root,'x.jpg'));
    assert.throws(() => workspaceOutput(f.root,'x.png'));
  }
});
test('profile credentials, expansion and custom headers', async t => {
  const f = await fixture(t);
  const keys = ['CODEX_IMAGE_TEST_BASE','CODEX_IMAGE_TEST_KEY']; const old = keys.map(k => process.env[k]);
  t.after(() => keys.forEach((k,i) => old[i] === undefined ? delete process.env[k] : process.env[k] = old[i]));
  process.env[keys[0]] = f.base; process.env[keys[1]] = 'profile-secret';
  fs.writeFileSync(path.join(f.root,'config.toml'), f.config + '[profiles.alt]\nmodel_provider="second"\n[model_providers.second]\nbase_url="${CODEX_IMAGE_TEST_BASE}/v1"\nenv_key="CODEX_IMAGE_TEST_KEY"\n[model_providers.second.env_http_headers]\nX-Tenant="CODEX_IMAGE_TEST_KEY"\n');
  assert.equal((await f.run('--profile','alt','--list-models')).code, 0);
  assert.equal(f.calls[0].headers.authorization,'Bearer profile-secret'); assert.equal(f.calls[0].headers['x-tenant'],'profile-secret');
  delete process.env[keys[1]]; assert.equal((await f.run('--profile','alt','--list-models')).code, 1);
});
test('memory scope, corruption and unwritable state directory', async t => {
  const f = await fixture(t); const a = parseArgs(['--codex-home',f.root,'--list-models']); const { base } = readConfig(a);
  assert.equal((await f.run('--model','gpt-image-2','panda')).code, 0);
  const state = preferencePath(a,base); assert.equal(JSON.parse(fs.readFileSync(state)).model,'gpt-image-2');
  fs.writeFileSync(state,'broken'); f.calls.length = 0; assert.equal((await f.run('panda')).code,0); assert.ok(f.calls[0].url.endsWith('/models'));
  assert.notEqual(preferencePath(a,base+'/other'),state);
  const block = path.join(f.root,'block'); fs.writeFileSync(block,'file');
  const result = await f.run('--state-dir',block,'panda'); assert.equal(result.code,0); assert.ok(result.err.some(x => x.includes('preference could not be saved')));
});
test('CLI rejects invalid options and keeps help dependency-free', async () => {
  assert.throws(() => parseArgs(['--model','x','--latest','panda']));
  assert.throws(() => parseArgs(['--timeout','NaN','panda']));
  assert.throws(() => parseArgs(['--all-models']));
  assert.equal(await main(['--help'],{out:()=>{},err:()=>{}}),0);
  await assert.rejects(request('file:///tmp/private'));
});
