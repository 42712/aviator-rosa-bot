#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 INICIANDO AVIATOR ROSA BOT - ORACLE CLOUD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Instalar Node.js 20 (se não tiver)
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Instalar dependências do Chrome
echo "📦 Instalando dependências do Chrome..."
sudo apt-get update
sudo apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils

# Instalar dependências do projeto
echo "📦 Instalando dependências do Node..."
npm install

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    echo "⚠️ Arquivo .env não encontrado! Criando..."
    cat > .env << EOF
TELEGRAM_TOKEN=COLE_SEU_TOKEN_AQUI
TELEGRAM_CHAT_ID=COLE_SEU_CHAT_ID_AQUI
BETOOU_URL=https://betoou.com/casino/game/aviator
EOF
    echo "✅ .env criado! Configure as variáveis antes de iniciar."
    exit 1
fi

# Instalar PM2 globalmente (gerenciador de processos)
echo "📦 Instalando PM2..."
sudo npm install -g pm2

# Iniciar com PM2
echo "🚀 Iniciando bot com PM2..."
pm2 start index.js --name aviator-bot
pm2 save
pm2 startup

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ BOT INICIADO COM SUCESSO!"
echo "📊 Comandos úteis:"
echo "   pm2 status      - Ver status"
echo "   pm2 logs        - Ver logs"
echo "   pm2 restart all - Reiniciar"
echo "   pm2 stop all    - Parar"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
