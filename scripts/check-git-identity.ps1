<#
.SYNOPSIS
Displays the current Git identity, branch, remote, and status.
#>

Write-Host "=== GIT IDENTITY CHECK ===" -ForegroundColor Cyan
Write-Host "Current Folder: $((Get-Item .).FullName)"

try {
    $author = git config --local user.name
    $email = git config --local user.email
    $branch = git branch --show-current
    $remote = git remote get-url origin
    $status = git status --short

    Write-Host "Git Author:     $author" -ForegroundColor Green
    Write-Host "Git Email:      $email" -ForegroundColor Green
    Write-Host "Branch:         $branch" -ForegroundColor Green
    Write-Host "Remote:         $remote" -ForegroundColor Green
    Write-Host "Working Tree:   $(if ([string]::IsNullOrWhiteSpace($status)) { 'Clean' } else { 'Has uncommitted changes' })" -ForegroundColor Yellow

} catch {
    Write-Host "Error: Not a valid Git repository or Git is not installed." -ForegroundColor Red
}
