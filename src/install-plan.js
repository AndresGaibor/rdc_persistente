import path from 'node:path';

export function buildInstallPlan(home) {
  const appDir = path.join(home, '.local/share/rdc-macos-supervisor/app');
  const runtimeDir = path.join(home, '.local/share/rdc-macos-supervisor/runtime');
  const stateDir = path.join(home, '.local/state/rdc-macos-supervisor');
  const launchAgentsDir = path.join(home, 'Library/LaunchAgents');
  return {
    appDir,
    runtimeDir,
    stateDir,
    launchAgentsDir,
    remotePlist: path.join(launchAgentsDir, 'dev.rdc.macos-supervisor.remote.plist'),
    watchdogPlist: path.join(launchAgentsDir, 'dev.rdc.macos-supervisor.watchdog.plist'),
    labels: ['dev.rdc.macos-supervisor.remote', 'dev.rdc.macos-supervisor.watchdog']
  };
}
