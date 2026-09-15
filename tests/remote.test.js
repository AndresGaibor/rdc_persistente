import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createLineReader, resolveDesktopCommanderEntry } from '../src/remote-utils.js';

test('line reader emits complete lines and preserves remainder', () => {
  const lines = [];
  const reader = createLineReader((line) => lines.push(line));
  reader.push('one\ntwo');
  reader.push(' and more\nthree\n');
  reader.end();
  assert.deepEqual(lines, ['one', 'two and more', 'three']);
});

test('desktop commander entry resolves below the runtime root', () => {
  const entry = resolveDesktopCommanderEntry('/tmp/runtime');
  assert.equal(entry, path.join('/tmp/runtime', 'node_modules', '@wonderwhy-er', 'desktop-commander', 'dist', 'index.js'));
});
