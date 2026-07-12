<#
.SYNOPSIS
Verifies repo state before pushing.
#>

Write-Host "=== PRE-PUSH CHECK ===" -ForegroundColor Cyan

$hasErrors = $false

# Check Identity
$author = git config --local user.name
$email = git config --local user.email
Write-Host "Author: $author ($email)" -ForegroundColor Green

# Check Remote
$remote = git remote get-url origin
Write-Host "Remote: $remote" -ForegroundColor Green

# Check Branch
$branch = git branch --show-current
Write-Host "Branch: $branch" -ForegroundColor Green
if ($branch -eq "main" -or $branch -eq "develop") {
    Write-Host "[!] WARNING: You are on $branch. Pushing directly to $branch is not allowed!" -ForegroundColor Red
    $hasErrors = $true
}

# Check for sensitive files
Write-Host "Checking for sensitive files..." -ForegroundColor Yellow
$sensitiveFiles = @(".env", "id_rsa", "id_ed25519", "password", "secret")
$stagedFiles = git diff --name-only --cached
foreach ($file in $sensitiveFiles) {
    if ($stagedFiles -match $file) {
        Write-Host "[!] ERROR: Sensitive file staged for commit: $file" -ForegroundColor Red
        $hasErrors = $true
    }
}

# Check for uncommitted migrations/tests (mock check)
Write-Host "Checking tests and migrations..." -ForegroundColor Yellow
$status = git status --short
if ($status -match "database/migrations") {
    Write-Host "[!] ERROR: Uncommitted database migrations found." -ForegroundColor Red
    $hasErrors = $true
}

if ($hasErrors) {
    Write-Host "`n=== PUSH CANCELLED ===" -ForegroundColor Red
    Write-Host "Please fix the issues above before pushing." -ForegroundColor Red
} else {
    Write-Host "`n=== ALL CHECKS PASSED ===" -ForegroundColor Green
    $confirmation = Read-Host "Do you want to proceed with push? (yes/no)"
    if ($confirmation -eq "yes") {
        git push origin $branch
    } else {
        Write-Host "Push cancelled by user." -ForegroundColor Yellow
    }
}
