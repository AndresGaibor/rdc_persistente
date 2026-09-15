const xml = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function plist({ label, nodePath, scriptPath, home, pathEnv, keepAlive = false, interval = null }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${xml(label)}</string>
<key>ProgramArguments</key><array><string>${xml(nodePath)}</string><string>${xml(scriptPath)}</string></array>
<key>RunAtLoad</key><true/>
${keepAlive ? '<key>KeepAlive</key><true/>\n<key>ThrottleInterval</key><integer>10</integer>' : `<key>StartInterval</key><integer>${interval}</integer>`}
<key>ProcessType</key><string>Background</string>
<key>EnvironmentVariables</key><dict><key>HOME</key><string>${xml(home)}</string><key>PATH</key><string>${xml(pathEnv)}</string></dict>
<key>StandardOutPath</key><string>/dev/null</string>
<key>StandardErrorPath</key><string>/dev/null</string>
</dict></plist>\n`;
}

export function renderLaunchAgents({ home, nodePath, pathEnv }) {
  const app = `${home}/.local/share/rdc-macos-supervisor/app`;
  const effectivePath = pathEnv || `/opt/homebrew/bin:/usr/local/bin:${home}/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin`;
  return {
    remote: plist({ label: 'dev.rdc.macos-supervisor.remote', nodePath, scriptPath: `${app}/bin/remote.js`, home, pathEnv: effectivePath, keepAlive: true }),
    watchdog: plist({ label: 'dev.rdc.macos-supervisor.watchdog', nodePath, scriptPath: `${app}/bin/watchdog.js`, home, pathEnv: effectivePath, interval: 60 })
  };
}
