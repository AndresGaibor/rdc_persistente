import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { nodeAssetFor, parseSha256Manifest, verifySha256 } from '../src/release/node-runtime.js';

test('maps supported platform/arch pairs to Node 24.21.0 archives', () => {
  assert.equal(nodeAssetFor({ platform: 'darwin', arch: 'arm64' }), 'node-v24.21.0-darwin-arm64.tar.gz');
  assert.equal(nodeAssetFor({ platform: 'darwin', arch: 'x64' }), 'node-v24.21.0-darwin-x64.tar.gz');
  assert.equal(nodeAssetFor({ platform: 'win32', arch: 'x64' }), 'node-v24.21.0-win-x64.zip');
  assert.equal(nodeAssetFor({ platform: 'win32', arch: 'arm64' }), 'node-v24.21.0-win-arm64.zip');
  assert.throws(() => nodeAssetFor({ platform: 'linux', arch: 'x64' }), /Unsupported release target/);
});

test('parses Node SHASUMS256 manifest', () => {
  const hash = 'a'.repeat(64);
  const manifest = parseSha256Manifest(`${hash}  node-v24.21.0-win-x64.zip\n`);
  assert.equal(manifest.get('node-v24.21.0-win-x64.zip'), hash);
});

test('verifies file SHA-256 and rejects mismatch', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'rdc-release-'));
  const file = path.join(dir, 'data.bin');
  await writeFile(file, 'abc');
  assert.equal(await verifySha256(file, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'), true);
  await assert.rejects(() => verifySha256(file, '0'.repeat(64)), /SHA-256 mismatch/);
});

test('names release artifacts consistently', async () => {
  const { releaseArtifactName } = await import('../src/release/archive.js');
  assert.equal(releaseArtifactName({ platform: 'darwin', arch: 'arm64' }), 'rdc-persistente-macos-arm64.tar.gz');
  assert.equal(releaseArtifactName({ platform: 'darwin', arch: 'x64' }), 'rdc-persistente-macos-x64.tar.gz');
  assert.equal(releaseArtifactName({ platform: 'win32', arch: 'x64' }), 'rdc-persistente-windows-x64.zip');
  assert.equal(releaseArtifactName({ platform: 'win32', arch: 'arm64' }), 'rdc-persistente-windows-arm64.zip');
});