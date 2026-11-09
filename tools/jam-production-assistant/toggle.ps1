# Flip the gaze switcher on/off (for a Stream Deck button). Optional: -On / -Off
param([switch]$On, [switch]$Off)
$flag = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "switcher.on"
$want = if ($On) { $true } elseif ($Off) { $false } else { -not (Test-Path $flag) }
if ($want) { New-Item -ItemType File -Force $flag | Out-Null; $s = "ON" } else { Remove-Item $flag -ErrorAction SilentlyContinue; $s = "OFF" }
Write-Output "Gaze switcher $s"
