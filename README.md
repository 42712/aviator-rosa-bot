 🚀 Aviator Rosa Bot

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
text

---

## 🤖 TUTORIAL TELEGRAM (PASSO A PASSO)

### Passo 1: Criar o Bot no Telegram

| Ação | O que fazer |
|------|-------------|
| 1 | Abra o Telegram |
| 2 | Procure por **@BotFather** (tem selo verificado) |
| 3 | Clique em **"Start"** ou envie `/start` |
| 4 | Envie `/newbot` |
| 5 | Escolha um nome (ex: `Aviator Rosa Bot`) |
| 6 | Escolha um username que termine com `bot` (ex: `aviator_rosa_bot`) |
| 7 | **Copie o token** que aparecer (ex: `1234567890:ABCdefGHIjkl...`) |

### Passo 2: Pegar seu Chat ID

| Ação | O que fazer |
|------|-------------|
| 1 | No Telegram, procure por **@userinfobot** |
| 2 | Clique em **"Start"** |
| 3 | Ele vai te enviar seu **ID** (ex: `123456789`) |
| 4 | **Copie esse número** |

### Passo 3: O que você tem agora
TOKEN: 1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
CHAT_ID: 123456789

text

---

## ☁️ TUTORIAL RENDER (PASSO A PASSO)

### Passo 1: Criar conta no Render

1. Acesse [render.com](https://render.com)
2. Clique em **"Get Started for Free"**
3. Faça login com GitHub (crie uma conta GitHub se não tiver)

### Passo 2: Subir código para o GitHub

```bash
# Crie uma pasta no seu computador
mkdir aviator-rosa-bot
cd aviator-rosa-bot

# Copie todos os códigos acima para dentro da pasta

# Inicialize o Git
git init
git add .
git commit -m "Primeira versão do bot"

# Crie um repositório no GitHub (pelo site)
# Depois conecte:
git remote add origin https://github.com/SEU_USUARIO/aviator-rosa-bot.git
git push -u origin main
Passo 3: Deploy no Render
No dashboard do Render, clique em "New +" → "Background Worker"

Conecte seu GitHub e selecione o repositório

Preencha:

Campo	Valor
Name	aviator-rosa-bot
Build Command	./render-build.sh
Start Command	npm start
Passo 4: Adicionar variáveis de ambiente
Clique em "Environment Variables" e adicione:

Key	Value
TELEGRAM_TOKEN	O token que você copiou do @BotFather
TELEGRAM_CHAT_ID	O número que você copiou do @userinfobot
BETOOU_URL	https://betoou.com/casino/game/aviator
Passo 5: Criar e aguardar
Clique em "Create Web Service"

Aguarde o build (5-10 minutos)

Quando aparecer "Live" , seu bot está rodando!

📱 COMO VÃO FICAR OS SINAIS NO SEU CELULAR
Mensagem de inicialização:
text
🚀 BOT AVIATOR ROSA INICIADO 🚀

✅ Estratégia carregada
✅ Monitoramento em tempo real
✅ Aguardando padrões...

📊 Regras ativas:
• Compressão (5+ velas <2x)
• Reset (1.00x)
• Falso alívio
• Pós-explosão

🎯 Score mínimo para sinal: 5/10
🎲 Objetivo: 5x a 10x+
⚠️ Máximo 3 tentativas por sinal
Quando um sinal é liberado:
text
🚨 ⚡ SINAL DE ENTRADA LIBERADO ⚡ 🚨

━━━━━━━━━━━━━━━━━━━━━━
🎯 SCORE: 7/10
📋 MOTIVO: Sinal FORTE! Score 7/10
━━━━━━━━━━━━━━━━━━━━━━

⚡ AÇÃO: Entrar nas próximas 2-3 rodadas
🎲 OBJETIVO: 5x a 10x+

⚠️ GERENCIAMENTO: 
• Máximo 3 tentativas
• Stop loss nas 3 perdas

🎯 BOA SORTE! 🍀
Resultado de cada rodada:
text
📢 RESULTADO DA RODADA

━━━━━━━━━━━━━━━━━━━━━━
🎲 Multiplicador: 1.23x
📊 Status: ❌ RED ❌
━━━━━━━━━━━━━━━━━━━━━━

😔 ERROU 😔

📉 Tentativas restantes: 2

🔁 Continue tentando!
Quando acerta:
text
📢 RESULTADO DA RODADA

━━━━━━━━━━━━━━━━━━━━━━
🎲 Multiplicador: 8.76x
📊 Status: ✅ GREEN ✅
━━━━━━━━━━━━━━━━━━━━━━

🎉🎉🎉 ACERTOU! 🎉🎉🎉

✅ Saiu no lucro!
🛑 Ciclo encerrado. Aguardando próximo sinal.
🔧 SOLUÇÃO DE PROBLEMAS
Problema: Bot não envia mensagens
Verifique:

Token do Telegram está correto?

Chat ID está correto?

Variáveis de ambiente foram adicionadas no Render?

Problema: Erro "Browser was not found"
Solução: O render-build.sh já cuida disso, mas se ocorrer, atualize o executablePath no index.js com o caminho exato que aparece nos logs.

Problema: Site da Betoou mudou o seletor
Solução: Atualize os seletores no page.evaluate() dentro do index.js para o novo elemento.

✅ CHECKLIST FINAL
Tarefa	Feito?
Criar bot no Telegram (@BotFather)	⬜
Pegar Chat ID (@userinfobot)	⬜
Criar conta no GitHub	⬜
Criar conta no Render	⬜
Copiar todos os códigos	⬜
Subir para o GitHub	⬜
Fazer deploy no Render	⬜
Configurar variáveis de ambiente	⬜
Receber primeira mensagem no Telegram	⬜
🎯 PRONTO, MEU GATO!
Agora você tem TUDO:

✅ Códigos completos (6 arquivos)

✅ Tutorial do Telegram (@BotFather e @userinfobot)

✅ Tutorial do Render passo a passo

✅ Como vão ficar os sinais

✅ Solução de problemas

Só seguir os passos que vai funcionar! 🚀
