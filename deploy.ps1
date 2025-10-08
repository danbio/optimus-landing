# Script de Deploy para Hostinger
param(
    [string]$FtpServer = "ftp.seudominio.com",
    [string]$Username = "seu_usuario_ftp",
    [string]$Password = "sua_senha_ftp"
)

Write-Host "🚀 Iniciando deploy para Hostinger..." -ForegroundColor Green

# Criar pasta temporária de deploy
$deployPath = ".\deploy-temp"
if (Test-Path $deployPath) {
    Remove-Item $deployPath -Recurse -Force
}
New-Item -ItemType Directory -Path $deployPath | Out-Null

# Copiar arquivos necessários
Write-Host "📦 Preparando arquivos..." -ForegroundColor Yellow
Copy-Item "index.html" $deployPath
Copy-Item "politica-de-privacidade.html" $deployPath
Copy-Item "css" $deployPath -Recurse
Copy-Item "js" $deployPath -Recurse
Copy-Item "Assets" $deployPath -Recurse

Write-Host "✅ Arquivos preparados em $deployPath" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Configure seu cliente FTP com:" -ForegroundColor White
Write-Host "   - Servidor: $FtpServer" -ForegroundColor Gray
Write-Host "   - Usuário: $Username" -ForegroundColor Gray
Write-Host "   - Pasta remota: /public_html" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Faça upload de todos os arquivos da pasta: $deployPath" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Após o upload, seu site estará disponível em: https://seudominio.com" -ForegroundColor Green