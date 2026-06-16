@echo off
REM Stop all VeritusOS services (leaves pm2 daemon running).
cd /d "%~dp0..\.."
call pm2 stop ecosystem.config.cjs
call pm2 status
