#!/usr/bin/env bash

# exit on error
set -o errexit

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 INICIANDO BUILD DO RENDER - AVIATOR ROSA BOT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Instalar dependências Node
echo ""
echo "📦 Instalando dependências Node..."
npm install

# Criar diretório de cache do Puppeteer
PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
mkdir -p $PUPPETEER_CACHE_DIR

# Instalar Chrome via Puppeteer
echo ""
echo "🌐 Instalando Chrome para Puppeteer..."
npx puppeteer browsers install chrome

# Verificar instalação
echo ""
echo "✅ Chrome instalado em:"
ls -la $PUPPETEER_CACHE_DIR/chrome/

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ BUILD CONCLUÍDO COM SUCESSO!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
