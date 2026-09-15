import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('README documents direct Windows, Chocolatey and macOS installation', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /irm .*install\.ps1.*iex/i);
  assert.match(readme, /Run PowerShell as Administrator/i);
  assert.match(readme, /choco install rdc-persistente/i);
  assert.match(readme, /npm run install:local/);
  assert.match(readme, /Windows.*Task Scheduler/is);
  assert.match(readme, /macOS.*launchd/is);
});
