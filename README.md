# 🚀 Aviator Rosa Bot

Bot de sinais para o jogo Aviator da Betoou usando estratégia de Vela Rosa.

## 📋 Funcionalidades

- ✅ Monitora o jogo em tempo real
- ✅ Aplica estratégia de Score baseada em:
  - Compressão (5+ velas abaixo de 2x)
  - Reset (1.00x)
  - Falso alívio (1x → 3-6x → 1x)
  - Pós-explosão
- ✅ Envia sinais no Telegram
- ✅ Gerenciamento de 3 tentativas por sinal
- ✅ Roda 24/7 na nuvem (Render)

## 🚀 Deploy no Render

1. Faça fork deste repositório
2. Crie conta em [render.com](https://render.com)
3. Clique "New +" → "Background Worker"
4. Conecte seu repositório
5. Configure:
   - Build Command: `./render-build.sh`
   - Start Command: `npm start`
6. Adicione as variáveis de ambiente
7. Clique "Create Web Service"

## 📦 Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `TELEGRAM_TOKEN` | Token do seu bot (@BotFather) |
| `TELEGRAM_CHAT_ID` | Seu ID do Telegram (@userinfobot) |
| `BETOOU_URL` | URL do jogo Aviator |

## 🎯 Estratégia

- Sinal liberado quando Score ≥ 5/10
- Máximo 3 tentativas por sinal
- Objetivo: 5x a 10x+

## 📱 Comandos Locais

```bash
npm install
npm start
