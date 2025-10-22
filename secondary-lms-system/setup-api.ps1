# ===========================================
# setup-api.ps1
# Create empty API routes folder structure
# ===========================================

$ErrorActionPreference = "Stop"

$base = "src/app/api"
Write-Host "Creating API folder structure at: $base"

# Define all API routes
$structure = @(
    "auth/[...nextauth]/route.ts",
    "courses/route.ts",
    "courses/[id]/route.ts",
    "lessons/route.ts",
    "lessons/[id]/route.ts",
    "assignments/route.ts",
    "assignments/[id]/route.ts",
    "assignments/[id]/submissions/route.ts",
    "grades/route.ts",
    "grades/export/route.ts",
    "users/route.ts",
    "users/[id]/route.ts",
    "notifications/route.ts",
    "notifications/[id]/route.ts",
    "upload/route.ts"
)

foreach ($path in $structure) {
    $fullPath = Join-Path $base $path
    $dir = Split-Path $fullPath -Parent

    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created directory: $dir"
    }

    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType File -Path $fullPath -Force | Out-Null
        Write-Host "Created file: $fullPath"
    }
}

Write-Host "API folder structure created successfully."
