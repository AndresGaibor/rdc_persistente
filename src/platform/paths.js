import path from 'node:path';

export function buildPlatformPaths({ platform, home, localAppData }) {
  if (platform === 'darwin') {
    const share = path.posix.join(home, '.local/share/rdc-persistente');
    return {
      baseDir: share,
      appDir: path.posix.join(share, 'app'),
      runtimeDir: path.posix.join(share, 'runtime'),
      stateDir: path.posix.join(home, '.local/state/rdc-persistente'),
      launchAgentsDir: path.posix.join(home, 'Library/LaunchAgents')
    };
  }

  if (platform === 'win32') {
    const root = localAppData || path.win32.join(home, 'AppData', 'Local');
    const baseDir = path.win32.join(root, 'RdcPersistente');
    return {
      baseDir,
      appDir: path.win32.join(baseDir, 'app'),
      runtimeDir: path.win32.join(baseDir, 'runtime'),
      stateDir: path.win32.join(baseDir, 'state')
    };
  }

  throw new Error(`Unsupported platform: ${platform}`);
}