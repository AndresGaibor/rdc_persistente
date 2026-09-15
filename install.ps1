param(
  [string]$Version = "0.2.0",
  [string]$Repository = "AndresGaibor/rdc_persistente"
)
$ErrorActionPreference = "Stop"

$arch = switch ($env:PROCESSOR_ARCHITECTURE) {
  "AMD64" { "x64" }
  "ARM64" { "arm64" }
  default { throw "Unsupported Windows architecture: $env:PROCESSOR_ARCHITECTURE" }
}
$tag = if ($Version.StartsWith("v")) { $Version } else { "v$Version" }
$asset = "rdc-persistente-windows-$arch.zip"
$base = "https://github.com/$Repository/releases/download/$tag"
$temp = Join-Path $env:TEMP ("rdc-persistente-" + [guid]::NewGuid().ToString("N"))
$zip = Join-Path $temp $asset
$sums = Join-Path $temp "SHA256SUMS"
$extract = Join-Path $temp "extract"
$destination = Join-Path $env:LOCALAPPDATA "RdcPersistente"

New-Item -ItemType Directory -Path $temp, $extract -Force | Out-Null
try {
  Invoke-WebRequest -UseBasicParsing "$base/$asset" -OutFile $zip
  Invoke-WebRequest -UseBasicParsing "$base/SHA256SUMS" -OutFile $sums
  $line = Get-Content $sums | Where-Object { $_ -match [regex]::Escape($asset) } | Select-Object -First 1
  if (-not $line) { throw "Checksum not found for $asset" }
  $expected = ($line -split '\s+')[0].ToLowerInvariant()
  $actual = (Get-FileHash -Algorithm SHA256 $zip).Hash.ToLowerInvariant()  if ($actual -ne $expected) { throw "SHA-256 mismatch for $asset" }

  Expand-Archive -Path $zip -DestinationPath $extract -Force
  if (Test-Path $destination) { Remove-Item $destination -Recurse -Force }
  New-Item -ItemType Directory -Path $destination -Force | Out-Null
  Copy-Item (Join-Path $extract '*') $destination -Recurse -Force

  $node = Join-Path $destination "node\node.exe"
  $installer = Join-Path $destination "source\scripts\install.js"
  if (-not (Test-Path $node)) { throw "Bundled Node runtime not found: $node" }
  if (-not (Test-Path $installer)) { throw "Installer entrypoint not found: $installer" }
  & $node $installer --activate
  if ($LASTEXITCODE -ne 0) { throw "RDC Persistente installer failed with exit code $LASTEXITCODE" }
  Write-Host "RDC Persistente installed in $destination"
}
finally {
  if (Test-Path $temp) { Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue }
}
