import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';

export const NODE_VERSION = '24.21.0';

export function nodeAssetFor({ platform, arch, version = NODE_VERSION }) {
  if (platform === 'darwin' && ['x64', 'arm64'].includes(arch)) return `node-v${version}-darwin-${arch}.tar.gz`;
  if (platform === 'win32' && ['x64', 'arm64'].includes(arch)) return `node-v${version}-win-${arch}.zip`;
  throw new Error(`Unsupported release target: ${platform}/${arch}`);
}

export function parseSha256Manifest(text) {
  const map = new Map();
  for (const line of String(text).split(/\r?\n/)) {
    const match = line.trim().match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/);
    if (match) map.set(match[2], match[1].toLowerCase());
  }
  return map;
}

export async function sha256File(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export async function verifySha256(file, expected) {
  const actual = await sha256File(file);
  if (actual !== String(expected).toLowerCase()) throw new Error(`SHA-256 mismatch: expected ${expected}, got ${actual}`);
  return true;
}
