import { buildWindowsTasks } from './tasks.js';

export function buildWindowsLifecycle({ nodePath, appDir }) {
  const tasks = buildWindowsTasks({ nodePath, appDir });
  const all = [tasks.remote, tasks.watchdog];
  return {
    activate: [
      ['schtasks.exe', ...tasks.remote.createArgs],
      ['schtasks.exe', ...tasks.watchdog.createArgs],
      ['schtasks.exe', ...tasks.remote.runArgs],
      ['schtasks.exe', ...tasks.watchdog.runArgs]
    ],
    status: all.map((task) => ['schtasks.exe', ...task.queryArgs]),
    uninstall: [
      ['schtasks.exe', ...tasks.watchdog.endArgs],
      ['schtasks.exe', ...tasks.remote.endArgs],
      ['schtasks.exe', ...tasks.watchdog.deleteArgs],
      ['schtasks.exe', ...tasks.remote.deleteArgs]
    ]
  };
}