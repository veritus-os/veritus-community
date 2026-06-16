@echo off
REM Open the LAN ports for VeritusOS. RUN AS ADMINISTRATOR (right-click > Run as administrator).
REM Scope is limited to private/local networks.
netsh advfirewall firewall add rule name="VeritusOS Web 5173"      dir=in action=allow protocol=TCP localport=5173 profile=private
netsh advfirewall firewall add rule name="VeritusOS Search 3001"   dir=in action=allow protocol=TCP localport=3001 profile=private
netsh advfirewall firewall add rule name="VeritusOS Checkout 3333" dir=in action=allow protocol=TCP localport=3333 profile=private
echo.
echo Firewall rules added for ports 5173, 3001, 3333 (private network).
