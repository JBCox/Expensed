@echo off
REM Jensify Code Quality & Foundation Check Script
REM Created: 2025-12-04
REM Purpose: Comprehensive quality checks for Jensify expense-app

echo ========================================
echo JENSIFY CODE QUALITY CHECKS
echo ========================================
echo.

REM Create output directory for reports
if not exist "quality-reports" mkdir quality-reports

REM Set timestamp for report files
set TIMESTAMP=%date:~-4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

echo [1/5] TypeScript Compilation Check...
echo ======================================
echo Running: ng build --configuration production
echo.
call ng build --configuration production > quality-reports\build-output-%TIMESTAMP%.txt 2>&1
if %errorlevel% neq 0 (
    echo ❌ FAIL: TypeScript compilation errors found
    echo See: quality-reports\build-output-%TIMESTAMP%.txt
    echo.
) else (
    echo ✅ PASS: TypeScript compilation successful
    echo.
)

echo [2/5] Unit Tests Execution...
echo ======================================
echo Running: npm test -- --no-watch --code-coverage --browsers=ChromeHeadless
echo.
call npm test -- --no-watch --code-coverage --browsers=ChromeHeadless > quality-reports\test-output-%TIMESTAMP%.txt 2>&1
if %errorlevel% neq 0 (
    echo ❌ FAIL: Some tests failed
    echo See: quality-reports\test-output-%TIMESTAMP%.txt
    echo.
) else (
    echo ✅ PASS: All tests passed
    echo.
)

echo [3/5] Linting Check...
echo ======================================
echo Running: ng lint
echo.
call ng lint > quality-reports\lint-output-%TIMESTAMP%.txt 2>&1
if %errorlevel% neq 0 (
    echo ❌ FAIL: Linting errors found
    echo See: quality-reports\lint-output-%TIMESTAMP%.txt
    echo.
) else (
    echo ✅ PASS: No linting errors
    echo.
)

echo [4/5] Dependency Audit...
echo ======================================
echo Running: npm audit
echo.
call npm audit > quality-reports\audit-output-%TIMESTAMP%.txt 2>&1
if %errorlevel% geq 8 (
    echo ⚠️  WARNING: High severity vulnerabilities found
    echo See: quality-reports\audit-output-%TIMESTAMP%.txt
    echo.
) else (
    echo ✅ PASS: No high severity vulnerabilities
    echo.
)

echo [5/5] Bundle Size Analysis...
echo ======================================
echo Checking dist folder size...
echo.
if exist "dist" (
    dir dist /s > quality-reports\bundle-size-%TIMESTAMP%.txt 2>&1
    echo ✅ Bundle size report generated
    echo See: quality-reports\bundle-size-%TIMESTAMP%.txt
    echo.
) else (
    echo ⚠️  WARNING: No dist folder found (build may have failed)
    echo.
)

echo ========================================
echo QUALITY CHECK COMPLETE
echo ========================================
echo.
echo Reports saved to: quality-reports\
echo Timestamp: %TIMESTAMP%
echo.
echo Review the generated report files for detailed results.
echo.
pause
