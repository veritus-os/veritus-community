@echo off
REM Start all VeritusOS services under pm2 and persist them for boot.
REM This is also the file Task Scheduler runs at startup (see physical-server-setup.md).
cd /d "%~dp0..\.."
call pm2 start ecosystem.config.cjs
call pm2 save
call pm2 status
