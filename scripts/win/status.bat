@echo off
REM Show service status; pass "logs" to tail live logs (Ctrl+C to exit).
cd /d "%~dp0..\.."
if /I "%1"=="logs" (
  call pm2 logs
) else (
  call pm2 status
  echo.
  echo Tip: "status.bat logs" to watch live logs. Health checks:
  echo   http://localhost:3001/api/health   ^(Search^)
  echo   http://localhost:3333/api/health   ^(Checkout^)
)
