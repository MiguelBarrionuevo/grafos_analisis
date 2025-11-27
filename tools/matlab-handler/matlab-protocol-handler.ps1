param([string]$uri)

# Handler para URIs matlab:... invocando MATLAB localmente.
# Busca matlab.exe en la instalación por defecto y ejecuta el comando recibido.
try {
  if (-not $uri) { exit 0 }

  # extraer payload sin el prefijo "matlab:"
  $payload = if ($uri.StartsWith('matlab:')) { $uri.Substring(7) } else { $uri }
  # decodificar URL
  try { $payload = [System.Uri]::UnescapeDataString($payload) } catch {}

  # intentar localizar matlab.exe en Program Files
  $matlabExe = Get-ChildItem 'C:\Program Files\MATLAB' -Recurse -ErrorAction SilentlyContinue -Filter matlab.exe | Select-Object -First 1 -ExpandProperty FullName
  if (-not $matlabExe) {
    # fallback común
    $possible = 'C:\Program Files\MATLAB\R2025b\bin\win64\MATLAB.exe'
    if (Test-Path $possible) { $matlabExe = $possible }
  }

  if (-not $matlabExe -or -not (Test-Path $matlabExe)) {
    # No encontrado: registrar/log y salir silenciosamente
    Write-Error "MATLAB executable not found. Please edit the handler script to set the correct matlab.exe path."
    exit 1
  }

  # Construir comando MATLAB: si payload tiene paréntesis, enviarlo como llamada a función, si es una ruta de archivo, usar open()
  $execArg = $null
  if ($payload -match "\w+\(.*\)") {
    # función/llamada, ejemplo: fuzzyLogicApp()
    $execArg = $payload
  } else {
    # tratar payload como ruta de archivo (posible prefijo // o /). Normalizar:
    $path = $payload -replace '^/+',''
    $path = $path -replace '/','\\'
    # envolver en open('path')
    $execArg = "open('$path')"
  }

  # Ejecutar MATLAB con -r para correr el comando
  Start-Process -FilePath $matlabExe -ArgumentList '-nosplash','-nodesktop','-r',$execArg -WindowStyle Normal
} catch {
  # registrar en archivo de log opcional
  try { $_ | Out-File -FilePath "$env:TEMP\matlab-protocol-handler-error.log" -Append -Encoding UTF8 } catch {}
}
