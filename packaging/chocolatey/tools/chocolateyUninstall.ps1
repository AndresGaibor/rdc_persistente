$ErrorActionPreference = 'Stop'
$toolsDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$uninstaller = Join-Path $toolsDir 'uninstall.ps1'
& $uninstaller
if ($LASTEXITCODE -ne 0) { throw "RDC Persistente uninstall failed with exit code $LASTEXITCODE" }
