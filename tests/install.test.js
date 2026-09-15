import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInstallPlan } from '../src/install-plan.js';

test('install plan uses portable user paths and distinct launchd labels', () => {
  const plan = buildInstallPlan('/Users/example');
  assert.equal(plan.appDir, '/Users/example/.local/share/rdc-macos-supervisor/app');
  assert.equal(plan.stateDir, '/Users/example/.local/state/rdc-macos-supervisor');
  assert.equal(plan.remotePlist, '/Users/example/Library/LaunchAgents/dev.rdc.macos-supervisor.remote.plist');
  assert.equal(plan.watchdogPlist, '/Users/example/Library/LaunchAgents/dev.rdc.macos-supervisor.watchdog.plist');
  assert.deepEqual(plan.labels, [
    'dev.rdc.macos-supervisor.remote',
    'dev.rdc.macos-supervisor.watchdog'
  ]);
  assert.equal(JSON.stringify(plan).includes('andres'), false);
});
