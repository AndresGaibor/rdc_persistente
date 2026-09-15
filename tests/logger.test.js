import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { RotatingLogger, shouldLogRemoteLine } from '../src/logger.js';

test('remote log filter drops tool payloads and auth codes but keeps lifecycle events', () => {
  assert.equal(shouldLogRemoteLine('🔧 Received tool call abc: write_file {"content":"huge"}'), false);
  assert.equal(shouldLogRemoteLine('stderr: 🔧 Received tool call abc: write_file {"content":"huge"}'), false);
  assert.equal(shouldLogRemoteLine('✅ Tool call write_file completed:'), false);
  assert.equal(shouldLogRemoteLine('stderr: {"content":[{"text":"huge"}]}'), false);
  assert.equal(shouldLogRemoteLine('ABCD-1234'), false);
  assert.equal(shouldLogRemoteLine('✅ Device ready:'), true);
  assert.equal(shouldLogRemoteLine('   - 🔌 Connected to Remote MCP'), true);
});

test('rotating logger caps active file and preserves previous generation', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'rdc-log-'));
  const file = path.join(dir, 'remote.log');
  const logger = new RotatingLogger(file, { maxBytes: 20, backups: 1 });
  await logger.log('1234567890');
  await logger.log('abcdefghij');
  await logger.log('ROTATE');
  assert.match(await readFile(`${file}.1`, 'utf8'), /1234567890/);
  assert.match(await readFile(file, 'utf8'), /ROTATE/);
});
