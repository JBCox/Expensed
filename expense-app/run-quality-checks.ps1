# Jensify Code Quality & Foundation Check Script
# Created: 2025-12-04
# Purpose: Comprehensive quality checks for Jensify expense-app

$ErrorActionPreference = "Continue"
$host.UI.RawUI.WindowTitle = "Jensify Quality Checks"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "JENSIFY CODE QUALITY CHECKS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create output directory for reports
$reportsDir = "quality-reports"
if (-not (Test-Path $reportsDir)) {
    New-Item -ItemType Directory -Path $reportsDir | Out-Null
}

# Set timestamp for report files
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$summaryFile = "$reportsDir\summary-$timestamp.txt"

# Initialize results
$results = @{
    BuildPass = $false
    TestPass = $false
    LintPass = $false
    AuditPass = $false
    BundlePass = $false
}

$issues = @{
    Critical = @()
    Minor = @()
}

# Helper function to write to both console and summary file
function Write-Summary {
    param($Message, $Color = "White")
    Write-Host $Message -ForegroundColor $Color
    Add-Content -Path $summaryFile -Value $Message
}

# Start summary file
"JENSIFY CODE QUALITY CHECK SUMMARY" | Out-File $summaryFile
"Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File $summaryFile -Append
"=" * 60 | Out-File $summaryFile -Append
"" | Out-File $summaryFile -Append

# ==========================================
# 1. TypeScript Compilation Check
# ==========================================
Write-Host "[1/5] TypeScript Compilation Check..." -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Yellow
Write-Host "Running: ng build --configuration production" -ForegroundColor Gray
Write-Host ""

$buildOutput = "$reportsDir\build-output-$timestamp.txt"
try {
    $buildProcess = Start-Process -FilePath "ng" -ArgumentList "build", "--configuration", "production" `
        -RedirectStandardOutput $buildOutput -RedirectStandardError "$reportsDir\build-errors-$timestamp.txt" `
        -NoNewWindow -PassThru -Wait

    if ($buildProcess.ExitCode -eq 0) {
        Write-Summary "✅ PASS: TypeScript compilation successful" -Color Green
        $results.BuildPass = $true
    } else {
        Write-Summary "❌ FAIL: TypeScript compilation errors found" -Color Red
        $issues.Critical += "TypeScript compilation failed (see $buildOutput)"
    }
} catch {
    Write-Summary "❌ FAIL: Build process crashed - $($_.Exception.Message)" -Color Red
    $issues.Critical += "Build process error: $($_.Exception.Message)"
}
Write-Host ""

# ==========================================
# 2. Unit Tests Execution
# ==========================================
Write-Host "[2/5] Unit Tests Execution..." -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Yellow
Write-Host "Running: npm test -- --no-watch --code-coverage --browsers=ChromeHeadless" -ForegroundColor Gray
Write-Host ""

$testOutput = "$reportsDir\test-output-$timestamp.txt"
try {
    $testProcess = Start-Process -FilePath "npm" -ArgumentList "test", "--", "--no-watch", "--code-coverage", "--browsers=ChromeHeadless" `
        -RedirectStandardOutput $testOutput -RedirectStandardError "$reportsDir\test-errors-$timestamp.txt" `
        -NoNewWindow -PassThru -Wait

    # Parse test output for results
    $testContent = Get-Content $testOutput -Raw

    if ($testContent -match "(\d+) specs?, (\d+) failures?") {
        $totalTests = $matches[1]
        $failures = $matches[2]

        if ($failures -eq 0) {
            Write-Summary "✅ PASS: All $totalTests tests passed" -Color Green
            $results.TestPass = $true
        } else {
            Write-Summary "❌ FAIL: $failures of $totalTests tests failed" -Color Red
            $issues.Critical += "Test failures: $failures/$totalTests failed (see $testOutput)"
        }
    } else {
        Write-Summary "⚠️  WARNING: Could not parse test results" -Color Yellow
        $issues.Minor += "Test result parsing failed (see $testOutput)"
    }

    # Check code coverage
    if ($testContent -match "Statements\s*:\s*(\d+\.?\d*)%") {
        $coverage = [double]$matches[1]
        if ($coverage -ge 70) {
            Write-Summary "✅ PASS: Code coverage: $coverage% (target: 70%+)" -Color Green
        } else {
            Write-Summary "❌ FAIL: Code coverage: $coverage% (target: 70%+)" -Color Red
            $issues.Critical += "Code coverage below target: $coverage% < 70%"
        }
    }
} catch {
    Write-Summary "❌ FAIL: Test execution crashed - $($_.Exception.Message)" -Color Red
    $issues.Critical += "Test execution error: $($_.Exception.Message)"
}
Write-Host ""

# ==========================================
# 3. Linting Check
# ==========================================
Write-Host "[3/5] Linting Check..." -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Yellow
Write-Host "Running: ng lint" -ForegroundColor Gray
Write-Host ""

