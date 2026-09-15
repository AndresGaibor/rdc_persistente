import path from 'node:path';

export function quoteWindowsCommand(executable, script) {
  const quote = (value) => `"${String(value).replaceAll('"', '\\"')}"`;
  return `${quote(executable)} ${quote(script)}`;
}

function task(name, scheduleArgs, command) {
  return {
    name,
    command,
    createArgs: ['/Create', '/F', '/TN', name, ...scheduleArgs, '/TR', command, '/IT', '/RL', 'LIMITED'],
    runArgs: ['/Run', '/TN', name],
    queryArgs: ['/Query', '/TN', name, '/FO', 'LIST', '/V'],
    deleteArgs: ['/Delete', '/F', '/TN', name]
  };
}

export function buildWindowsTasks({ nodePath, appDir }) {
  const remoteCommand = quoteWindowsCommand(nodePath, path.win32.join(appDir, 'bin', 'remote.js'));
  const watchdogCommand = quoteWindowsCommand(nodePath, path.win32.join(appDir, 'bin', 'watchdog.js'));
  return {
    remote: task('RdcPersistente\\Remote', ['/SC', 'ONLOGON'], remoteCommand),
    watchdog: task('RdcPersistente\\Watchdog', ['/SC', 'MINUTE', '/MO', '1'], watchdogCommand)
  };
}