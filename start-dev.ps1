param(
  [int]$FrontendPort = 5500,
  [int]$BackendPort = 8000
)

# Carrega variáveis locais, se existir um arquivo local.env ao lado do script
$envFile = Join-Path $PSScriptRoot 'local.env'
if (Test-Path $envFile) {
  Write-Host "Carregando variáveis de $envFile" -ForegroundColor Yellow
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^[#;]') { return }
    if ($_ -match '^\s*$') { return }
    $kv = $_ -split '=',2
    if ($kv.Length -eq 2) {
      $name = $kv[0].Trim()
      $value = $kv[1].Trim()
      if ($name) { [Environment]::SetEnvironmentVariable($name, $value, "Process") }
    }
  }
}

Write-Host "Iniciando Frontend em http://localhost:$FrontendPort" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-Command","cd '$PSScriptRoot'; py -m http.server $FrontendPort" | Out-Null

Write-Host "Iniciando Backend Django em http://127.0.0.1:$BackendPort" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-Command","cd '$PSScriptRoot\\backend'; `$env:RECAPTCHA_SECRET='$env:RECAPTCHA_SECRET'; python manage.py runserver 127.0.0.1:$BackendPort" | Out-Null

Write-Host "Ambiente de desenvolvimento iniciado." -ForegroundColor Cyan
