import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWindowsLifecycle } from '../src/platform/windows/installer.js';
import { buildMacOSLifecycle } from '../src/platform/macos/installer.js';

test('Windows lifecycle creates, runs, queries and deletes only package tasks', () => {
  const life = buildWindowsLifecycle({ nodePath: 'C:\\Rdc\\node.exe', appDir: 'C:\\Rdc\\app' });
  assert.equal(life.activate.length, 4);
  assert.deepEqual(life.activate[0].slice(0, 3), ['schtasks.exe', '/Create', '/F']);
  assert.equal(life.activate.flat().some((v) => String(v).includes('/RP')), false);
  assert.deepEqual(life.status.map((cmd) => cmd[0]), ['schtasks.exe', 'schtasks.exe']);
  assert.deepEqual(life.uninstall.map((cmd) => cmd[0]), ['schtasks.exe', 'schtasks.exe']);
  assert.equal(life.uninstall.flat().filter((v) => v === '/Delete').length, 2);
});

test('macOS lifecycle bootstraps package launch agents and can replace legacy labels', () => {
  const life = buildMacOSLifecycle({
    uid: 501,
    plan: { labels: ['a.remote', 'a.watchdog'], remotePlist: '/tmp/r.plist', watchdogPlist: '/tmp/w.plist' },
    replaceLabels: ['legacy.remote']
  });
  assert.deepEqual(life.activate[0], ['/bin/launchctl', 'bootout', 'gui/501/a.remote']);
  assert.deepEqual(life.activate.at(-2), ['/bin/launchctl', 'disable', 'gui/501/legacy.remote']);
  assert.deepEqual(life.activate.at(-1), ['/bin/launchctl', 'bootout', 'gui/501/legacy.remote']);
  assert.equal(life.status.length, 2);
  assert.equal(life.uninstall.length, 2);
});