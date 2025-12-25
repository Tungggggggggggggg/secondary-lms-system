param(
  [ValidateSet('xelatex','lualatex')]
  [string]$Engine = 'lualatex',

  [switch]$RenderUml
)

$ErrorActionPreference = 'Stop'

$texDir = $PSScriptRoot
$texFile = Join-Path $texDir 'luanvan.tex'
$outDir = $texDir

if (-not (Test-Path $texFile)) {
  throw "Missing LaTeX file: $texFile"
}

function Test-CommandExists([string]$name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Add-MiKTeXToPathIfPresent {
  $candidates = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\MiKTeX\miktex\bin\x64'),
    (Join-Path $env:LOCALAPPDATA 'MiKTeX\miktex\bin\x64'),
    (Join-Path $env:ProgramFiles 'MiKTeX\miktex\bin\x64'),
    (Join-Path ${env:ProgramFiles(x86)} 'MiKTeX\miktex\bin\x64')
  ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

  foreach ($dir in $candidates) {
    if ($env:Path -notlike "*$dir*") {
      $env:Path = "$dir;$env:Path"
    }
  }
}

if (-not (Test-CommandExists $Engine)) {
  Add-MiKTeXToPathIfPresent
}

if (-not (Test-CommandExists $Engine)) {
  throw "LaTeX engine '$Engine' was not found in PATH. Ensure MiKTeX is installed and its bin\\x64 directory is on PATH (then reopen the terminal/IDE)."
}

if ($RenderUml) {
  $renderScript = Join-Path $texDir 'render-uml.ps1'
  if (Test-Path $renderScript) {
    & $renderScript
  }
}

$commonArgs = @(
  '-interaction=nonstopmode',
  '-halt-on-error',
  '-file-line-error',
  "-output-directory=$outDir",
  $texFile
)

& $Engine @commonArgs
& $Engine @commonArgs

$pdf = Join-Path $outDir 'luanvan.pdf'
if (-not (Test-Path $pdf)) {
  throw "Build finished but PDF not found at: $pdf"
}

Write-Host "OK: $pdf" -ForegroundColor Green
