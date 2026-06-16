@echo off
REM VeritusOS Internal - one-time install (run in an ADMIN "Command Prompt").
REM Installs Node deps, builds the frontend, installs pm2 globally.
cd /d "%~dp0..\.."
echo === Installing dependencies (npm install) ===
call npm install || goto :err
echo === Building frontend (npm run build) ===
call npm run build || goto :err
echo === Installing pm2 globally ===
call npm install -g pm2 || goto :err
echo.
echo Install complete. Next: scripts\win\start-veritus.bat
goto :eof
:err
echo ERROR during install. Fix the message above and re-run.
exit /b 1
