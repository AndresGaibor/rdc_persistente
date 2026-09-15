import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (relative) => readFile(new URL(`../${relative}`, import.meta.url), 'utf8');

test('CI validates macOS and Windows on Node 24', async () => {
  const ci = await read('.github/workflows/ci.yml');
  assert.match(ci, /macos-latest/);
  assert.match(ci, /windows-latest/);
  assert.match(ci, /node-version:\s*24/);
  assert.match(ci, /npm ci/);
  assert.match(ci, /npm test/);
  assert.match(ci, /npm run check/);
});

test('release builds four native platform architectures and publishes checksums', async () => {
  const release = await read('.github/workflows/release.yml');
  for (const label of ['windows-latest', 'windows-11-arm', 'macos-latest', 'macos-15-intel']) assert.match(release, new RegExp(label));
  assert.match(release, /SHA256SUMS/);
  assert.match(release, /sha256sum rdc-persistente\*/);
  assert.match(release, /choco pack/);
  assert.match(release, /gh release/);
  assert.match(release, /--repo \"\$GITHUB_REPOSITORY\"/);
});

test('release supports non-publishing manual preflight', async () => {
  const release = await read('.github/workflows/release.yml');
  assert.match(release, /workflow_dispatch:/);
  assert.match(release, /if:\s*startsWith\(github\.ref, 'refs\/tags\/v'\)/);
});
