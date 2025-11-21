# Create New Supabase Migration
# Usage: .\new-migration.ps1 "add_user_preferences"

param(
    [Parameter(Mandatory=$true)]
    [string]$Description
)

# Ensure we're in the right directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$migrationsPath = Join-Path $scriptPath "migrations"

if (-not (Test-Path $migrationsPath)) {
    Write-Error "Migrations directory not found: $migrationsPath"
    exit 1
}

# Generate timestamp
$timestamp = Get-Date -Format "yyyyMMddHHmmss"

# Clean up description (replace spaces with underscores, lowercase)
$cleanDescription = $Description.ToLower() -replace '\s+', '_' -replace '[^a-z0-9_]', ''

# Create filename
$filename = "${timestamp}_${cleanDescription}.sql"
$filepath = Join-Path $migrationsPath $filename

# Check for recent similar migrations
Write-Host "`n🔍 Checking for similar migrations..." -ForegroundColor Yellow
$existingKeywords = $cleanDescription -split '_' | Where-Object { $_.Length -gt 3 }
foreach ($keyword in $existingKeywords) {
    $similar = Get-ChildItem -Path $migrationsPath -Filter "*.sql" | 
               Select-String -Pattern $keyword -List | 
               Select-Object -ExpandProperty Path -Unique
    
    if ($similar) {
        Write-Host "⚠️  Found migrations with '$keyword':" -ForegroundColor Yellow
        foreach ($file in $similar) {
            Write-Host "   - $(Split-Path -Leaf $file)" -ForegroundColor Gray
        }
    }
}

# Ask for confirmation
Write-Host "`n📝 Creating migration: $filename" -ForegroundColor Cyan
$confirm = Read-Host "Continue? (Y/n)"
if ($confirm -eq 'n' -or $confirm -eq 'N') {
    Write-Host "Cancelled." -ForegroundColor Red
    exit 0
}

# Create migration file template
$template = @"
-- ============================================================================
-- Migration: $Description
-- Date: $(Get-Date -Format "yyyy-MM-dd")
-- Description: [Describe what this migration does and why]
-- ============================================================================

-- Example: Create a new table
-- CREATE TABLE IF NOT EXISTS your_table (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- Example: Add RLS policies
-- ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Users can view own records"
--   ON your_table FOR SELECT
--   USING (auth.uid() = user_id);

-- Example: Create helper function
-- CREATE OR REPLACE FUNCTION public.your_function()
-- RETURNS VOID
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS `$`$
-- BEGIN
--   -- Your function logic here
-- END;
-- `$`$;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DROP TABLE IF EXISTS your_table;
-- DROP FUNCTION IF EXISTS public.your_function();
"@

# Write template to file
$template | Out-File -FilePath $filepath -Encoding UTF8

Write-Host "`n✅ Created: $filename" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Edit the migration: code $filepath" -ForegroundColor White
Write-Host "   2. Write your SQL changes" -ForegroundColor White
Write-Host "   3. Test locally: supabase db reset" -ForegroundColor White
Write-Host "   4. If it fails, fix the file (don't create a new one!)" -ForegroundColor White
Write-Host "   5. Commit when working: git add $filepath" -ForegroundColor White

# Open in VS Code if available
if (Get-Command code -ErrorAction SilentlyContinue) {
    Write-Host "`n🚀 Opening in VS Code..." -ForegroundColor Cyan
    code $filepath
} else {
    Write-Host "`n💡 Tip: Install VS Code for automatic opening" -ForegroundColor Gray
}
