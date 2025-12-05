@echo off
REM Quick Quality Check - Run this for a fast sanity check
REM For full report, use: run-quality-checks.bat or run-quality-checks.ps1

echo ========================================
echo JENSIFY QUICK QUALITY CHECK
echo ========================================
echo.

echo [1/3] Building project...
call ng build --configuration production
if %errorlevel% neq 0 (
    echo.
    echo ❌ BUILD FAILED - Fix TypeScript errors before continuing
    pause
    exit /b 1
)
echo ✅ Build successful
echo.

echo [2/3] Running tests...
call npm test -- --no-watch --browsers=ChromeHeadless
if %errorlevel% neq 0 (
    echo.
    echo ❌ TESTS FAILED - Review test output above
    pause
    exit /b 1
)
echo ✅ Tests passed
echo.

echo [3/3] Checking for critical vulnerabilities...
npm audit --audit-level=high
if %errorlevel% geq 8 (
    echo.
    echo ⚠️  WARNING: High severity vulnerabilities found
    echo Run 'npm audit' for details
    echo.
)
echo.

echo ========================================
echo ✅ QUICK CHECK COMPLETE
echo ========================================
echo.
echo For detailed reports, run:
echo   - run-quality-checks.bat (Windows CMD)
echo   - run-quality-checks.ps1 (PowerShell - recommended)
echo.
pause
