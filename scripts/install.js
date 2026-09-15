#!/usr/bin/env node
import { cp, mkdir, readFile, rm, writeFile, chmod } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildInstallPlan } from '../src/install-plan.js';
import { renderLaunchAgents } from '../src/launchd.js';

const VERSION = '0.2.47';
const home = process.env.HOME || homedir();
const plan = buildInstallPlan(home);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const activate = args.has('--activate');
const replaceLabels = (process.env.RDC_REPLACE_LABELS || '').split(',').map((v) => v.trim()).filter(Boolean);
const domain = `gui/${process.getuid()}`;

async function runtimeVersion(root) {
  try {
    const file = path.join(root, 'node_modules/@wonderwhy-er/desktop-commander/package.json');
    return JSON.parse(await readFile(file, 'utf8')).version;
  } catch { return null; }
}

function launchctl(...parts) {
  try { execFileSync('/bin/launchctl', parts, { stdio: 'ignore' }); return true; }
  catch { return false; }
}
if (process.platform !== 'darwin') throw new Error('This installer only supports macOS.');
await mkdir(plan.stateDir, { recursive: true, mode: 0o700 });
await mkdir(plan.launchAgentsDir, { recursive: true });
await rm(plan.appDir, { recursive: true, force: true });
await mkdir(plan.appDir, { recursive: true });
await cp(path.join(repoRoot, 'src'), path.join(plan.appDir, 'src'), { recursive: true });
await cp(path.join(repoRoot, 'bin'), path.join(plan.appDir, 'bin'), { recursive: true });
await writeFile(path.join(plan.appDir, 'package.json'), '{"type":"module"}\n');
for (const file of ['remote.js', 'watchdog.js']) await chmod(path.join(plan.appDir, 'bin', file), 0o755);

if (await runtimeVersion(plan.runtimeDir) !== VERSION) {
  await mkdir(plan.runtimeDir, { recursive: true });
  execFileSync('npm', [
    'install', '--prefix', plan.runtimeDir,
    `@wonderwhy-er/desktop-commander@${VERSION}`,
    '--omit=dev', '--no-audit', '--no-fund'
  ], { stdio: 'inherit' });
}

const agents = renderLaunchAgents({ home, nodePath: process.execPath });
await writeFile(plan.remotePlist, agents.remote, { mode: 0o600 });
await writeFile(plan.watchdogPlist, agents.watchdog, { mode: 0o600 });
execFileSync('/usr/bin/plutil', ['-lint', plan.remotePlist, plan.watchdogPlist], { stdio: 'inherit' });
if (activate) {
  for (const [label, plist] of [[plan.labels[0], plan.remotePlist], [plan.labels[1], plan.watchdogPlist]]) {
    launchctl('bootout', `${domain}/${label}`);
    execFileSync('/bin/launchctl', ['bootstrap', domain, plist], { stdio: 'inherit' });
  }
  execFileSync('/bin/launchctl', ['kickstart', '-k', `${domain}/${plan.labels[0]}`], { stdio: 'inherit' });
  for (const label of replaceLabels) {
    launchctl('disable', `${domain}/${label}`);
    launchctl('bootout', `${domain}/${label}`);
  }
}

console.log(`Staged app: ${plan.appDir}`);
console.log(`LaunchAgents: ${plan.remotePlist}, ${plan.watchdogPlist}`);
console.log(`Runtime: ${plan.runtimeDir}`);
console.log(activate ? 'Activated launchd services.' : 'Staged only. Re-run with --activate to enable.');
