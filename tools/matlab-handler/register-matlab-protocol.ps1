param([string]$handlerPath)

function Ask-ForPath($prompt, $default) {
  Write-Host $prompt -ForegroundColor Cyan
  $input = Read-Host -Prompt "Ruta (enter para usar '$default')"
  if ([string]::IsNullOrWhiteSpace($input)) { return $default }
  return $input
}

try {
  if (-not $handlerPath) {
    $scriptDefault = "$PSScriptRoot\matlab-protocol-handler.ps1"
    $handlerPath = Ask-ForPath "Ruta al handler PowerShell (script que abrirá MATLAB):" $scriptDefault
  }

  if (-not (Test-Path $handlerPath)) {
    Write-Error "No se encontró el handler en la ruta: $handlerPath"
    exit 1
  }

  # Construir comando para registry
  $psExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $command = "`"$psExe`" -NoProfile -ExecutionPolicy Bypass -File `"$handlerPath`" "%1""

  # Crear claves en HKEY_CLASSES_ROOT
  New-Item -Path 'HKCR:\matlab' -Force | Out-Null
  Set-ItemProperty -Path 'HKCR:\matlab' -Name '(default)' -Value 'URL:MATLAB Protocol' -Force
  Set-ItemProperty -Path 'HKCR:\matlab' -Name 'URL Protocol' -Value '' -Force
  New-Item -Path 'HKCR:\matlab\shell\open\command' -Force | Out-Null
  Set-ItemProperty -Path 'HKCR:\matlab\shell\open\command' -Name '(default)' -Value $command -Force

  Write-Host "Registro creado. El protocolo 'matlab:' está ahora asociado al handler." -ForegroundColor Green
  Write-Host "Prueba con: Start-Process 'matlab:fuzzyLogicApp()'" -ForegroundColor Yellow
} catch {
  Write-Error "Error al registrar protocolo: $_"
  exit 1
}
