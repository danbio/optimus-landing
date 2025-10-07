param(
  [int]$FrontendPort = 5500,
  [int]$BackendPort = 8000
)

Write-Host "Iniciando Frontend em http://localhost:$FrontendPort" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-Command","cd '$PSScriptRoot'; py -m http.server $FrontendPort" | Out-Null

Write-Host "Iniciando Backend Django em http://127.0.0.1:$BackendPort" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-Command","cd '$PSScriptRoot\\backend'; python manage.py runserver 127.0.0.1:$BackendPort" | Out-Null

Write-Host "Ambiente de desenvolvimento iniciado." -ForegroundColor Cyan
