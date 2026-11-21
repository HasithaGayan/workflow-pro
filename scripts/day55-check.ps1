
# WorkFlow Pro - Day 55 Quality Assurance
# Runs checks without resetting the database.

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot

function Check-Result {
    param([string]$Name)

    if ($LASTEXITCODE -ne 0) {
        throw "$Name FAILED. STOP. Do not commit."
    }

    Write-Host "PASSED: $Name" -ForegroundColor Green
}

$testSuites = @(
    "test:api",
    "test:write",
    "test:teams",
    "test:auth",
    "test:access",
    "test:roles",
    "test:security",
    "test:csrf",
    "test:members"
)

Push-Location $projectRoot

try {
    Write-Host "DAY 55 - WORKFLOW PRO QA" -ForegroundColor Cyan

    # Backend validation
    Push-Location ".\server"

    try {
        Write-Host "`nChecking backend TypeScript..."

        npm.cmd run typecheck
        Check-Result "Backend TypeScript"

        foreach ($suite in $testSuites) {
            Write-Host "`nRunning $suite..."

            npm.cmd run $suite
            Check-Result $suite
        }

        Write-Host "`nChecking backend dependencies..."

        npm.cmd audit --omit=dev
        Check-Result "Backend security audit"
    }
    finally {
        Pop-Location
    }

    # Frontend validation
    Write-Host "`nBuilding Next.js frontend..."

    npm.cmd run build
    Check-Result "Frontend production build"

    Write-Host "`nChecking frontend TypeScript..."

    npx.cmd tsc --noEmit -p ".\tsconfig.json"
    Check-Result "Frontend TypeScript"

    Write-Host "`nChecking frontend dependencies..."

    npm.cmd audit --omit=dev
    Check-Result "Frontend security audit"

    # Git verification
    Write-Host "`nChecking Git status..."

    git status --short --branch
    Check-Result "Git status"

    Write-Host "`nALL DAY 55 CHECKS PASSED!" -ForegroundColor Green
    Write-Host "Verified 9 backend test suites."
    Write-Host "Review test totals above."
    Write-Host "Ready for Git review."
}
finally {
    Pop-Location
}
