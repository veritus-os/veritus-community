@echo off
REM Restart all VeritusOS services (use after pulling new code or config changes).
cd /d "%~dp0..\.."
call pm2 restart ecosystem.config.cjs
call pm2 status
