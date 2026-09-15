export function releaseArtifactName({ platform, arch }) {
  if (platform === 'darwin' && ['x64', 'arm64'].includes(arch)) return `rdc-persistente-macos-${arch}.tar.gz`;
  if (platform === 'win32' && ['x64', 'arm64'].includes(arch)) return `rdc-persistente-windows-${arch}.zip`;
  throw new Error(`Unsupported release target: ${platform}/${arch}`);
}
