#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import path from 'node:path';
import { FileStateStore } from '../src/state.js';

const exec = promisify(execFile);
const home = process.env.HOME || homedir();
const state = new FileStateStore(path.join(home, '.local/state/rdc-macos-supervisor'));
const domain = `gui/${process.getuid()}`;
const extraLabels = (process.env.RDC_STATUS_LABELS || '').split(',').map((v) => v.trim()).filter(Boolean);
const labels = ['dev.rdc.macos-supervisor.remote', 'dev.rdc.macos-supervisor.watchdog', ...extraLabels];

async function service(label) {
  try {
    const { stdout } = await exec('/bin/launchctl', ['print', `${domain}/${label}`]);
    const stateMatch = stdout.match(/state = ([^\n]+)/);
    const pidMatch = stdout.match(/pid = (\d+)/);
    return { label, loaded: true, state: stateMatch?.[1]?.trim() || 'unknown', pid: pidMatch?.[1] || null };
  } catch { return { label, loaded: false }; }
}

for (const label of labels) console.log(JSON.stringify(await service(label)));
console.log(JSON.stringify({ supervisorState: await state.get('status'), lastError: await state.get('last_error') }));
