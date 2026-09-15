$ErrorActionPreference = 'Stop'
$toolsDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$installer = Join-Path $toolsDir 'install.ps1'
& $installer -Version '0.2.0' -Repository 'AndresGaibor/rdc_persistente'
if ($LASTEXITCODE -ne 0) { throw "RDC Persistente install failed with exit code $LASTEXITCODE" }
