# Jam Production Assistant - C920 look-up cutaway
#   .\run.ps1                 live (switches scenes)
#   .\run.ps1 -DryRun         log decisions only
#   .\run.ps1 -DryRun -Seconds 20 -Verbose
#   .\run.ps1 -Bench          Hailo inference speed test (no OBS)
#   .\run.ps1 -ListObs        list OBS scenes + webcam sources
param([switch]$DryRun, [switch]$Bench, [switch]$ListObs, [switch]$Verbose, [double]$Seconds = 0)
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$py = Join-Path $here ".venv\Scripts\python.exe"
$a = @((Join-Path $here "gaze_switcher.py"))
if ($DryRun)  { $a += "--dry-run" }
if ($Bench)   { $a += "--bench" }
if ($ListObs) { $a += "--list-obs" }
if ($Verbose) { $a += "--verbose" }
if ($Seconds -gt 0) { $a += @("--duration", "$Seconds") }
& $py @a
exit $LASTEXITCODE
