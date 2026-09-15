#!/usr/bin/env node
import { rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { buildInstallPlan } from '../src/install-plan.js';
import { buildMacOSLifecycle } from '../src/platform/macos/installer.js';
import { buildWindowsLifecycle } from '../src/platform/windows/installer.js';

const platform = process.platform;
if (!['darwin', 'win32'].includes(platform)) throw new Error(`Unsupported platform: ${platform}`);
const home = process.env.HOME || process.env.USERPROFILE || homedir();
const plan = buildInstallPlan({ platform, home, localAppData: process.env.LOCALAPPDATA });
const servicesOnly = process.argv.includes('--services-only');
const lifecycle = platform === 'darwin'
  ? buildMacOSLifecycle({ uid: process.getuid(), plan })
  : buildWindowsLifecycle({ nodePath: process.execPath, appDir: plan.appDir });

for (const [file, ...args] of lifecycle.uninstall) {
  try { execFileSync(file, args, { stdio: 'ignore', windowsHide: true }); } catch {}
}
if (!servicesOnly) {
  if (platform === 'darwin') {
    await rm(plan.remotePlist, { force: true });
    await rm(plan.watchdogPlist, { force: true });
    await rm(plan.stateDir, { recursive: true, force: true });
  }
  await rm(plan.baseDir, { recursive: true, force: true });
}
console.log(servicesOnly ? 'Persistence services removed.' : 'RDC Persistente uninstalled; external account data preserved.');
