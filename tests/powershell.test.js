import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReleaseAssetUrl, windowsAssetName, parseChecksumForAsset } from '../src/powershell.js';

test('maps Windows architectures to release ZIP names', () => {
  assert.equal(windowsAssetName('x64'), 'rdc-persistente-windows-x64.zip');
  assert.equal(windowsAssetName('arm64'), 'rdc-persistente-windows-arm64.zip');
  assert.throws(() => windowsAssetName('ia32'), /Unsupported Windows architecture/);
});

test('builds GitHub release URL with normalized v tag', () => {
  assert.equal(
    buildReleaseAssetUrl({ repository: 'AndresGaibor/rdc_persistente', version: '0.2.0', arch: 'x64' }),
    'https://github.com/AndresGaibor/rdc_persistente/releases/download/v0.2.0/rdc-persistente-windows-x64.zip'
  );
});

test('parses SHA256SUMS for a selected asset', () => {
  const hash = 'a'.repeat(64);
  const text = `${'b'.repeat(64)}  other.zip\n${hash}  rdc-persistente-windows-x64.zip\n`;
  assert.equal(parseChecksumForAsset(text, 'rdc-persistente-windows-x64.zip'), hash);
  assert.throws(() => parseChecksumForAsset(text, 'missing.zip'), /Checksum not found/);
});

test('PowerShell bootstrap verifies SHA-256 and uses bundled node', async () => {
  const { readFile } = await import('node:fs/promises');
  const install = await readFile(new URL('../install.ps1', import.meta.url), 'utf8');
  assert.match(install, /Get-FileHash/);
  assert.match(install, /LOCALAPPDATA/);
  assert.match(install, /node\\node\.exe/);
  assert.match(install, /SHA256SUMS/);
  assert.doesNotMatch(install, /choco install nodejs/i);
});

test('PowerShell uninstall and status reuse installed bundled node', async () => {
  const { readFile } = await import('node:fs/promises');
  const uninstall = await readFile(new URL('../uninstall.ps1', import.meta.url), 'utf8');
  const status = await readFile(new URL('../status.ps1', import.meta.url), 'utf8');
  assert.match(uninstall, /node\\node\.exe/);
  assert.match(uninstall, /--services-only/);
  assert.match(status, /node\\node\.exe/);
});

test('PowerShell installer requires elevation before creating scheduled tasks', async () => {
  const { readFile } = await import('node:fs/promises');
  const install = await readFile(new URL('../install.ps1', import.meta.url), 'utf8');
  assert.match(install, /WindowsBuiltInRole.*Administrator/s);
  assert.match(install, /Run PowerShell as Administrator/);
});
test('PowerShell reinstall stops old persistence before replacing files', async () => {
  const { readFile } = await import('node:fs/promises');
  const script = await readFile(new URL('../install.ps1', import.meta.url), 'utf8');
  assert.match(script, /scripts\\uninstall\.js/);
  assert.match(script, /--services-only/);
  assert.ok(script.indexOf('--services-only') < script.indexOf('Remove-Item $destination'));
});
