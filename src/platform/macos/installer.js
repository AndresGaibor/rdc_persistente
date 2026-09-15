export function buildMacOSLifecycle({ uid, plan, replaceLabels = [] }) {
  const domain = `gui/${uid}`;
  const activate = [];
  for (const [label, plist] of [[plan.labels[0], plan.remotePlist], [plan.labels[1], plan.watchdogPlist]]) {
    activate.push(['/bin/launchctl', 'bootout', `${domain}/${label}`]);
    activate.push(['/bin/launchctl', 'bootstrap', domain, plist]);
  }
  activate.push(['/bin/launchctl', 'kickstart', '-k', `${domain}/${plan.labels[0]}`]);
  for (const label of replaceLabels) {
    activate.push(['/bin/launchctl', 'disable', `${domain}/${label}`]);
    activate.push(['/bin/launchctl', 'bootout', `${domain}/${label}`]);
  }
  return {
    activate,
    status: plan.labels.map((label) => ['/bin/launchctl', 'print', `${domain}/${label}`]),
    uninstall: plan.labels.map((label) => ['/bin/launchctl', 'bootout', `${domain}/${label}`])
  };
}