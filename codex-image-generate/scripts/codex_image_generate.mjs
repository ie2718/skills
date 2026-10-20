#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import toml from './vendor/smol-toml/index.cjs';

export class Failure extends Error {}
const extensions = ['.png', '.jpg', '.jpeg', '.webp'];
const expandPath = p => path.resolve(p === '~' ? os.homedir() : p.startsWith('~/') || p.startsWith('~\\') ? path.join(os.homedir(), p.slice(2)) : p);
const homeDir = a => expandPath(a.codex_home || process.env.CODEX_HOME || '~/.codex');
const expand = value => String(value).replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => {
  if (!process.env[key]) throw new Failure(`Missing environment variable: ${key}`);
  return process.env[key];
});
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);

export function parseArgs(argv) {
  const a = { api: 'auto', image: [], timeout: 180, workspace_dir: process.cwd() };
  const values = new Set('codex-home config auth profile provider base-url gemini-base-url state-dir size quality model api image output timeout workspace-dir'.split(' '));
  const flags = new Set(['latest', 'list-models', 'all-models', 'overwrite', 'help']);
  let positional = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!positional && arg === '--') { positional = true; continue; }
    if (!positional && (arg.startsWith('--') || arg === '-h')) {
      const [key, ...rest] = (arg === '-h' ? 'help' : arg.slice(2)).split('=');
      const name = key.replaceAll('-', '_');
      if (flags.has(key) && !rest.length) { a[name] = true; continue; }
      if (!values.has(key)) throw new Failure(`Unknown option: --${key}`);
      const value = rest.length ? rest.join('=') : argv[++i];
      if (value === undefined || value.startsWith('--')) throw new Failure(`Missing value for --${key}`);
      if (name === 'image') a.image.push(value); else a[name] = value;
    } else {
      if (a.prompt !== undefined) throw new Failure('Provide one quoted prompt.');
      a.prompt = arg;
    }
  }
  if (a.help) return a;
  a.timeout = Number(a.timeout);
  if (!Number.isFinite(a.timeout) || a.timeout <= 0 || a.timeout > 2147483) throw new Failure('--timeout must be positive and at most 2147483 seconds.');
  if (!['auto', 'openai', 'gemini'].includes(a.api)) throw new Failure('--api must be auto, openai or gemini.');
  if (a.model && a.latest) throw new Failure('--model and --latest are mutually exclusive.');
  if (a.all_models && !a.list_models) throw new Failure('--all-models requires --list-models.');
  if (!a.list_models && !a.prompt?.trim()) throw new Failure('Provide a prompt or use --list-models.');
  return a;
}

export function readConfig(a) {
  const configPath = a.config ? expandPath(a.config) : path.join(homeDir(a), 'config.toml');
  const authPath = a.auth ? expandPath(a.auth) : path.join(homeDir(a), 'auth.json');
  let config, auth;
  try {
    if (a.config && !fs.existsSync(configPath) || a.auth && !fs.existsSync(authPath)) throw new Error();
    config = fs.existsSync(configPath) ? toml.parse(fs.readFileSync(configPath, 'utf8')) : {};
    auth = fs.existsSync(authPath) ? JSON.parse(fs.readFileSync(authPath, 'utf8')) : {};
    if (!object(config) || !object(auth)) throw new Error();
  } catch { throw new Failure('Cannot read/parse Codex config or auth file; check paths, format and permissions.'); }
  const profile = a.profile || config.profile;
  if (profile) {
    if (!object(config.profiles?.[profile])) throw new Failure('Unknown config profile.');
    config = { ...config, ...config.profiles[profile] };
  }
  const providerId = a.provider || config.model_provider || 'openai';
  a.resolved_profile = profile ?? null;
  a.resolved_provider = providerId;
  const provider = config.model_providers?.[providerId] || {};
  const base = a.base_url || provider.base_url || config.base_url || (providerId === 'openai' ? 'https://api.openai.com/v1' : null);
  if (!base) throw new Failure('No base_url for selected provider.');
  let key;
  if (provider.env_key) {
    key = process.env[provider.env_key];
    if (!key) throw new Failure(`Missing provider credential environment variable: ${provider.env_key}`);
  } else key = auth.OPENAI_API_KEY || process.env.OPENAI_API_KEY || provider.OPENAI_API_KEY || config.OPENAI_API_KEY;
  if (!key) throw new Failure('No OPENAI_API_KEY found; ChatGPT login tokens are not API keys.');
  const headers = {};
  for (const [name, value] of Object.entries(provider.http_headers || {})) headers[name] = expand(value);
  for (const [name, variable] of Object.entries(provider.env_http_headers || {})) {
    if (!process.env[variable]) throw new Failure(`Missing header environment variable: ${variable}`);
    headers[name] = process.env[variable];
  }
  if (!Object.keys(headers).some(k => k.toLowerCase() === 'authorization')) headers.Authorization = `Bearer ${expand(key)}`;
  return { base: expand(base).replace(/\/+$/, ''), headers };
}

function validateUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Failure('Expected an HTTP(S) URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Failure('Expected an HTTP(S) URL without embedded credentials.');
  return url;
}

export async function request(url, { headers, body, contentType, timeout = 180 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout * 1000);
  try {
    for (let redirects = 0; redirects <= 5; redirects++) {
      validateUrl(url);
      const h = new Headers(headers || {});
      if (contentType) h.set('Content-Type', contentType);
      const response = await fetch(url, { method: body === undefined ? 'GET' : 'POST', headers: h, body, redirect: 'manual', signal: controller.signal });
      if (!headers && [301, 302, 303, 307, 308].includes(response.status) && response.headers.get('location')) {
        const next = new URL(response.headers.get('location'), url).href;
        await response.body?.cancel();
        url = next;
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new Failure(`HTTP ${response.status}; check provider endpoint, model access and request options.`);
      }
      return Buffer.from(await response.arrayBuffer());
    }
    throw new Failure('Too many image download redirects.');
  } catch (error) {
    if (error instanceof Failure) throw error;
    throw new Failure('Network request failed or timed out; check connectivity and provider availability.');
  } finally { clearTimeout(timer); }
}

async function apiJson(url, headers, payload, timeout, contentType) {
  if (object(payload) && !Buffer.isBuffer(payload)) { payload = JSON.stringify(payload); contentType = 'application/json'; }
  const raw = await request(url, { headers, body: payload, timeout, contentType });
  try { const result = JSON.parse(raw.toString()); if (object(result)) return result; } catch {}
  throw new Failure('Provider returned invalid JSON or an unexpected JSON structure.');
}
export const modelRoute = model => /gemini/i.test(model) && /image/i.test(model) ? 'gemini' : 'openai';
export function imageCandidate(item) {
  const modalities = [...(Array.isArray(item.output_modalities) ? item.output_modalities : []), ...(Array.isArray(item.architecture?.output_modalities) ? item.architecture.output_modalities : [])];
  return /gpt-image|dall-e/i.test(item.id) || modelRoute(item.id) === 'gemini' || modalities.includes('image');
}
export async function discover(base, headers, timeout) {
  const result = await apiJson(`${base}/models`, headers, undefined, timeout);
  if (!Array.isArray(result.data)) throw new Failure('Expected an OpenAI-compatible /models data array; use --model for known IDs.');
  return result.data.filter(x => object(x) && typeof x.id === 'string');
}
export function chooseModel(items) {
  const candidates = items.filter(imageCandidate).map(x => x.id);
  if (!candidates.length) throw new Failure('No image candidates found. Inspect --list-models --all-models or supply --model.');
  const rank = name => {
    const family = /gpt-image/i.test(name) ? 3 : modelRoute(name) === 'gemini' ? 2 : 1;
    const version = name.match(/(?:gpt-image-|gemini-|dall-e-)(\d+(?:\.\d+)*)/i)?.[1].split('.').map(Number) || [];
    return { family, version, canonical: /^gpt-image-\d+(?:\.\d+)*$/i.test(name) ? 1 : 0 };
  };
  return candidates.sort((a, b) => {
    const x = rank(a), y = rank(b);
    if (x.family !== y.family) return y.family - x.family;
    for (let i = 0; i < Math.max(x.version.length, y.version.length); i++) {
      const difference = (y.version[i] ?? -1) - (x.version[i] ?? -1);
      if (difference) return difference;
    }
    return y.canonical - x.canonical || b.localeCompare(a);
  })[0];
}

