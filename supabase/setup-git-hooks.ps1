# Setup Git Hooks for Migration Safety
# Run once to install automatic pre-commit checks

Write-Host "`n🔧 Setting Up Git Hooks" -ForegroundColor Cyan
Write-Host "=====================`n" -ForegroundColor Cyan

# Check if in git repo
if (-not (Test-Path ".\.git")) {
    Write-Error "Not in a git repository! Must run from C:\Jensify"
    exit 1
}

$hooksDir = ".\.git\hooks"
$preCommitHook = Join-Path $hooksDir "pre-commit"

# Create the pre-commit hook
$hookContent = @'
#!/usr/bin/env pwsh
# Git Pre-Commit Hook - Automatically checks migrations before commit

$ErrorActionPreference = "Stop"

# Only run if migration files are being committed
$stagedMigrations = git diff --cached --name-only --diff-filter=ACM | Where-Object { $_ -match 'supabase/migrations/.*\.sql$' }

if (-not $stagedMigrations) {
    exit 0
}

Write-Host "`n🔍 Pre-Commit: Checking migrations..." -ForegroundColor Cyan

$errors = 0

# Check timestamp format
foreach ($file in $stagedMigrations) {
    $filename = Split-Path -Leaf $file
    if ($filename -notmatch '^\d{14}_') {
        Write-Host "❌ Bad timestamp: $filename (use yyyyMMddHHmmss)" -ForegroundColor Red
        $errors++
    }
}

# Check dangerous patterns
$dangerousPatterns = @{
    'CREATE FUNCTION auth\.' = 'auth schema'
    'COMMENT ON POLICY.*storage\.objects' = 'storage.objects comments'
}

foreach ($file in $stagedMigrations) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        foreach ($pattern in $dangerousPatterns.Keys) {
            if ($content -match $pattern) {
                Write-Host "❌ Dangerous: $(Split-Path -Leaf $file) uses $($dangerousPatterns[$pattern])" -ForegroundColor Red
                $errors++
            }
        }
    }
}

if ($errors -gt 0) {
    Write-Host "`n❌ COMMIT BLOCKED - Fix errors or use --no-verify to skip`n" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Checks passed!`n" -ForegroundColor Green
exit 0
'@

# Write the hook
$hookContent | Out-File -FilePath $preCommitHook -Encoding UTF8 -Force

# Make it executable (on Unix-like systems, not needed on Windows)
if ($PSVersionTable.Platform -eq 'Unix') {
    chmod +x $preCommitHook
}

Write-Host "✅ Installed pre-commit hook" -ForegroundColor Green
Write-Host "`n📋 What this does:" -ForegroundColor Cyan
Write-Host "   • Automatically runs when you 'git commit'" -ForegroundColor White
Write-Host "   • Checks migration timestamp format" -ForegroundColor White
Write-Host "   • Detects dangerous patterns (auth., storage.objects)" -ForegroundColor White
Write-Host "   • Blocks commit if errors found" -ForegroundColor White

Write-Host "`n💡 To bypass (emergency only):" -ForegroundColor Yellow
Write-Host "   git commit --no-verify" -ForegroundColor Gray

Write-Host "`n🧪 Test it:" -ForegroundColor Cyan
Write-Host "   1. Make a change to a migration" -ForegroundColor White
Write-Host "   2. git add supabase/migrations/..." -ForegroundColor White
Write-Host "   3. git commit -m 'test'" -ForegroundColor White
Write-Host "   4. Hook will run automatically!" -ForegroundColor White

Write-Host "`n✅ Setup complete!`n" -ForegroundColor Green
