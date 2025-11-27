param([string]$handlerPath)

# Verificar permisos de administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Este script requiere permisos de Administrador." -ForegroundColor Red
    Write-Host "Ejecutando como Administrador..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

try {
  # Usar la ruta por defecto del handler
  if (-not $handlerPath) {
    $handlerPath = Join-Path $PSScriptRoot 'matlab-protocol-handler.ps1'
  }

  Write-Host "Registrando protocolo matlab:..." -ForegroundColor Cyan
  Write-Host "Handler: $handlerPath" -ForegroundColor Gray

  if (-not (Test-Path $handlerPath)) {
    Write-Error "No se encontro el handler en la ruta: $handlerPath"
    Read-Host "Presiona Enter para salir"
    exit 1
  }

  # Construir comando para registry
  $psExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $command = "`"$psExe`" -NoProfile -ExecutionPolicy Bypass -File `"$handlerPath`" `"%1`""

  # Crear claves en HKEY_CLASSES_ROOT usando Registry::
  $regPath = "Registry::HKEY_CLASSES_ROOT\matlab"
  
  # Crear clave principal
  if (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
  }
  Set-ItemProperty -Path $regPath -Name '(default)' -Value 'URL:MATLAB Protocol' -Force
  New-ItemProperty -Path $regPath -Name 'URL Protocol' -Value '' -PropertyType String -Force -ErrorAction SilentlyContinue | Out-Null

  # Crear subclave shell\open\command
  $cmdPath = "$regPath\shell\open\command"
  New-Item -Path $cmdPath -Force | Out-Null
  Set-ItemProperty -Path $cmdPath -Name '(default)' -Value $command -Force

  Write-Host "" 
  Write-Host "=== REGISTRO EXITOSO ===" -ForegroundColor Green
  Write-Host "El protocolo 'matlab:' esta ahora registrado." -ForegroundColor Green
  Write-Host ""
  Write-Host "Ahora puedes cerrar esta ventana y probar en la aplicacion web." -ForegroundColor Yellow
  Write-Host ""
  Read-Host "Presiona Enter para cerrar"
} catch {
  Write-Error "Error al registrar protocolo: $_"
  Read-Host "Presiona Enter para salir"
  exit 1
}
