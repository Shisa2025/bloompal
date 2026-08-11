$ErrorActionPreference = "Stop"

$workspace = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$artifactRoot = Join-Path $workspace ".artifacts"
$staging = Join-Path $artifactRoot "online-room-function"
$archive = Join-Path $artifactRoot "bloompal-online-room.zip"

if (-not $staging.StartsWith($workspace, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to package outside the workspace."
}

if (Test-Path -LiteralPath $staging) {
  Remove-Item -LiteralPath $staging -Recurse -Force
}
New-Item -ItemType Directory -Path $staging -Force | Out-Null

Copy-Item -LiteralPath (Join-Path $PSScriptRoot "index.js") -Destination $staging
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "contract.json") -Destination $staging
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "package.json") -Destination $staging

Push-Location $staging
try {
  npm install --omit=dev --ignore-scripts
} finally {
  Pop-Location
}

if (Test-Path -LiteralPath $archive) {
  Remove-Item -LiteralPath $archive -Force
}

# Compress-Archive writes backslashes into ZIP entry names on Windows. Linux
# runtimes then see names such as `node_modules\pg\package.json` as a single
# filename instead of a directory tree, so Node cannot resolve dependencies.
# Build the archive explicitly with portable forward-slash entry paths.
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open(
  $archive,
  [System.IO.Compression.ZipArchiveMode]::Create
)
try {
  Get-ChildItem -LiteralPath $staging -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Substring($staging.Length).TrimStart([char[]]@(92, 47))
    $entryName = $relativePath.Replace("\", "/")
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip,
      $_.FullName,
      $entryName,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
} finally {
  $zip.Dispose()
}
Write-Output $archive
