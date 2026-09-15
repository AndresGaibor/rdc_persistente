import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlatformPaths } from '../src/platform/paths.js';

test('builds macOS user-owned paths', () => {
  const paths = buildPlatformPaths({ platform: 'darwin', home: '/Users/example' });
  assert.equal(paths.appDir, '/Users/example/.local/share/rdc-persistente/app');
  assert.equal(paths.runtimeDir, '/Users/example/.local/share/rdc-persistente/runtime');
  assert.equal(paths.stateDir, '/Users/example/.local/state/rdc-persistente');
  assert.equal(paths.launchAgentsDir, '/Users/example/Library/LaunchAgents');
});

test('builds Windows user-owned paths from LOCALAPPDATA', () => {
  const paths = buildPlatformPaths({
    platform: 'win32',
    home: 'C:\\Users\\Example',
    localAppData: 'C:\\Users\\Example\\AppData\\Local'
  });
  assert.equal(paths.baseDir, 'C:\\Users\\Example\\AppData\\Local\\RdcPersistente');
  assert.equal(paths.appDir, 'C:\\Users\\Example\\AppData\\Local\\RdcPersistente\\app');
  assert.equal(paths.runtimeDir, 'C:\\Users\\Example\\AppData\\Local\\RdcPersistente\\runtime');
  assert.equal(paths.stateDir, 'C:\\Users\\Example\\AppData\\Local\\RdcPersistente\\state');
});

test('rejects unsupported platforms', () => {
  assert.throws(() => buildPlatformPaths({ platform: 'linux', home: '/home/a' }), /Unsupported platform/);
});