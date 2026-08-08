# Starts the HSK Quiz Next.js dev server on port 9000, killing whatever's
# already listening on that port first so it never silently falls back to
# 9001+.
# Run from anywhere: powershell -File docs/15-run.ps1 (or just ./15-run.ps1 from this folder).

$port = 9000
$existing = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($existing) {
    $existing | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
        Write-Host "Stopping process $_ using port $port..."
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
}

$websiteRoot = Join-Path $PSScriptRoot ".."

Push-Location $websiteRoot
try {
    npm run dev -- --port $port
} finally {
    Pop-Location
}