$lintOutput = "$reportsDir\lint-output-$timestamp.txt"
try {
    $lintProcess = Start-Process -FilePath "ng" -ArgumentList "lint" `
        -RedirectStandardOutput $lintOutput -RedirectStandardError "$reportsDir\lint-errors-$timestamp.txt" `
        -NoNewWindow -PassThru -Wait

    if ($lintProcess.ExitCode -eq 0) {
        Write-Summary "✅ PASS: No linting errors" -Color Green
        $results.LintPass = $true
    } else {
        Write-Summary "❌ FAIL: Linting errors found" -Color Red
        $issues.Minor += "Linting errors found (see $lintOutput)"
    }
} catch {
    Write-Summary "⚠️  WARNING: Linting not configured or failed - $($_.Exception.Message)" -Color Yellow
    $issues.Minor += "Linting check failed: $($_.Exception.Message)"
}
Write-Host ""

# ==========================================
# 4. Dependency Audit
# ==========================================
Write-Host "[4/5] Dependency Audit..." -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Yellow
Write-Host "Running: npm audit" -ForegroundColor Gray
Write-Host ""

$auditOutput = "$reportsDir\audit-output-$timestamp.txt"
try {
    npm audit --json | Out-File $auditOutput
    $auditJson = Get-Content $auditOutput | ConvertFrom-Json

    $high = $auditJson.metadata.vulnerabilities.high
    $critical = $auditJson.metadata.vulnerabilities.critical

    if ($high -eq 0 -and $critical -eq 0) {
        Write-Summary "✅ PASS: No high or critical vulnerabilities" -Color Green
        $results.AuditPass = $true
    } else {
        Write-Summary "⚠️  WARNING: Found $critical critical and $high high severity vulnerabilities" -Color Yellow
        $issues.Minor += "Security vulnerabilities: $critical critical, $high high"
    }
} catch {
    Write-Summary "⚠️  WARNING: Dependency audit failed - $($_.Exception.Message)" -Color Yellow
    $issues.Minor += "Audit check failed: $($_.Exception.Message)"
}
Write-Host ""

# ==========================================
# 5. Bundle Size Analysis
# ==========================================
Write-Host "[5/5] Bundle Size Analysis..." -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Yellow
Write-Host "Checking dist folder..." -ForegroundColor Gray
Write-Host ""

$bundleOutput = "$reportsDir\bundle-size-$timestamp.txt"
if (Test-Path "dist") {
    try {
        $distSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum
        $distSizeMB = [math]::Round($distSize / 1MB, 2)

        "Bundle Size Report" | Out-File $bundleOutput
        "Total Size: $distSizeMB MB" | Out-File $bundleOutput -Append
        "" | Out-File $bundleOutput -Append
        Get-ChildItem -Path "dist" -Recurse |
            Select-Object Name, Length, LastWriteTime |
            Sort-Object Length -Descending |
            Out-File $bundleOutput -Append

        Write-Summary "✅ PASS: Bundle size: $distSizeMB MB" -Color Green
        $results.BundlePass = $true

        if ($distSizeMB -gt 10) {
            Write-Summary "⚠️  WARNING: Large bundle size (>10MB)" -Color Yellow
            $issues.Minor += "Bundle size large: $distSizeMB MB"
        }
    } catch {
        Write-Summary "⚠️  WARNING: Could not analyze bundle size - $($_.Exception.Message)" -Color Yellow
        $issues.Minor += "Bundle analysis failed: $($_.Exception.Message)"
    }
} else {
    Write-Summary "❌ FAIL: No dist folder found (build may have failed)" -Color Red
    $issues.Critical += "No dist folder found"
}
Write-Host ""

# ==========================================
# Summary Report
# ==========================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "QUALITY CHECK SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

"" | Out-File $summaryFile -Append
"RESULTS" | Out-File $summaryFile -Append
"=" * 60 | Out-File $summaryFile -Append

$passCount = ($results.Values | Where-Object { $_ -eq $true }).Count
$totalChecks = $results.Count

Write-Summary "Checks Passed: $passCount / $totalChecks"
Write-Summary ""

Write-Summary "Critical Issues: $($issues.Critical.Count)" -Color $(if ($issues.Critical.Count -gt 0) { "Red" } else { "Green" })
foreach ($issue in $issues.Critical) {
    Write-Summary "  - $issue" -Color Red
}

Write-Summary ""
Write-Summary "Minor Issues: $($issues.Minor.Count)" -Color $(if ($issues.Minor.Count -gt 0) { "Yellow" } else { "Green" })
foreach ($issue in $issues.Minor) {
    Write-Summary "  - $issue" -Color Yellow
}

Write-Summary ""
Write-Summary "Reports saved to: $reportsDir\"
Write-Summary "Summary file: $summaryFile"
Write-Summary ""

# Overall assessment
if ($issues.Critical.Count -eq 0) {
    Write-Summary "OVERALL ASSESSMENT: ✅ PASS" -Color Green
    exit 0
} else {
    Write-Summary "OVERALL ASSESSMENT: ❌ FAIL" -Color Red
    exit 1
}
