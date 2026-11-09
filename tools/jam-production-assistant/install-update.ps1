# Update an existing Jam production assistant folder without touching the
# website, .venv, models, logs, or the on/off flag.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\install-update.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\install-update.ps1 -UpdateConfig
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\install-update.ps1 -Rollback
#
# Default target: D:\TheForge\Dev\jam-production-assistant
# Run this from the extracted update folder, not from inside the install.
param(
    [string]$Target = "D:\TheForge\Dev\jam-production-assistant",
    [switch]$UpdateConfig,
    [switch]$Rollback
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Test-Path $Target)) {
    Write-Output "Target folder not found: $Target"
    Write-Output "No files were changed. This package updates an existing install; it does not create one."
    exit 1
}

$targetFull = (Resolve-Path $Target).Path
$hereFull = (Resolve-Path $here).Path
if (-not $Rollback -and ($targetFull -eq $hereFull)) {
    Write-Output "Run install-update.ps1 from the extracted update folder, not from the install folder itself."
    Write-Output "No files were changed."
    exit 1
}

$rollRoot = Join-Path $Target "rollback"

function Restore-Latest {
    if (-not (Test-Path $rollRoot)) {
        Write-Output "No rollback folder under $Target. Nothing restored."
        exit 1
    }
    $latest = Get-ChildItem $rollRoot -Directory | Sort-Object Name -Descending | Select-Object -First 1
    if (-not $latest) {
        Write-Output "No rollback snapshot found. Nothing restored."
        exit 1
    }
    Get-ChildItem $latest.FullName -Force | ForEach-Object {
        if ($_.Name -eq "ROLLBACK.txt") { return }
        $dest = Join-Path $Target $_.Name
        if ($_.PSIsContainer) {
            if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
            Copy-Item $_.FullName $dest -Recurse -Force
        } else {
            Copy-Item $_.FullName $dest -Force
        }
    }
    $introduced = @(
        "cutaway.py",
        "requirements.txt",
        "config.yaml.example",
        "install-update.ps1"
    )
    foreach ($name in $introduced) {
        $backed = Join-Path $latest.FullName $name
        $dest = Join-Path $Target $name
        if ((-not (Test-Path $backed)) -and (Test-Path $dest)) {
            Remove-Item $dest -Force
        }
    }
    $backedTests = Join-Path $latest.FullName "tests"
    $destTests = Join-Path $Target "tests"
    if ((-not (Test-Path $backedTests)) -and (Test-Path $destTests)) {
        Remove-Item $destTests -Recurse -Force
    }
    Write-Output "Restored $($latest.Name)."
    Write-Output "Left in place: .venv, models, logs, switcher.on, calibration.yaml."
    if (-not (Test-Path (Join-Path $latest.FullName "config.yaml"))) {
        Write-Output "config.yaml was not in that snapshot, so it was left as it is now."
    }
}

if ($Rollback) {
    Restore-Latest
    exit 0
}

$codeFiles = @(
    "cutaway.py",
    "gaze_switcher.py",
    "run.ps1",
    "toggle.ps1",
    "README.md",
    "requirements.txt",
    "config.yaml.example",
    "install-update.ps1",
    ".gitignore"
)

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$snap = Join-Path $rollRoot $stamp
New-Item -ItemType Directory -Force -Path $snap | Out-Null

foreach ($name in $codeFiles) {
    $existing = Join-Path $Target $name
    if (Test-Path $existing) {
        Copy-Item $existing (Join-Path $snap $name) -Force
    }
}
$testsOld = Join-Path $Target "tests"
if (Test-Path $testsOld) {
    Copy-Item $testsOld (Join-Path $snap "tests") -Recurse -Force
}

$replaceConfig = $false
$destCfg = Join-Path $Target "config.yaml"
if ($UpdateConfig -or -not (Test-Path $destCfg)) {
    $replaceConfig = $true
    if (Test-Path $destCfg) {
        Copy-Item $destCfg (Join-Path $snap "config.yaml") -Force
    }
}

@"
Rollback snapshot $stamp
Copies back the files that this update replaced.
Does not remove .venv, models, logs, or switcher.on.
config.yaml is restored only when this snapshot contains it (-UpdateConfig, or the file was missing).
"@ | Set-Content -Path (Join-Path $snap "ROLLBACK.txt") -Encoding ASCII

foreach ($name in $codeFiles) {
    $src = Join-Path $here $name
    if (-not (Test-Path $src)) {
        Write-Output "Update package is missing $name. Stopped. Backup is at $snap."
        exit 1
    }
    Copy-Item $src (Join-Path $Target $name) -Force
}

$testsSrc = Join-Path $here "tests"
$testsDst = Join-Path $Target "tests"
if (-not (Test-Path $testsSrc)) {
    Write-Output "Update package is missing tests. Stopped. Backup is at $snap."
    exit 1
}
if (Test-Path $testsDst) { Remove-Item $testsDst -Recurse -Force }
Copy-Item $testsSrc $testsDst -Recurse -Force

if ($replaceConfig) {
    Copy-Item (Join-Path $here "config.yaml") $destCfg -Force
    Write-Output "Installed the new config.yaml with the C920 source and scene names."
    Write-Output "The previous config.yaml, if there was one, is in $snap."
} else {
    Write-Output "Left existing config.yaml in place."
    $raw = Get-Content $destCfg -Raw
    if ($raw -match "REPLACE_ME" -or $raw -match "(?m)^\s*bit:" -or $raw -match "(?m)^\s*main:") {
        Write-Output "NOTE: config.yaml still looks like the v1 template (placeholders or main/bit)."
        Write-Output "The new switcher will refuse to run until it has cameras.brio and cameras.c920."
        Write-Output "Re-run this script with -UpdateConfig. That backs up config.yaml and installs the C920 names."
        Write-Output "The OBS websocket password is not in that file."
    } else {
        Write-Output "Compare config.yaml with config.yaml.example if you have not moved to the brio/c920 names yet."
    }
}

Write-Output "Updated code in $Target"
Write-Output "Left untouched: .venv, models, logs, switcher.on, config.yaml (unless -UpdateConfig), calibration.yaml"
Write-Output "Backup: $snap"
Write-Output "Rollback: powershell -NoProfile -ExecutionPolicy Bypass -File `"$hereFull\install-update.ps1`" -Rollback"
Write-Output "Then from the install folder, while the switcher flag is off:"
Write-Output "  .\.venv\Scripts\python.exe -m unittest discover -s tests -v"
Write-Output "  .\toggle.ps1 -Off"
Write-Output "  .\run.ps1 -Calibrate"
Write-Output "    Voice check first. If there is no voice, it stops. Then one Enter."
Write-Output "    Two rounds: straight ahead 3s, read chat 3s, look up into the lens 3s."
Write-Output "  .\run.ps1 -DryRun -Verbose"
