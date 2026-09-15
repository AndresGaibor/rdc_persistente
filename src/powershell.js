export function windowsAssetName(arch) {
  if (arch === 'x64') return 'rdc-persistente-windows-x64.zip';
  if (arch === 'arm64') return 'rdc-persistente-windows-arm64.zip';
  throw new Error(`Unsupported Windows architecture: ${arch}`);
}

export function buildReleaseAssetUrl({ repository, version, arch }) {
  const tag = String(version).startsWith('v') ? String(version) : `v${version}`;
  return `https://github.com/${repository}/releases/download/${tag}/${windowsAssetName(arch)}`;
}

export function parseChecksumForAsset(text, asset) {
  for (const line of String(text).split(/\r?\n/)) {
    const match = line.trim().match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/);
    if (match && match[2] === asset) return match[1].toLowerCase();
  }
  throw new Error(`Checksum not found for ${asset}`);
}