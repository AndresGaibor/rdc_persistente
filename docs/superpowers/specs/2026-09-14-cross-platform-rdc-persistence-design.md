# Cross-platform RDC persistence design

## Goal

Evolve `rdc_persistente` from a macOS-only supervisor into one Node.js codebase that keeps Desktop Commander Remote persistent on macOS and Windows, with installable release artifacts and Chocolatey packaging for Windows.

## Supported platforms

- macOS 13+ on arm64 and x64.
- Windows 10/11 on x64 and arm64.
- Node.js for development: >=22.
- Release runtime: Node.js 24.21.0 bundled inside each platform artifact so end users do not need a global Node installation.
- Desktop Commander runtime pinned to 0.2.47 until explicitly upgraded.

## Architecture

The existing parser, state store, rotating logger, watchdog policy and Desktop Commander process runner become platform-neutral modules. Platform-specific code is isolated behind adapters for service lifecycle, paths and process inspection.

On macOS, persistence remains a pair of per-user `launchd` LaunchAgents: a `KeepAlive` remote runner and a 60-second watchdog. On Windows, persistence uses per-user Task Scheduler tasks: the remote task launches at user logon and the watchdog task launches at logon and then every minute. Both run in the interactive user's context so Desktop Commander's persisted authentication remains owned by that user rather than LocalSystem.

## Runtime layout

The source repository stays portable. Installation copies only application code and the pinned Desktop Commander runtime into a per-user data directory.

macOS:
- app/runtime: `~/.local/share/rdc-persistente/`
- state/logs: `~/.local/state/rdc-persistente/`
- LaunchAgents: `~/Library/LaunchAgents/`

Windows:
- app/runtime: `%LOCALAPPDATA%\RdcPersistente\`
- state/logs: `%LOCALAPPDATA%\RdcPersistente\state\`
- scheduled tasks: `RdcPersistente\Remote` and `RdcPersistente\Watchdog`

## Installation surfaces

The repository provides cross-platform `scripts/install.js`, `scripts/uninstall.js` and `scripts/status.js`. These dispatch to the platform adapter detected from `process.platform`.

Windows additionally provides `install.ps1`, `uninstall.ps1` and `status.ps1` entry points. `install.ps1` can be downloaded directly from GitHub and bootstraps the release ZIP into `%LOCALAPPDATA%\RdcPersistente` before invoking the bundled Node runtime.

Chocolatey packaging lives under `packaging/chocolatey`. The package installs the Windows release ZIP and invokes the same PowerShell installer, so direct-install and Chocolatey paths share one implementation.

## Release artifacts

`npm run dist` creates release directories and archives:

- `dist/rdc-persistente-windows-x64.zip`
- `dist/rdc-persistente-windows-arm64.zip`
- `dist/rdc-persistente-macos-arm64.tar.gz`
- `dist/rdc-persistente-macos-x64.tar.gz`
- `dist/chocolatey/rdc-persistente.<version>.nupkg` when `choco` is available.

Each platform archive contains the application, Desktop Commander dependencies, and a Node.js 24.21.0 runtime downloaded from the official Node.js distribution and verified against `SHASUMS256.txt` before packaging.

## Windows Task Scheduler behavior

The Windows adapter manages tasks using `schtasks.exe`, not a LocalSystem Windows service. The remote task starts at user logon and invokes the bundled Node executable with `bin/remote.js`. The watchdog runs every minute under the same user and starts/restarts the remote task when health policy requires it.

Task commands must quote paths correctly, use no embedded credentials, and be idempotent: reinstall replaces only the two `RdcPersistente` tasks owned by this package.

## Logging and resilience

Both platforms retain the existing bounded rotating logs. Tool payloads, temporary auth codes and OAuth tokens are not persisted. Storage failures including `ENOSPC`, `EDQUOT`, `EROFS` and `EACCES` never terminate the remote wrapper.

The watchdog policy remains shared. Platform adapters only answer whether the remote supervisor is active and perform a restart action.

## Security

- No OAuth token, Desktop Commander persisted session, email address or machine-specific path is committed to Git.
- Installation is per-user and does not require administrator privileges for normal operation.
- PowerShell bootstrap uses HTTPS GitHub release assets and verifies archive SHA-256 before extraction.
- Node release downloads used by the build are verified against Node's published SHA-256 manifest.
- Chocolatey package contains no API keys and can be built locally without publishing credentials.

## CI and release automation

CI runs shared tests on `macos-latest` and `windows-latest` with Node 24. Release workflow triggers on `v*` tags, builds macOS and Windows artifacts, uploads checksums, and attaches them to the GitHub Release. Chocolatey packaging is generated as an artifact but publishing to the Chocolatey Community Repository is not automatic because it requires maintainer credentials and moderation.

## Compatibility and migration

Existing macOS installations continue to work. The new installer recognizes the previous `dev.rdc.macos-supervisor.*` labels and can migrate them explicitly without deleting the previous application files. Package metadata changes from `rdc-persistente-macos` to `rdc-persistente`.

Windows installation and uninstallation touch only `%LOCALAPPDATA%\RdcPersistente` and the two scheduled tasks. Uninstall does not delete Desktop Commander account/session data outside package-owned directories.

## Testing

Unit tests cover paths, task/LaunchAgent rendering, watchdog decisions, state/logging behavior and bootstrap command generation. Integration-style tests invoke installers in dry-run mode on both CI operating systems. Windows CI verifies scheduled-task commands without requiring destructive task creation; macOS CI validates generated plist files with `plutil`.

## Release source of truth

Node.js 24.21.0 is the bundled runtime version for this release line. Official Node.js archives provide `node-v24.21.0-win-x64.zip`, `node-v24.21.0-win-arm64.zip`, `node-v24.21.0-darwin-arm64.tar.gz` and `node-v24.21.0-darwin-x64.tar.gz`, plus signed SHA-256 manifests.

Chocolatey output follows the standard `.nuspec` plus `tools/chocolateyInstall.ps1` / `chocolateyUninstall.ps1` package layout. Local package creation uses `choco pack`; publication remains a separate maintainer action.
