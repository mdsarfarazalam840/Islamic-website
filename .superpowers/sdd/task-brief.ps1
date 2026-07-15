param(
  [Parameter(Mandatory=$true)][string]$PlanFile,
  [Parameter(Mandatory=$true)][int]$TaskNumber,
  [string]$OutFile = ""
)

if (-not $OutFile) {
  $root = git rev-parse --show-toplevel 2>$null
  if (-not $root) { $root = "F:\Pro\Quran-website" }
  $dir = Join-Path $root ".superpowers\sdd"
  $OutFile = Join-Path $dir "task-$TaskNumber-brief.md"
}

$content = Get-Content -Path $PlanFile -Raw
$inFence = $false
$inTask = $false
$lines = $content -split "`n"
$result = @()
$headerPattern = "^#+\s+Task\s+$TaskNumber" + '(\s|:|\.|\z|$)'

foreach ($line in $lines) {
  if ($line -match '^```') { $inFence = -not $inFence }
  if (-not $inFence -and $line -match "^#+\s+Task\s+\d+") {
    $inTask = ($line -match $headerPattern)
  }
  if ($inTask) { $result += $line }
}

$output = $result -join "`n"
Set-Content -Path $OutFile -Value $output -Encoding utf8

if ($result.Count -eq 0) {
  Write-Error "Task $TaskNumber not found in $PlanFile"
  exit 3
}

Write-Output "wrote $OutFile : $($result.Count) lines"
