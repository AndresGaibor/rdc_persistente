import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInstallPlan } from '../src/install-plan.js';

test('macOS install plan keeps portable paths and launchd labels', () => {
  const plan = buildInstallPlan({ platform: 'darwin', home: '/Users/example' });
  assert.equal(plan.appDir, '/Users/example/.local/share/rdc-persistente/app');
  assert.equal(plan.stateDir, '/Users/example/.local/state/rdc-persistente');
  assert.equal(plan.remotePlist, '/Users/example/Library/LaunchAgents/dev.rdc.macos-supervisor.remote.plist');
  assert.deepEqual(plan.labels, [
    'dev.rdc.macos-supervisor.remote',
    'dev.rdc.macos-supervisor.watchdog'
  ]);
});

test('Windows install plan exposes package-owned scheduled tasks', () => {
  const plan = buildInstallPlan({ platform: 'win32', home: 'C:\\Users\\Example', localAppData: 'C:\\Local' });
  assert.equal(plan.appDir, 'C:\\Local\\RdcPersistente\\app');
  assert.deepEqual(plan.taskNames, ['RdcPersistente\\Remote', 'RdcPersistente\\Watchdog']);
});