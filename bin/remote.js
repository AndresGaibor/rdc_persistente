#!/usr/bin/env node
import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { FileStateStore, sanitizeLine } from '../src/state.js';
import { parseDesktopCommanderLine } from '../src/parser.js';
import { RotatingLogger, shouldLogRemoteLine } from '../src/logger.js';
import { createLineReader, resolveDesktopCommanderEntry } from '../src/remote-utils.js';
import { buildPlatformPaths } from '../src/platform/paths.js';

const home = process.env.HOME || process.env.USERPROFILE || homedir();
const paths = buildPlatformPaths({
  platform: process.platform,
  home,
  localAppData: process.env.LOCALAPPDATA
});
const stateDir = process.env.RDC_STATE_DIR || paths.stateDir;
const state = new FileStateStore(stateDir);
const logger = new RotatingLogger(path.join(stateDir, 'remote.log'));
const roots = [process.env.RDC_RUNTIME_DIR, paths.runtimeDir];
if (process.platform === 'darwin') {
  roots.push(path.join(home, '.local/share/desktop-commander-runtime-macos'));
}

async function findEntry() {
  for (const root of roots.filter(Boolean)) {
    const entry = resolveDesktopCommanderEntry(root);
    try { await access(entry); return entry; } catch {}
  }
  throw new Error('Desktop Commander runtime not found. Run the installer again.');
}
async function safeState(key, value) {
  try { await state.set(key, value); }
  catch (error) {
    if (!['ENOSPC', 'EDQUOT', 'EROFS', 'EACCES'].includes(error?.code)) throw error;
  }
}

async function handleLine(raw) {
  const line = sanitizeLine(raw);
  try { await parseDesktopCommanderLine(line, state); }
  catch (error) { await logger.log(`parser_error ${error?.message || error}`); }
  if (shouldLogRemoteLine(line)) await logger.log(line);
}

const entry = await findEntry();
await safeState('status', 'starting');
await safeState('started_at', Math.floor(Date.now() / 1000));
const child = spawn(process.execPath, [entry, 'remote', '--persist-session'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
});
const stdout = createLineReader(handleLine);
const stderr = createLineReader((line) => handleLine(`stderr: ${line}`));
child.stdout.on('data', (chunk) => stdout.push(chunk));
child.stderr.on('data', (chunk) => stderr.push(chunk));
child.stdout.on('end', () => stdout.end());
child.stderr.on('end', () => stderr.end());
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => { if (!child.killed) child.kill(signal); });
}

child.on('error', async (error) => {
  await safeState('status', 'failed');
  await safeState('last_error', `spawn_${error.code || 'error'}`);
  await logger.log(`spawn_error ${error.message}`);
  process.exitCode = 1;
});

child.on('exit', async (code, signal) => {
  const exitCode = Number.isInteger(code) ? code : 1;
  await safeState('last_exit_code', exitCode);
  await safeState('exited_at', Math.floor(Date.now() / 1000));
  if (exitCode !== 0) {
    await safeState('status', 'failed');
    await safeState('last_error', signal ? `signal_${signal}` : `child_exit_${exitCode}`);
  }
  process.exitCode = exitCode;
});
