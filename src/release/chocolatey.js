const REPOSITORY = 'AndresGaibor/rdc_persistente';

export function renderNuspec({ version }) {
  return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://schemas.microsoft.com/packaging/2015/06/nuspec.xsd">
  <metadata>
    <id>rdc-persistente</id>
    <version>${version}</version>
    <title>RDC Persistente</title>
    <authors>AndresGaibor</authors>
    <projectUrl>https://github.com/${REPOSITORY}</projectUrl>
    <licenseUrl>https://github.com/${REPOSITORY}/blob/main/LICENSE</licenseUrl>
    <requireLicenseAcceptance>false</requireLicenseAcceptance>
    <description>Persistent Desktop Commander Remote supervisor for Windows and macOS.</description>
    <tags>desktop-commander rdc windows macos watchdog</tags>
  </metadata>
  <files><file src="tools\\**" target="tools" /></files>
</package>
`;
}

export function renderChocolateyInstall({ version }) {
  return `$ErrorActionPreference = 'Stop'\n$toolsDir = Split-Path -Parent $MyInvocation.MyCommand.Definition\n$installer = Join-Path $toolsDir 'install.ps1'\n& $installer -Version '${version}' -Repository '${REPOSITORY}'\nif ($LASTEXITCODE -ne 0) { throw "RDC Persistente install failed with exit code $LASTEXITCODE" }\n`;
}

export function renderChocolateyUninstall() {
  return `$ErrorActionPreference = 'Stop'\n$toolsDir = Split-Path -Parent $MyInvocation.MyCommand.Definition\n$uninstaller = Join-Path $toolsDir 'uninstall.ps1'\n& $uninstaller\nif ($LASTEXITCODE -ne 0) { throw "RDC Persistente uninstall failed with exit code $LASTEXITCODE" }\n`;
}