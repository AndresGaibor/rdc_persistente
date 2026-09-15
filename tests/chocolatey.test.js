import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNuspec, renderChocolateyInstall, renderChocolateyUninstall } from '../src/release/chocolatey.js';

test('renders Chocolatey nuspec with package version and repository metadata', () => {
  const xml = renderNuspec({ version: '0.2.0' });
  assert.match(xml, /<id>rdc-persistente<\/id>/);
  assert.match(xml, /<version>0\.2\.0<\/version>/);
  assert.match(xml, /github\.com\/AndresGaibor\/rdc_persistente/);
});

test('Chocolatey install delegates to bundled direct PowerShell installer', () => {
  const script = renderChocolateyInstall({ version: '0.2.0' });
  assert.match(script, /install\.ps1/);
  assert.match(script, /-Version '0\.2\.0'/);
  assert.match(script, /AndresGaibor\/rdc_persistente/);
  assert.doesNotMatch(script, /choco install nodejs/i);
});

test('Chocolatey uninstall delegates to bundled uninstaller', () => {
  const script = renderChocolateyUninstall();
  assert.match(script, /uninstall\.ps1/);
});