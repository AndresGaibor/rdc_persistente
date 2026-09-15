$ErrorActionPreference = "Stop"
$destination = Join-Path $env:LOCALAPPDATA "RdcPersistente"
$node = Join-Path $destination "node\node.exe"
$uninstaller = Join-Path $destination "source\scripts\uninstall.js"

if ((Test-Path $node) -and (Test-Path $uninstaller)) {
  & $node $uninstaller --services-only
  if ($LASTEXITCODE -ne 0) { throw "Service removal failed with exit code $LASTEXITCODE" }
  Start-Sleep -Milliseconds 750
}

if (Test-Path $destination) {
  Remove-Item $destination -Recurse -Force
}
Write-Host "RDC Persistente uninstalled."
