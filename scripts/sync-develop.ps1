<#
.SYNOPSIS
Fetches origin, pulls latest develop, returns to feature branch, and merges develop.
#>

Write-Host "=== SYNC DEVELOP ===" -ForegroundColor Cyan

try {
    $currentBranch = git branch --show-current
    if ([string]::IsNullOrWhiteSpace($currentBranch)) {
        Write-Host "Error: Not a valid Git repository." -ForegroundColor Red
        exit
    }

    Write-Host "1. Fetching origin..." -ForegroundColor Yellow
    git fetch origin

    Write-Host "`n2. Switching to develop and pulling latest..." -ForegroundColor Yellow
    git switch develop
    git pull origin develop

    Write-Host "`n3. Switching back to $currentBranch..." -ForegroundColor Yellow
    git switch $currentBranch

    Write-Host "`n4. Merging develop into $currentBranch..." -ForegroundColor Yellow
    git merge develop

    Write-Host "`n=== SYNC COMPLETE ===" -ForegroundColor Green
    Write-Host "If there are merge conflicts, please resolve them carefully. Do not automatically choose one side!" -ForegroundColor Red
} catch {
    Write-Host "An error occurred during synchronization." -ForegroundColor Red
}
