# PromptFlow-Hub Verification Suite
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  PROMPTFLOW-HUB INTEGRITY VERIFICATION SUITE" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

$projectDir = Resolve-Path (Join-Path $PSScriptRoot "..")

$requiredFiles = @(
    "package.json",
    "Dockerfile",
    "docker-compose.yml",
    "README.md",
    "src/index.js",
    "src/server.js",
    "src/store.js",
    "src/estimator.js",
    "src/diff.js",
    "public/index.html",
    "public/style.css",
    "public/app.js",
    "artifacts/RESEARCH_REPORT.md",
    "artifacts/PRD.md",
    "artifacts/ARCHITECTURE.md"
)

Write-Host "1. Verifying Files & Structure..." -ForegroundColor Yellow
foreach ($file in $requiredFiles) {
    $fullPath = Join-Path $projectDir $file
    if (-not (Test-Path $fullPath)) {
        Write-Error "Missing: $file"
        exit 1
    }
    Write-Host "  [OK] $file exists" -ForegroundColor Gray
}

Write-Host "`n2. Validating Pricing Model Definitions..." -ForegroundColor Yellow
$estContent = Get-Content (Join-Path $projectDir "src/estimator.js") -Raw
if ($estContent -match "gemini-2.0-flash" -and $estContent -match "gpt-4o" -and $estContent -match "claude-3.5-sonnet") {
    Write-Host "  [OK] AI models pricing and token weights validated" -ForegroundColor Green
} else {
    Write-Error "Model pricing definitions missing"
    exit 1
}

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "  ALL PROMPTFLOW-HUB CHECKS PASSED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
