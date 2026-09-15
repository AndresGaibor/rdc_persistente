#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import path from 'node:path';
import { FileStateStore } from '../src/state.js';
import { evaluateSupervisor } from '../src/watchdog-policy.js';
import { RotatingLogger } from '../src/logger.js';
import { buildPlatformPaths } from '../src/platform/paths.js';
import { buildRemoteServiceCommands, serviceOutputIsRunning } from '../src/platform/service-control.js';

const exec = promisify(execFile);
const home = process.env.HOME || process.env.USERPROFILE || homedir();
const paths = buildPlatformPaths({ platform: process.platform, home, localAppData: process.env.LOCALAPPDATA });
const state = new FileStateStore(process.env.RDC_STATE_DIR || paths.stateDir);
const logger = new RotatingLogger(path.join(state.dir, 'watchdog.log'), { maxBytes: 1024 * 1024, backups: 2 });
const commands = buildRemoteServiceCommands({
  platform: process.platform,
  uid: process.platform === 'darwin' ? process.getuid() : undefined
});

async function execute(command) {
  const [file, ...args] = command;
  return exec(file, args, { windowsHide: true });
}

async function isRunning() {
  try {
    const { stdout } = await execute(commands.query);
    return serviceOutputIsRunning(process.platform, stdout);
  } catch { return false; }
}
async function readNumber(key, fallback) {
  const value = Number(await state.get(key));
  return Number.isFinite(value) ? value : fallback;
}

const now = Math.floor(Date.now() / 1000);
const decision = evaluateSupervisor({
  agentRunning: await isRunning(),
  status: await state.get('status'),
  now,
  startedAt: await readNumber('started_at', now),
  authStartedAt: await readNumber('auth_started_at', now),
  authTtlSeconds: await readNumber('auth_ttl_seconds', 900),
  lastError: await state.get('last_error')
});

if (decision.action === 'healthy') {
  try { await state.set('failure_count', 0); await state.delete('degraded_reason'); } catch {}
  process.exit(0);
}

if (decision.action === 'restart') {
  const current = await readNumber('failure_count', 0);
  try {
    await state.set('failure_count', current + 1);
    await state.set('degraded_reason', decision.reason);
  } catch {}
  await logger.log(`restart reason=${decision.reason} count=${current + 1}`);
  try { await execute(commands.restart); }
  catch (error) { await logger.log(`restart_error ${error.message}`); }
}