// Match Python json.dumps' ASCII escaping and separators to retain existing model memory.
function legacyJson(array) {
  return '[' + array.map(x => JSON.stringify(x ?? null).replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))).join(', ') + ']';
}
export function preferencePath(a, base) {
  const config = a.config ? expandPath(a.config) : path.join(homeDir(a), 'config.toml');
  const identity = legacyJson([realPath(config), a.resolved_profile ?? a.profile, a.resolved_provider ?? a.provider, base, a.gemini_base_url]);
  const directory = a.state_dir ? expandPath(a.state_dir) : path.join(homeDir(a), 'skill-state', 'codex-image-generate');
  return path.join(directory, createHash('sha256').update(identity).digest('hex') + '.json');
}
export function loadPreference(file) {
  try { const value = JSON.parse(fs.readFileSync(file, 'utf8')); if (typeof value?.model === 'string' && value.model && ['openai', 'gemini'].includes(value.api)) return value; } catch {}
  return null;
}
function rememberModel(file, model, api, log) {
  const temp = file + '.' + randomUUID() + '.tmp';
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(temp, JSON.stringify({ model, api }), { flag: 'wx', mode: 0o600 });
    fs.renameSync(temp, file);
  } catch { log('Warning: image saved, but model preference could not be saved.'); }
  finally { try { fs.unlinkSync(temp); } catch {} }
}

