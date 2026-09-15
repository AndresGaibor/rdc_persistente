# Cross-platform RDC Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `rdc_persistente` installable and persistent on macOS and Windows, with bundled Node.js 24.21.0 release artifacts and Chocolatey packaging.

**Architecture:** Keep parser/state/logger/watchdog logic shared. Introduce platform path/service adapters: `launchd` for macOS and per-user Task Scheduler tasks for Windows. Build release archives from one source tree and reuse the same Windows installer from direct PowerShell and Chocolatey flows.

**Tech Stack:** Node.js ES modules, node:test, launchd, Windows `schtasks.exe`, PowerShell, Chocolatey, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-14-cross-platform-rdc-persistence-design.md`

## Global Constraints

- Development Node.js: >=22.
- Bundled release Node.js: exactly 24.21.0.
- Desktop Commander runtime: exactly 0.2.47.
- Normal installation is per-user and must not require administrator privileges.
- Never persist OAuth tokens, temporary auth codes or tool-call payloads.
- Release artifacts must verify downloaded Node.js binaries against official SHA-256 manifests.

---

### Task 1: Platform-neutral paths and metadata

**Files:**
- Modify: `package.json`
- Create: `src/platform/paths.js`
- Create: `tests/paths.test.js`
- Modify: `src/install-plan.js`

**Interfaces:**
- Produces: `buildPlatformPaths({ platform, home, localAppData }) -> object`
- Produces: `buildInstallPlan(options) -> object`

- [ ] Write failing tests asserting macOS paths use `~/.local/...` and Windows paths use `%LOCALAPPDATA%/RdcPersistente`.
- [ ] Run `node --test tests/paths.test.js`; expect failures because `src/platform/paths.js` does not exist.
- [ ] Implement path generation and rename package metadata to `rdc-persistente` with Windows/macOS keywords.
- [ ] Run `npm test` and `npm run check`; expect green.
- [ ] Commit: `refactor: add cross-platform install paths`.

### Task 2: Service adapter boundary and Windows Task Scheduler

**Files:**
- Create: `src/platform/windows/tasks.js`
- Create: `src/platform/macos/launchd.js`
- Modify: `src/launchd.js`
- Create: `tests/windows-tasks.test.js`
- Modify: `tests/launchd.test.js`

**Interfaces:**
- Produces: `buildWindowsTasks({ nodePath, appDir })` returning task names and quoted commands.
- Produces: `renderLaunchAgents({ home, nodePath })` through the macOS adapter.

- [ ] Write failing tests for task names `RdcPersistente\\Remote` and `RdcPersistente\\Watchdog`, `/SC ONLOGON`, one-minute watchdog cadence, and paths containing spaces.
- [ ] Run the focused tests and verify expected missing-module failures.
- [ ] Implement Windows task command rendering without embedded credentials; move existing launchd implementation behind the macOS adapter.
- [ ] Run all tests and syntax checks.
- [ ] Commit: `feat: add Windows task scheduler adapter`.

### Task 3: Cross-platform install, uninstall and status commands

**Files:**
- Modify: `scripts/install.js`
- Create: `scripts/uninstall.js`
- Modify: `scripts/status.js`
- Create: `src/platform/windows/installer.js`
- Create: `src/platform/macos/installer.js`
- Create: `tests/install-cross-platform.test.js`

**Interfaces:**
- Produces: platform adapters with `stage()`, `activate()`, `uninstall()` and `status()`.
- `scripts/install.js --dry-run` must print planned actions without changing services.

- [ ] Write failing tests that inject `platform='win32'` and `platform='darwin'` and assert the correct adapter/action plan.
- [ ] Verify focused tests fail for missing adapters.
- [ ] Extract current macOS install behavior and implement Windows `schtasks /Create`, `/Run`, `/Query` and `/Delete` actions.
- [ ] Add uninstall preserving Desktop Commander data outside package-owned paths, plus cross-platform status output.
- [ ] Run full tests/checks and commit `feat: add cross-platform lifecycle commands`.

### Task 4: PowerShell bootstrap surface

**Files:**
- Create: `install.ps1`
- Create: `uninstall.ps1`
- Create: `status.ps1`
- Create: `src/powershell.js`
- Create: `tests/powershell.test.js`

**Interfaces:**
- Produces: `buildReleaseAssetUrl(version, arch)` and SHA-256 verification helpers used by the bootstrap script.

- [ ] Write failing tests for x64/arm64 asset names, checksum parsing and rejection on mismatch.
- [ ] Implement helpers and PowerShell scripts that install under `$env:LOCALAPPDATA\RdcPersistente` and invoke bundled `node.exe`.
- [ ] Ensure scripts accept `-Version` and `-Repository` parameters so releases/forks are testable.
- [ ] Run tests/checks; commit `feat: add Windows PowerShell installer`.

### Task 5: Release builder with bundled Node.js

**Files:**
- Create: `scripts/build-dist.js`
- Create: `src/release/node-runtime.js`
- Create: `src/release/archive.js`
- Create: `tests/release.test.js`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Produces: `nodeAssetFor({ platform, arch, version })`.
- Produces: `parseSha256Manifest(text)` and `verifySha256(file, expected)`.
- Adds `npm run dist`.

- [ ] Write failing tests mapping Windows x64/arm64 and macOS x64/arm64 to official Node.js 24.21.0 archive names.
- [ ] Add checksum parser/verifier tests, including mismatch rejection.
- [ ] Implement downloader, SHA-256 verification, runtime extraction and archive assembly; `dist/` remains gitignored.
- [ ] Build only the host artifact locally with `npm run dist -- --platform=darwin --arch=arm64` and inspect its manifest.
- [ ] Run full tests/checks; commit `feat: build self-contained release artifacts`.

### Task 6: Chocolatey package generation

**Files:**
- Create: `packaging/chocolatey/rdc-persistente.nuspec`
- Create: `packaging/chocolatey/tools/chocolateyInstall.ps1`
- Create: `packaging/chocolatey/tools/chocolateyUninstall.ps1`
- Create: `scripts/build-chocolatey.js`
- Create: `tests/chocolatey.test.js`

**Interfaces:**
- Produces a package source tree referencing the Windows release ZIP and its SHA-256 checksum.
- Adds `npm run dist:choco`.

- [ ] Write failing tests for nuspec id/version and install/uninstall scripts reusing the direct PowerShell lifecycle.
- [ ] Implement deterministic package templating with no credentials.
- [ ] If `choco` exists, execute `choco pack`; otherwise validate generated XML/scripts and report the missing local packer without failing normal CI.
- [ ] Run tests/checks; commit `feat: add Chocolatey packaging`.

### Task 7: CI, release workflow and documentation

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`
- Modify: `README.md`

**Interfaces:**
- CI matrix: `macos-latest` + `windows-latest`, Node 24.
- Release trigger: tags matching `v*`.

- [ ] Update CI to execute `npm ci`, `npm test`, and `npm run check` on both operating systems.
- [ ] Add release jobs that build Windows x64/arm64 and macOS x64/arm64 artifacts, generate SHA256SUMS, and upload GitHub Release assets.
- [ ] Rewrite README with direct PowerShell install, Chocolatey local-package flow, macOS install, status/uninstall, architecture and development commands.
- [ ] Run a secret/personal-path scan and `git diff --check`.
- [ ] Run `npm test && npm run check`; inspect generated host dist and package metadata.
- [ ] Commit `docs: document cross-platform installation and releases`.

### Task 8: Final integration and main branch

**Files:** all changed files.

- [ ] Re-run the complete test suite from a clean dependency install.
- [ ] Verify macOS staging with `npm run stage` does not replace the active supervisor unless explicitly activated.
- [ ] Confirm `git status` contains no runtime, state, credentials, archives or `node_modules`.
- [ ] Review the complete branch diff against the design spec and fix any Critical/Important findings.
- [ ] Merge the feature branch to `main`, rerun `npm test && npm run check`, and push `main` to `origin`.
