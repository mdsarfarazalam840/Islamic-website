param(
  [Parameter(Mandatory=$true)][string]$Base,
  [Parameter(Mandatory=$true)][string]$Head,
  [string]$OutFile = ""
)

if (-not $OutFile) {
  $root = git rev-parse --show-toplevel 2>$null
  if (-not $root) { $root = "F:\Pro\Quran-website" }
  $dir = Join-Path $root ".superpowers\sdd"
  $baseShort = git rev-parse --short $Base
  $headShort = git rev-parse --short $Head
  $OutFile = Join-Path $dir "review-${baseShort}..${headShort}.diff"
}

$commits = git log --oneline "${Base}..${Head}"
$stat = git diff --stat "${Base}..${Head}"
$diff = git diff -U10 "${Base}..${Head}"

$content = @"
# Review package: ${Base}..${Head}

## Commits
$commits

## Files changed
$stat

## Diff
$diff
"@

Set-Content -Path $OutFile -Value $content -Encoding utf8

$commitCount = (git rev-list --count "${Base}..${Head}").Trim()
Write-Output "wrote ${OutFile}: ${commitCount} commit(s), $((Get-Item $OutFile).Length) bytes"
