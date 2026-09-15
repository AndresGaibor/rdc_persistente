#!/usr/bin/env node
import { cp, mkdir, readFile, rm, writeFile, chmod } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildInstallPlan } from '../src/install-plan.js';
import { renderLaunchAgents } from '../src/launchd.js';
import { buildMacOSLifecycle } from '../src/platform/macos/installer.js';
import { buildWindowsLifecycle } from '../src/platform/windows/installer.js';

const DC_VERSION = '0.2.47';
const platform = process.platform;
if (!['darwin', 'win32'].includes(platform)) throw new Error(`Unsupported platform: ${platform}`);
const home = process.env.HOME || process.env.USERPROFILE || homedir();
const plan = buildInstallPlan({ platform, home, localAppData: process.env.LOCALAPPDATA });
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const activate = args.has('--activate');
const dryRun = args.has('--dry-run');
const replaceLabels = (process.env.RDC_REPLACE_LABELS || '').split(',').map((v) => v.trim()).filter(Boolean);

async function runtimeVersion(root) {
  try {
    const file = path.join(root, 'node_modules/@wonderwhy-er/desktop-commander/package.json');
    return JSON.parse(await readFile(file, 'utf8')).version;
  } catch { return null; }
}

function run(command, { ignoreFailure = false } = {}) {
  const [file, ...parts] = command;
  if (dryRun) { console.log(`[dry-run] ${[file, ...parts].join(' ')}`); return; }
  try { execFileSync(file, parts, { stdio: 'inherit', windowsHide: true }); }
  catch (error) { if (!ignoreFailure) throw error; }
}

if (!dryRun) {
  await mkdir(plan.stateDir, { recursive: true, mode: 0o700 });
  if (platform === 'darwin') await mkdir(plan.launchAgentsDir, { recursive: true });
  await rm(plan.appDir, { recursive: true, force: true });
  await mkdir(plan.appDir, { recursive: true });
  await cp(path.join(repoRoot, 'src'), path.join(plan.appDir, 'src'), { recursive: true });
  await cp(path.join(repoRoot, 'bin'), path.join(plan.appDir, 'bin'), { recursive: true });
  await writeFile(path.join(plan.appDir, 'package.json'), '{"type":"module"}\n');
  if (platform === 'darwin') {
    for (const file of ['remote.js', 'watchdog.js']) await chmod(path.join(plan.appDir, 'bin', file), 0o755);
  }

  if (await runtimeVersion(plan.runtimeDir) !== DC_VERSION) {
    await mkdir(plan.runtimeDir, { recursive: true });
    const npm = platform === 'win32' ? 'npm.cmd' : 'npm';
    execFileSync(npm, ['install', '--prefix', plan.runtimeDir, `@wonderwhy-er/desktop-commander@${DC_VERSION}`, '--omit=dev', '--no-audit', '--no-fund'], {
      stdio: 'inherit', windowsHide: true
    });
  }
}

let lifecycle;
if (platform === 'darwin') {
  const agents = renderLaunchAgents({ home, nodePath: process.execPath });
  if (!dryRun) {
    await writeFile(plan.remotePlist, agents.remote, { mode: 0o600 });
    await writeFile(plan.watchdogPlist, agents.watchdog, { mode: 0o600 });
    execFileSync('/usr/bin/plutil', ['-lint', plan.remotePlist, plan.watchdogPlist], { stdio: 'inherit' });
  }
  lifecycle = buildMacOSLifecycle({ uid: process.getuid(), plan, replaceLabels });
} else {
  lifecycle = buildWindowsLifecycle({ nodePath: process.execPath, appDir: plan.appDir });
}

if (activate) {
  for (const command of lifecycle.activate) {
    const ignoreFailure = platform === 'darwin' && ['bootout', 'disable'].includes(command[1]);
    run(command, { ignoreFailure });
  }
}

console.log(`Platform: ${platform}`);
console.log(`App: ${plan.appDir}`);
console.log(`Runtime: ${plan.runtimeDir}`);
console.log(`State: ${plan.stateDir}`);
console.log(activate ? 'Persistence activated.' : 'Staged only. Re-run with --activate to enable persistence.');
