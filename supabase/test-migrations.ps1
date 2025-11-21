# Test Migrations Locally
# This script helps you test migrations before committing

Write-Host "`n🧪 Testing Migrations Locally" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check if in correct directory
if (-not (Test-Path ".\supabase\config.toml")) {
    Write-Error "Must run from Jensify root directory (C:\Jensify)"
    exit 1
}

# List current migrations
Write-Host "📋 Current migrations:" -ForegroundColor Yellow
$migrations = Get-ChildItem ".\supabase\migrations\*.sql" | Sort-Object Name
$migrations | ForEach-Object { Write-Host "   - $($_.Name)" -ForegroundColor Gray }
Write-Host ""

# Ask if user wants to continue
$confirm = Read-Host "Test these migrations? (Y/n)"
if ($confirm -eq 'n' -or $confirm -eq 'N') {
    Write-Host "Cancelled." -ForegroundColor Red
    exit 0
}

Write-Host "`n🔄 Stopping Supabase..." -ForegroundColor Cyan
supabase stop --no-backup

Write-Host "`n🚀 Starting fresh with migrations..." -ForegroundColor Cyan
$output = supabase start 2>&1 | Out-String

# Check for errors
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ MIGRATION FAILED!" -ForegroundColor Red
    Write-Host "`n$output" -ForegroundColor Red
    
    Write-Host "`n📋 Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "   1. Check the error message above" -ForegroundColor White
    Write-Host "   2. Fix the failing migration file directly" -ForegroundColor White
    Write-Host "   3. DO NOT create a new 'fix' migration" -ForegroundColor White
    Write-Host "   4. Run this script again to test" -ForegroundColor White
    
    # Try to identify failing migration
    if ($output -match "Applying migration (\S+)") {
        $failingMigration = $matches[1]
        Write-Host "`n⚠️  Failing migration: $failingMigration" -ForegroundColor Yellow
        Write-Host "   Edit: code supabase\migrations\$failingMigration" -ForegroundColor White
    }
    
    exit 1
}

Write-Host "`n✅ ALL MIGRATIONS PASSED!" -ForegroundColor Green
Write-Host "`n🎉 Local Supabase is running:" -ForegroundColor Cyan

# Extract URLs from output
if ($output -match "API URL: (.+)") { Write-Host "   API: $($matches[1])" -ForegroundColor White }
if ($output -match "Studio URL: (.+)") { Write-Host "   Studio: $($matches[1])" -ForegroundColor White }
if ($output -match "Database URL: (.+)") { Write-Host "   Database: $($matches[1])" -ForegroundColor White }

Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Verify schema in Studio (http://127.0.0.1:54323)" -ForegroundColor White
Write-Host "   2. Test the app: cd expense-app; ng serve --configuration=development" -ForegroundColor White
Write-Host "   3. When satisfied, commit: git add supabase/migrations/*.sql" -ForegroundColor White

Write-Host "`n💡 To stop: supabase stop" -ForegroundColor Gray
