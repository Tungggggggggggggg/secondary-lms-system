param(
  [string]$PlantUmlJar = "$PSScriptRoot\tools\plantuml.jar"
)

$ErrorActionPreference = "Stop"

$umlDir = Join-Path $PSScriptRoot "figures\uml"

if (-not (Test-Path $umlDir)) {
  throw "UML directory not found: $umlDir"
}

if (-not (Test-Path $PlantUmlJar)) {
  Write-Host "Missing PlantUML jar: $PlantUmlJar" -ForegroundColor Yellow
  Write-Host "Download plantuml.jar and place it at: $PlantUmlJar" -ForegroundColor Yellow
  Write-Host "Suggested: https://plantuml.com/download" -ForegroundColor Yellow
  exit 1
}

Write-Host "Rendering PlantUML .puml -> .png in: $umlDir" -ForegroundColor Cyan

# Render all .puml to PNG (output to same directory)
& java -jar $PlantUmlJar -tpng -charset UTF-8 "$umlDir\*.puml"

Write-Host "Done. PNGs should be created next to the .puml files." -ForegroundColor Green
