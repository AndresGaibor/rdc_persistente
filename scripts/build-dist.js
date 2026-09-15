#!/usr/bin/env node
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NODE_VERSION, nodeAssetFor, parseSha256Manifest, verifySha256, sha256File } from '../src/release/node-runtime.js';
import { releaseArtifactName } from '../src/release/archive.js';

const DC_VERSION = '0.2.47';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const option = (name, fallback) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=') || fallback;
const platform = option('platform', process.platform);
const arch = option('arch', process.arch);
if (!['darwin', 'win32'].includes(platform)) throw new Error(`Unsupported dist platform: ${platform}`);
if (platform !== process.platform) throw new Error(`Build ${platform} artifacts on a ${platform} runner so native dependencies match.`);

const artifact = releaseArtifactName({ platform, arch });
const distDir = path.join(root, 'dist');
const workDir = path.join(distDir, `.work-${platform}-${arch}`);
const bundle = path.join(workDir, 'bundle');
const cache = path.join(root, '.cache', 'node', NODE_VERSION);
await rm(workDir, { recursive: true, force: true });
await mkdir(bundle, { recursive: true });
await mkdir(cache, { recursive: true });

async function download(url, output) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed ${response.status}: ${url}`);
  await writeFile(output, Buffer.from(await response.arrayBuffer()));
}

const sourceDir = path.join(bundle, 'source');
await mkdir(sourceDir, { recursive: true });
for (const name of ['src', 'bin', 'scripts']) {
  await cp(path.join(root, name), path.join(sourceDir, name), { recursive: true });
}
for (const name of ['package.json', 'README.md', 'LICENSE']) {
  await cp(path.join(root, name), path.join(sourceDir, name));
}
if (platform === 'win32') {
  for (const name of ['install.ps1', 'uninstall.ps1', 'status.ps1']) await cp(path.join(root, name), path.join(bundle, name));
}

const runtimeDir = path.join(bundle, 'runtime');
await mkdir(runtimeDir, { recursive: true });
await writeFile(path.join(runtimeDir, 'package.json'), JSON.stringify({ private: true }, null, 2));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
execFileSync(npm, ['install', '--prefix', runtimeDir, `@wonderwhy-er/desktop-commander@${DC_VERSION}`, '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], {
  stdio: 'inherit',
  windowsHide: true,
  env: { ...process.env, npm_config_cpu: arch, npm_config_os: platform }
});

const nodeAsset = nodeAssetFor({ platform, arch });
const nodeBase = `https://nodejs.org/download/release/v${NODE_VERSION}`;
const archivePath = path.join(cache, nodeAsset);
const sumsPath = path.join(cache, 'SHASUMS256.txt');
if (!(await import('node:fs')).existsSync(sumsPath)) await download(`${nodeBase}/SHASUMS256.txt`, sumsPath);
if (!(await import('node:fs')).existsSync(archivePath)) await download(`${nodeBase}/${nodeAsset}`, archivePath);
const sums = parseSha256Manifest(await readFile(sumsPath, 'utf8'));
const expected = sums.get(nodeAsset);
if (!expected) throw new Error(`Node checksum missing for ${nodeAsset}`);
await verifySha256(archivePath, expected);

const nodeDir = path.join(bundle, 'node');
await mkdir(nodeDir, { recursive: true });
if (platform === 'darwin') {
  execFileSync('tar', ['-xzf', archivePath, '-C', nodeDir, '--strip-components=1'], { stdio: 'inherit' });
} else {
  const extractDir = path.join(workDir, 'node-extract');
  await mkdir(extractDir, { recursive: true });
  execFileSync('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${archivePath.replaceAll("'", "''")}' -DestinationPath '${extractDir.replaceAll("'", "''")}' -Force`], { stdio: 'inherit' });
  const [top] = await readdir(extractDir);
  const topDir = path.join(extractDir, top);
  for (const entry of await readdir(topDir)) await cp(path.join(topDir, entry), path.join(nodeDir, entry), { recursive: true });
}

await writeFile(path.join(bundle, 'manifest.json'), JSON.stringify({
  name: pkg.name,
  version: pkg.version,
  platform,
  arch,
  nodeVersion: NODE_VERSION,
  desktopCommanderVersion: DC_VERSION
}, null, 2));

await mkdir(distDir, { recursive: true });
const artifactPath = path.join(distDir, artifact);
await rm(artifactPath, { force: true });
if (platform === 'darwin') {
  execFileSync('tar', ['-czf', artifactPath, '-C', bundle, '.'], { stdio: 'inherit' });
} else {
  execFileSync('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Path '${bundle.replaceAll("'", "''")}\\*' -DestinationPath '${artifactPath.replaceAll("'", "''")}' -Force`], { stdio: 'inherit' });
}

const artifactHash = await sha256File(artifactPath);
const sumsFile = path.join(distDir, 'SHA256SUMS');
let lines = [];
try { lines = (await readFile(sumsFile, 'utf8')).split(/\r?\n/).filter(Boolean); } catch {}
lines = lines.filter((line) => !line.endsWith(`  ${artifact}`));
lines.push(`${artifactHash}  ${artifact}`);
await writeFile(sumsFile, `${lines.sort().join('\n')}\n`);
await rm(workDir, { recursive: true, force: true });
console.log(`Built ${artifactPath}`);
console.log(`SHA256 ${artifactHash}`);
