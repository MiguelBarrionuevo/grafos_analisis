param([string]$uri)

# Handler para URIs matlab:... invocando MATLAB localmente.
# Intenta usar una instancia de MATLAB ya abierta, si no existe, abre una nueva.
try {
  if (-not $uri) { exit 0 }

  # extraer payload sin el prefijo "matlab:"
  $payload = if ($uri.StartsWith('matlab:')) { $uri.Substring(7) } else { $uri }
  # decodificar URL
  try { $payload = [System.Uri]::UnescapeDataString($payload) } catch {}

  # Construir comando MATLAB: si payload tiene paréntesis, enviarlo como llamada a función
  $execArg = $null
  if ($payload -match "\w+\(.*\)") {
    # función/llamada, ejemplo: fuzzyLogicApp()
    $execArg = $payload
  } elseif ($payload -match "^\w+$") {
    # comando simple sin paréntesis, ejemplo: fuzzy
    $execArg = $payload
  } else {
    # tratar payload como ruta de archivo (posible prefijo // o /). Normalizar:
    $path = $payload -replace '^/+',''
    $path = $path -replace '/','\\'
    # envolver en open('path')
    $execArg = "open('$path')"
  }

  # Intentar conectarse a una instancia de MATLAB existente usando COM
  $matlabConnected = $false
  try {
    $matlab = [Runtime.InteropServices.Marshal]::GetActiveObject('Matlab.Application')
    if ($matlab) {
      # Enviar comando a la instancia existente
      $matlab.Execute($execArg) | Out-Null
      $matlabConnected = $true
    }
  } catch {
    # No hay instancia activa o falló la conexión COM
    $matlabConnected = $false
  }

  # Si no se pudo conectar a una instancia existente, abrir nueva instancia
  if (-not $matlabConnected) {
    # Buscar matlab.exe
    $matlabExe = $null
    
    # Primero intentar encontrarlo en el PATH
    $matlabExe = (Get-Command matlab -ErrorAction SilentlyContinue).Source
    
    if (-not $matlabExe) {
      # Buscar en Program Files
      $matlabExe = Get-ChildItem 'C:\Program Files\MATLAB' -Recurse -ErrorAction SilentlyContinue -Filter matlab.exe | Select-Object -First 1 -ExpandProperty FullName
    }
    
    if (-not $matlabExe) {
      # fallback común
      $possible = 'C:\Program Files\MATLAB\R2025b\bin\win64\MATLAB.exe'
      if (Test-Path $possible) { $matlabExe = $possible }
    }

    if (-not $matlabExe -or -not (Test-Path $matlabExe)) {
      Write-Error "MATLAB executable not found. Please edit the handler script to set the correct matlab.exe path."
      exit 1
    }

    # Abrir MATLAB con el comando
    Start-Process -FilePath $matlabExe -ArgumentList '-r',$execArg -WindowStyle Normal
  }
} catch {
  # registrar en archivo de log opcional
  try { $_ | Out-File -FilePath "$env:TEMP\matlab-protocol-handler-error.log" -Append -Encoding UTF8 } catch {}
}