export function imageExtension(data) {
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return ['.png', 'image/png'];
  if (data.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return ['.jpg', 'image/jpeg'];
  if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return ['.webp', 'image/webp'];
  throw new Failure('Expected a PNG, JPEG or WebP image; refusing to save non-image content.');
}
export function decodeImage(value) {
  const invalid = () => { throw new Failure('Provider returned invalid base64 image data.'); };
  if (typeof value !== 'string' || !value.length || value.length % 4) invalid();
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  // A repeated-group regexp can overflow V8's stack on multi-megabyte images.
  // Scan once with constant stack usage; Buffer.from alone accepts malformed input.
  for (let i = 0; i < value.length - padding; i++) {
    const c = value.charCodeAt(i);
    if (!(c >= 65 && c <= 90 || c >= 97 && c <= 122 || c >= 48 && c <= 57 || c === 43 || c === 47)) invalid();
  }
  return Buffer.from(value, 'base64');
}
function multipart(fields, images) {
  const boundary = 'codeximage' + randomUUID().replaceAll('-', '');
  const chunks = [];
  for (const [name, value] of Object.entries(fields)) chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  for (const image of images) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${images.length > 1 ? 'image[]' : 'image'}"; filename="${image.filename}"\r\nContent-Type: ${image.mime}\r\n\r\n`), image.data, Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}
async function generate(a, base, headers, model, images) {
  if (a.api === 'gemini') {
    if (a.size || a.quality) throw new Failure('--size and --quality apply only to the OpenAI route.');
    const parts = [{ text: a.prompt }, ...images.map(x => ({ inlineData: { mimeType: x.mime, data: x.data.toString('base64') } }))];
    const gemini = a.gemini_base_url || base.replace(/\/(v1|v1beta)$/, '') + '/v1beta';
    const response = await apiJson(`${gemini.replace(/\/+$/, '')}/models/${encodeURIComponent(model)}:generateContent`, headers, { contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } }, a.timeout);
    for (const candidate of response.candidates || []) for (const part of candidate.content?.parts || []) {
      const inline = part.inlineData || part.inline_data;
      if (inline?.data) return decodeImage(inline.data);
    }
  } else {
    const payload = { model, prompt: a.prompt, n: 1 };
    if (a.size) payload.size = a.size;
    if (a.quality) payload.quality = a.quality;
    if (/dall-e/i.test(model)) payload.response_format = 'b64_json';
    const form = images.length ? multipart(payload, images) : null;
    const response = await apiJson(`${base}/images/${form ? 'edits' : 'generations'}`, headers, form ? form.body : payload, a.timeout, form?.contentType);
    for (const item of response.data || []) {
      if (item.b64_json) return decodeImage(item.b64_json);
      if (item.url) return request(item.url, { timeout: a.timeout });
    }
  }
  throw new Failure('Provider returned no image; check model capability, prompt restrictions and endpoint support.');
}

function realPath(file, depth = 0) {
  if (depth > 40) throw new Failure('Too many symbolic links in output path.');
  try { return fs.realpathSync(file); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    try {
      if (fs.lstatSync(file).isSymbolicLink()) return realPath(path.resolve(path.dirname(file), fs.readlinkSync(file)), depth + 1);
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
    const parent = path.dirname(file);
    if (parent === file) throw error;
    return path.join(realPath(parent, depth + 1), path.basename(file));
  }
}
const withExtension = (file, ext) => file.slice(0, file.length - path.extname(file).length) + ext;
export function workspaceOutput(workspace, output) {
  const root = realPath(expandPath(workspace));
  if (!fs.statSync(root).isDirectory()) throw new Failure('Workspace directory does not exist.');
  const requested = output || path.join('output', `codex-image-${randomUUID().replaceAll('-', '').slice(0, 12)}.png`);
  const file = realPath(requested.startsWith('~') ? expandPath(requested) : path.resolve(root, requested));
  for (const candidate of [file, ...extensions.map(ext => realPath(withExtension(file, ext)))]) {
    const relative = path.relative(root, candidate);
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Failure('Image output must stay inside the current conversation/project workspace.');
  }
  return file;
}
function saveImage(output, data, a) {
  const [extension] = imageExtension(data);
  const suffix = path.extname(output).toLowerCase();
  const corrected = suffix === extension || extension === '.jpg' && suffix === '.jpeg' ? output : withExtension(output, extension);
  const file = workspaceOutput(a.workspace_dir, corrected);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data, { flag: a.overwrite ? 'w' : 'wx' });
  return file;
}

export async function main(argv = process.argv.slice(2), io = { out: console.log, err: console.error }) {
  try {
    if (Number(process.versions.node.split('.')[0]) < 18) throw new Failure('Node.js 18 or newer is required.');
    const a = parseArgs(argv);
    if (a.help) {
      io.out(`Usage: node codex_image_generate.mjs [options] "PROMPT"
  --list-models [--all-models]  Discover available models
  --model ID | --latest        Explicit model or rediscover newest
  --workspace-dir DIR          Current conversation/project (default: cwd)
  --output PATH                Workspace-local path (default: unique output/*.png)
  --image PATH                 Reference image; repeatable
  --api auto|openai|gemini      Route override
  --size SIZE --quality VALUE  OpenAI options
  --codex-home DIR --config FILE --auth FILE
  --profile NAME --provider ID --base-url URL --gemini-base-url URL
  --state-dir DIR              Model memory directory
  --timeout SECONDS            Default 180; no generation retries
  --overwrite                 Replace existing output
  --help                      Show help`);
      return 0;
    }
    const { base, headers } = readConfig(a);
    if (a.list_models) {
      const items = await discover(base, headers, a.timeout);
      io.out(JSON.stringify(items.filter(x => a.all_models || imageCandidate(x)).map(x => ({ id: x.id, api: modelRoute(x.id), image_candidate: imageCandidate(x) })), null, 2));
      return 0;
    }
    const output = workspaceOutput(a.workspace_dir, a.output);
    if (!a.overwrite && [output, ...extensions.map(ext => withExtension(output, ext))].some(fs.existsSync)) throw new Failure('Output already exists; choose a new path or pass --overwrite.');
    const images = a.image.map((file, index) => {
      const data = fs.readFileSync(expandPath(file));
      const [extension, mime] = imageExtension(data);
      return { filename: `reference-${index}${extension}`, mime, data };
    });
    const memory = preferencePath(a, base);
    const previous = a.model || a.latest ? null : loadPreference(memory);
    const model = a.model || previous?.model || chooseModel(await discover(base, headers, a.timeout));
    if (a.api === 'auto') a.api = previous?.api || modelRoute(model);
    io.err(`Using image model: ${model}`);
    const data = await generate(a, base, headers, model, images);
    const file = saveImage(output, data, a);
    rememberModel(memory, model, a.api, io.err);
    io.err(`Image saved successfully. Generation model ID: ${model}`);
    io.out(file);
    return 0;
  } catch (error) {
    io.err(`codex-image-generate: ${error instanceof Failure ? error.message : 'Invalid config/response or unreadable/unwritable local file.'}`);
    return 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = await main();
