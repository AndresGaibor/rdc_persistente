$ErrorActionPreference = "Stop"
$destination = Join-Path $env:LOCALAPPDATA "RdcPersistente"
$node = Join-Path $destination "node\node.exe"
$status = Join-Path $destination "source\scripts\status.js"

if (-not (Test-Path $node)) { throw "RDC Persistente bundled Node runtime not found." }
if (-not (Test-Path $status)) { throw "RDC Persistente status entrypoint not found." }
& $node $status
exit $LASTEXITCODE
