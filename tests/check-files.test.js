import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { collectJavaScriptFiles } from '../src/check-files.js';

test('collectJavaScriptFiles recursively returns only .js files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'rdc-check-'));
  await mkdir(path.join(root, 'nested'));
  await writeFile(path.join(root, 'a.js'), 'export {};');
  await writeFile(path.join(root, 'nested', 'b.js'), 'export {};');
  await writeFile(path.join(root, 'skip.txt'), 'x');
  const files = await collectJavaScriptFiles(root);
  assert.deepEqual(files.map((file) => path.basename(file)).sort(), ['a.js', 'b.js']);
});