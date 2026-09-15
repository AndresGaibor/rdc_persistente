import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRemoteServiceCommands } from '../src/platform/service-control.js';

test('builds launchctl commands for macOS', () => {
  const commands = buildRemoteServiceCommands({ platform: 'darwin', uid: 501 });
  assert.deepEqual(commands.query, ['/bin/launchctl', 'print', 'gui/501/dev.rdc.macos-supervisor.remote']);
  assert.deepEqual(commands.restart, ['/bin/launchctl', 'kickstart', '-k', 'gui/501/dev.rdc.macos-supervisor.remote']);
});

test('builds schtasks commands for Windows', () => {
  const commands = buildRemoteServiceCommands({ platform: 'win32' });
  assert.deepEqual(commands.query, ['schtasks.exe', '/Query', '/TN', 'RdcPersistente\\Remote', '/FO', 'LIST', '/V']);
  assert.deepEqual(commands.restart, ['schtasks.exe', '/Run', '/TN', 'RdcPersistente\\Remote']);
});

test('rejects unsupported service platforms', () => {
  assert.throws(() => buildRemoteServiceCommands({ platform: 'linux' }), /Unsupported platform/);
});

test('Windows task must be Running, not merely Ready', async () => {
  const { serviceOutputIsRunning } = await import('../src/platform/service-control.js');
  assert.equal(serviceOutputIsRunning('win32', 'Status: Running'), true);
  assert.equal(serviceOutputIsRunning('win32', 'Status: Ready'), false);
  assert.equal(serviceOutputIsRunning('win32', 'Estado: En ejecución'), true);
});