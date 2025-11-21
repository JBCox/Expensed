# Pre-Commit Migration Check
# Run this before committing migrations to catch common mistakes

Write-Host "`n🔍 Pre-Commit Migration Check" -ForegroundColor Cyan
Write-Host "============================`n" -ForegroundColor Cyan

$errors = 0
$warnings = 0

# Check if we're in the right place
if (-not (Test-Path ".\supabase\migrations")) {
    Write-Error "Must run from Jensify root directory"
    exit 1
}

$migrations = Get-ChildItem ".\supabase\migrations\*.sql" | Sort-Object Name

Write-Host "📋 Found $($migrations.Count) migrations`n" -ForegroundColor Yellow

# Check 1: Timestamp format
Write-Host "1️⃣  Checking timestamp formats..." -ForegroundColor Cyan
foreach ($migration in $migrations) {
    if ($migration.Name -notmatch '^\d{14}_') {
        Write-Host "   ❌ Bad timestamp: $($migration.Name)" -ForegroundColor Red
        Write-Host "      Must be yyyyMMddHHmmss format" -ForegroundColor Gray
        $errors++
    }
}
if ($errors -eq 0) {
    Write-Host "   ✅ All timestamps valid" -ForegroundColor Green
}

# Check 2: Duplicate timestamps
Write-Host "`n2️⃣  Checking for duplicate timestamps..." -ForegroundColor Cyan
$timestamps = $migrations | ForEach-Object { $_.Name.Substring(0, 14) }
$duplicates = $timestamps | Group-Object | Where-Object { $_.Count -gt 1 }
if ($duplicates) {
    foreach ($dup in $duplicates) {
        Write-Host "   ❌ Duplicate timestamp: $($dup.Name)" -ForegroundColor Red
        $errors++
    }
} else {
    Write-Host "   ✅ No duplicates" -ForegroundColor Green
}

# Check 3: Dangerous patterns
Write-Host "`n3️⃣  Checking for dangerous patterns..." -ForegroundColor Cyan
$dangerousPatterns = @{
    'CREATE FUNCTION auth\.' = 'Creating functions in auth schema (use public.)'
    'CREATE TABLE auth\.' = 'Creating tables in auth schema (use public.)'
    'COMMENT ON POLICY.*storage\.objects' = 'Commenting on storage.objects (permission denied)'
    'DROP POLICY.*ON.*(?!IF EXISTS)' = 'DROP POLICY without IF EXISTS'
    'CREATE POLICY.*ON.*(?!IF NOT EXISTS)' = 'CREATE without checking existence (should use DROP IF EXISTS first)'
}

foreach ($migration in $migrations) {
    $content = Get-Content $migration.FullName -Raw
    foreach ($pattern in $dangerousPatterns.Keys) {
        if ($content -match $pattern) {
            Write-Host "   ⚠️  $($migration.Name)" -ForegroundColor Yellow
            Write-Host "      $($dangerousPatterns[$pattern])" -ForegroundColor Gray
            $warnings++
        }
    }
}
if ($warnings -eq 0) {
    Write-Host "   ✅ No dangerous patterns" -ForegroundColor Green
}

# Check 4: Look for "fix" migrations
Write-Host "`n4️⃣  Checking for 'fix' migrations..." -ForegroundColor Cyan
$fixMigrations = $migrations | Where-Object { $_.Name -match '_fix_|_patch_' }
if ($fixMigrations) {
    foreach ($fix in $fixMigrations) {
        Write-Host "   ⚠️  Possible redundant fix: $($fix.Name)" -ForegroundColor Yellow
        Write-Host "      Consider merging into original migration if not yet deployed" -ForegroundColor Gray
        $warnings++
    }
} else {
    Write-Host "   ✅ No fix migrations" -ForegroundColor Green
}

# Check 5: Recent migrations (last 24 hours)
Write-Host "`n5️⃣  Checking recent migrations..." -ForegroundColor Cyan
$recent = $migrations | Where-Object { $_.LastWriteTime -gt (Get-Date).AddHours(-24) }
if ($recent) {
    Write-Host "   📝 Recent changes (last 24h):" -ForegroundColor Yellow
    foreach ($m in $recent) {
        Write-Host "      - $($m.Name)" -ForegroundColor Gray
        Write-Host "        Modified: $($m.LastWriteTime.ToString('yyyy-MM-dd HH:mm'))" -ForegroundColor DarkGray
    }
}

# Check 6: Test status
Write-Host "`n6️⃣  Checking test status..." -ForegroundColor Cyan
$supabaseStatus = docker ps --filter "name=supabase_db" --format "{{.Status}}"
if ($supabaseStatus -like "*Up*") {
    Write-Host "   ✅ Local Supabase running" -ForegroundColor Green
    Write-Host "      Last tested at: $(docker ps --filter 'name=supabase_db' --format '{{.RunningFor}}')" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  Local Supabase not running" -ForegroundColor Yellow
    Write-Host "      Run: .\test-migrations.ps1" -ForegroundColor Gray
    $warnings++
}

# Summary
Write-Host "`n" + "="*50 -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "   Errors: $errors" -ForegroundColor $(if ($errors -gt 0) { "Red" } else { "Green" })
Write-Host "   Warnings: $warnings" -ForegroundColor $(if ($warnings -gt 0) { "Yellow" } else { "Green" })

if ($errors -gt 0) {
    Write-Host "`n❌ FIX ERRORS BEFORE COMMITTING!" -ForegroundColor Red
    exit 1
}

if ($warnings -gt 0) {
    Write-Host "`n⚠️  Review warnings before committing" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne 'y' -and $continue -ne 'Y') {
        Write-Host "Cancelled." -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n✅ Ready to commit!" -ForegroundColor Green
Write-Host "`n📋 Recommended commands:" -ForegroundColor Cyan
Write-Host "   git add supabase/migrations/*.sql" -ForegroundColor White
Write-Host "   git commit -m 'Add migration: [description]'" -ForegroundColor White
