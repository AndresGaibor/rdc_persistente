#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import path from 'node:path';
import { FileStateStore } from '../src/state.js';
import { evaluateSupervisor } from '../src/watchdog-policy.js';
import { RotatingLogger } from '../src/logger.js';

const exec = promisify(execFile);
const home = process.env.HOME || homedir();
const state = new FileStateStore(process.env.RDC_STATE_DIR || path.join(home, '.local/state/rdc-macos-supervisor'));
const logger = new RotatingLogger(path.join(state.dir, 'watchdog.log'), { maxBytes: 1024 * 1024, backups: 2 });
const label = 'dev.rdc.macos-supervisor.remote';
const domain = `gui/${process.getuid()}`;

async function isRunning() {
  try {
    const { stdout } = await exec('/bin/launchctl', ['print', `${domain}/${label}`]);
    return /state = running/.test(stdout);
  } catch { return false; }
}

async function readNumber(key, fallback) {
  const value = Number(await state.get(key));
  return Number.isFinite(value) ? value : fallback;
}
const now = Math.floor(Date.now() / 1000);
const status = await state.get('status');
const decision = evaluateSupervisor({
  agentRunning: await isRunning(),
  status,
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
  try { await exec('/bin/launchctl', ['kickstart', '-k', `${domain}/${label}`]); }
  catch (error) { await logger.log(`kickstart_error ${error.message}`); }
}
