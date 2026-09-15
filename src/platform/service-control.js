export function buildRemoteServiceCommands({ platform, uid }) {
  if (platform === 'darwin') {
    const target = `gui/${uid}/dev.rdc.macos-supervisor.remote`;
    return {
      query: ['/bin/launchctl', 'print', target],
      restart: ['/bin/launchctl', 'kickstart', '-k', target]
    };
  }
  if (platform === 'win32') {
    return {
      query: ['schtasks.exe', '/Query', '/TN', 'RdcPersistente\\Remote', '/FO', 'LIST', '/V'],
      restart: ['schtasks.exe', '/Run', '/TN', 'RdcPersistente\\Remote']
    };
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

export function serviceOutputIsRunning(platform, stdout) {
  if (platform === 'darwin') return /state = running/.test(stdout);
  if (platform === 'win32') {
    return /Status:\s+Running/i.test(stdout) || /Estado:\s+En ejecuci[oó]n/i.test(stdout);
  }
  return false;
}