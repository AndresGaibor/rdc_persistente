#!/usr/bin/env node
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync, execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderNuspec, renderChocolateyInstall, renderChocolateyUninstall } from '../src/release/chocolatey.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const output = path.join(root, 'dist', 'chocolatey');
const source = path.join(output, 'source');
const tools = path.join(source, 'tools');
await rm(source, { recursive: true, force: true });
await mkdir(tools, { recursive: true });

const nuspec = path.join(source, 'rdc-persistente.nuspec');
await writeFile(nuspec, renderNuspec({ version: pkg.version }));
await writeFile(path.join(tools, 'chocolateyInstall.ps1'), renderChocolateyInstall({ version: pkg.version }));
await writeFile(path.join(tools, 'chocolateyUninstall.ps1'), renderChocolateyUninstall());
for (const name of ['install.ps1', 'uninstall.ps1', 'status.ps1']) {
  await cp(path.join(root, name), path.join(tools, name));
}

const choco = process.platform === 'win32' ? spawnSync('choco.exe', ['--version'], { stdio: 'ignore' }) : { status: 1 };
if (choco.status === 0) {
  execFileSync('choco.exe', ['pack', nuspec, '--outputdirectory', output], { stdio: 'inherit' });
  console.log(`Chocolatey package written under ${output}`);
} else {
  console.log(`Chocolatey source generated at ${source}; run 'choco pack' on Windows to create the .nupkg.`);
}
