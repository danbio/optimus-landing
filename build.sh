#!/bin/bash
# Script para deploy apenas dos arquivos web essenciais

# Criar diretório de build
rm -rf build/
mkdir -p build/

# Copiar apenas arquivos necessários para web
cp index.html build/
cp politica-de-privacidade.html build/
cp -r css build/
cp -r js build/
cp -r Assets build/
cp .htaccess build/

echo "Build completo! Arquivos prontos para deploy em /build"