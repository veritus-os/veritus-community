@echo off
REM Quick system health check (run ON the server). Opens the status page and prints JSON.
echo Verificando o sistema...
curl -s "http://localhost:3333/api/system/health?format=json"
echo.
echo Abrindo painel de status no navegador...
start "" "http://localhost:3333/api/system/health"
