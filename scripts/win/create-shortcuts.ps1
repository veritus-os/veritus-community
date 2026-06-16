<#
  VeritusOS — create desktop shortcuts (.url) for staff.

  Creates three browser shortcuts on the Public Desktop (visible to all users):
    - VeritusOS — Saída de Alunos   -> http://SERVER_IP:5173/checkout
    - VeritusOS — Secretaria        -> http://SERVER_IP:5173/search
    - VeritusOS — Status do Sistema -> http://SERVER_IP:3333/api/system/health

  Usage (PowerShell):
    powershell -ExecutionPolicy Bypass -File scripts\win\create-shortcuts.ps1 -ServerIp 192.168.0.10

  If -ServerIp is omitted, it is read from SERVER_IP in ecosystem.config.cjs.
#>
param([string]$ServerIp)

$ErrorActionPreference = 'Stop'
$repoDir = (Resolve-Path "$PSScriptRoot\..\..").Path

# Resolve SERVER_IP: param > ecosystem.config.cjs > prompt
if (-not $ServerIp) {
  $eco = Join-Path $repoDir 'ecosystem.config.cjs'
  if (Test-Path $eco) {
    $m = Select-String -Path $eco -Pattern "SERVER_IP\s*\|\|\s*'([^']+)'" | Select-Object -First 1
    if ($m) { $ServerIp = $m.Matches[0].Groups[1].Value }
  }
}
if (-not $ServerIp) { $ServerIp = Read-Host 'Informe o IP do servidor (ex.: 192.168.0.10)' }
if ($ServerIp -eq '192.168.0.10') {
  Write-Host "AVISO: usando o IP de exemplo 192.168.0.10. Rode com -ServerIp <IP real> ou edite ecosystem.config.cjs." -ForegroundColor Yellow
}

# Public Desktop so every staff login sees the shortcuts; fall back to user desktop.
$desktop = Join-Path $env:PUBLIC 'Desktop'
if (-not (Test-Path $desktop)) { $desktop = [Environment]::GetFolderPath('Desktop') }

$shortcuts = @(
  @{ name = 'VeritusOS - Saida de Alunos';  url = "http://$ServerIp`:5173/checkout" },
  @{ name = 'VeritusOS - Secretaria';        url = "http://$ServerIp`:5173/search" },
  @{ name = 'VeritusOS - Status do Sistema'; url = "http://$ServerIp`:3333/api/system/health" }
)

foreach ($s in $shortcuts) {
  $file = Join-Path $desktop ($s.name + '.url')
  "[InternetShortcut]`r`nURL=$($s.url)`r`nIconIndex=0" | Set-Content -Path $file -Encoding ASCII
  Write-Host "Criado: $file  ->  $($s.url)"
}
Write-Host "`nAtalhos criados em: $desktop" -ForegroundColor Green
