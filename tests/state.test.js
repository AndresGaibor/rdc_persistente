import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FileStateStore, sanitizeLine } from '../src/state.js';
import { parseDesktopCommanderLine } from '../src/parser.js';

test('sanitizes OAuth tokens before logs are persisted or echoed', () => {
  const line = '{"access_token":"abc","refresh_token":"def","ok":true}';
  assert.equal(sanitizeLine(line), '{"access_token":"[REDACTED]","refresh_token":"[REDACTED]","ok":true}');
});

test('state store rejects secret-like keys and writes ordinary state atomically', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'rdc-state-'));
  const state = new FileStateStore(dir);
  await assert.rejects(() => state.set('access_token', 'nope'), /Unsafe state key/);
  await state.set('status', 'ready');
  assert.equal(await state.get('status'), 'ready');
  assert.equal(await readFile(path.join(dir, 'status'), 'utf8'), 'ready');
});

test('parser tracks auth request and clears auth data when device becomes ready', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'rdc-state-'));
  const state = new FileStateStore(dir);
  await parseDesktopCommanderLine('https://mcp.desktopcommander.app/device/verify', state, 1000);
  await parseDesktopCommanderLine('ABCD-1234', state, 1000);
  await parseDesktopCommanderLine('Code expires in 15 minutes.', state, 1000);
  assert.equal(await state.get('status'), 'auth_required');
  assert.equal(await state.get('auth_ttl_seconds'), '900');
  await parseDesktopCommanderLine('✅ Device ready: test-device', state, 1010);
  assert.equal(await state.get('status'), 'ready');
  assert.equal(await state.get('auth_code'), '');
  assert.equal(await state.get('auth_url'), '');
});

test('parser tolerates ENOSPC state failures so RDC output handling stays alive', async () => {
  const state = {
    async set() { const error = new Error('disk full'); error.code = 'ENOSPC'; throw error; },
    async delete() { const error = new Error('disk full'); error.code = 'ENOSPC'; throw error; }
  };
  await assert.doesNotReject(() => parseDesktopCommanderLine('🚀 Starting MCP Device...', state, 1000));
});
