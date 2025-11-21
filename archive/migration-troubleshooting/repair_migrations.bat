@echo off
echo Repairing Supabase migration history...
echo.

cd /d C:\Jensify

echo [1/2] Repairing Nov 15 migrations (20251115)...
timeout /t 2 /nobreak >nul
supabase migration repair --status applied 20251115
echo.

echo [2/2] Repairing Nov 16 migrations (20251116)...
timeout /t 2 /nobreak >nul
supabase migration repair --status applied 20251116
echo.

echo Migration repair complete!
echo.
echo Verifying sync status...
timeout /t 2 /nobreak >nul
supabase db remote commit
echo.
echo Done!
pause
