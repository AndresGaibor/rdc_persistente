import path from 'node:path';
import { buildPlatformPaths } from './platform/paths.js';

export function buildInstallPlan(input) {
  const options = typeof input === 'string'
    ? { platform: 'darwin', home: input }
    : input;
  const paths = buildPlatformPaths(options);

  if (options.platform === 'darwin') {
    return {
      ...paths,
      remotePlist: path.posix.join(paths.launchAgentsDir, 'dev.rdc.macos-supervisor.remote.plist'),
      watchdogPlist: path.posix.join(paths.launchAgentsDir, 'dev.rdc.macos-supervisor.watchdog.plist'),
      labels: ['dev.rdc.macos-supervisor.remote', 'dev.rdc.macos-supervisor.watchdog']
    };
  }

  return {
    ...paths,
    taskNames: ['RdcPersistente\\Remote', 'RdcPersistente\\Watchdog']
  };
}