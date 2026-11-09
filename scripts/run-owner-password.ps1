param([Parameter(Mandatory = $true)][string]$BackupDirectory)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$previousDirectory = $env:ALANA_BOOTSTRAP_BACKUP_DIRECTORY
try {
    $env:ALANA_BOOTSTRAP_BACKUP_DIRECTORY = $BackupDirectory
    node scripts/owner-password-local.cjs
    if ($LASTEXITCODE -ne 0) { Write-Host 'Proses tidak berhasil. Jangan ulangi otomatis; minta pemeriksaan terlebih dahulu.' }
} finally {
    if ($null -eq $previousDirectory) { Remove-Item Env:ALANA_BOOTSTRAP_BACKUP_DIRECTORY -ErrorAction SilentlyContinue }
    else { $env:ALANA_BOOTSTRAP_BACKUP_DIRECTORY = $previousDirectory }
}
