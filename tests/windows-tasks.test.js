import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWindowsTasks, quoteWindowsCommand } from '../src/platform/windows/tasks.js';

test('quotes Windows executable and script paths containing spaces', () => {
  const command = quoteWindowsCommand('C:\\Program Files\\nodejs\\node.exe', 'C:\\Users\\A B\\RdcPersistente\\app\\bin\\remote.js');
  assert.equal(command, '"C:\\Program Files\\nodejs\\node.exe" "C:\\Users\\A B\\RdcPersistente\\app\\bin\\remote.js"');
});

test('builds current-user remote and watchdog scheduled tasks', () => {
  const tasks = buildWindowsTasks({
    nodePath: 'C:\\Rdc Persistente\\runtime\\node.exe',
    appDir: 'C:\\Rdc Persistente\\app'
  });
  assert.equal(tasks.remote.name, 'RdcPersistente\\Remote');
  assert.deepEqual(tasks.remote.createArgs.slice(0, 6), ['/Create', '/F', '/TN', 'RdcPersistente\\Remote', '/SC', 'ONLOGON']);
  assert.equal(tasks.remote.createArgs.includes('/IT'), true);
  assert.equal(tasks.watchdog.name, 'RdcPersistente\\Watchdog');
  assert.equal(tasks.watchdog.createArgs.includes('MINUTE'), true);
  assert.equal(tasks.watchdog.createArgs.includes('1'), true);
  assert.match(tasks.remote.command, /remote\.js"$/);
  assert.match(tasks.watchdog.command, /watchdog\.js"$/);
});