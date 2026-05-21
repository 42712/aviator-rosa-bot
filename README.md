# Painel Aviator

Painel master para gerar e gerenciar painéis de cliente, com histórico de velas.

## O que este sistema faz

- **Painel master**: você cria, edita, bloqueia e exclui clientes. Cada cliente
  recebe um link único (token ou slug personalizado).
- **Painel do cliente**: cada cliente acessa seu link e vê o histórico de velas
  (rodada, horário, multiplicador, soma).
- **Histórico de velas**: registro das rodadas. Painel 1 e painel 2 separados.

## Estrutura de pastas

```
Painel-aviator/
├── app.py                  Ponto de entrada (Render roda este)
├── requirements.txt
├── runtime.txt
├── README.md
├── backend/
│   ├── server.py           Rotas Flask
│   ├── auth.py             Login master e cliente
│   ├── database.py         Banco SQLite (master, clientes, rodadas)
│   ├── config.py
│   └── models.py
└── templates/
    ├── login.html
    ├── admin/
    │   ├── dashboard.html
    │   ├── clientes.html
    │   └── relatorios.html
    └── cliente/
        ├── login.html
        └── painel.html
```

## Variáveis de ambiente (configurar no Render)

Em **Environment → Environment Variables**, adicione:

| Variável       | Para que serve                                        |
|----------------|-------------------------------------------------------|
| `MASTER_EMAIL` | Email de login do painel master                       |
| `MASTER_SENHA` | Senha do master — use uma senha NOVA, nunca reutilizada|
| `SECRET_KEY`   | Chave de sessão. Gere uma aleatória (veja abaixo)      |

Para gerar a `SECRET_KEY`, rode no seu computador:

```
python -c "import secrets; print(secrets.token_hex(32))"
```

Copie o resultado e cole como valor da variável.

**Importante**: nenhuma senha fica escrita no código. Se as variáveis não
estiverem configuradas, o login master não funciona — isso é proposital.

## Deploy no Render

1. Suba o código para o GitHub (veja a seção abaixo).
2. No Render, crie um **Web Service** apontando para o repositório.
3. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`
4. Adicione as variáveis de ambiente da tabela acima.
5. Deploy.

## Como subir para o GitHub

Na pasta do projeto, no terminal:

```
git init
git add .
git commit -m "Painel Aviator - versao limpa"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

Se o repositório já existe e tinha senhas no histórico antigo, o mais seguro
é **criar um repositório novo** e subir só esta versão limpa.

## Aviso sobre o banco de dados

Este projeto usa **SQLite**. No plano gratuito do Render, o disco é apagado a
cada deploy ou reinício — ou seja, **os clientes cadastrados e o histórico de
velas são perdidos** quando isso acontece. O master é recriado sozinho pelas
variáveis de ambiente.

Para uso real com clientes, migrar para **Postgres** (o Render oferece um plano
gratuito). A migração é pequena.

## Sobre o histórico de velas

O histórico mostra as rodadas já ocorridas: multiplicador, horário e soma dos
dígitos. É um registro do que aconteceu — um visualizador. Os resultados do
Aviator são gerados por sorteio criptográfico (provably fair) e cada rodada é
independente das anteriores; o histórico não permite prever rodadas futuras.

## Variaveis de ambiente (configurar no Render)

Em **Environment -> Environment Variables**, adicione apenas duas:

| Variavel       | Para que serve                                        |
|----------------|-------------------------------------------------------|
| `MASTER_EMAIL` | Email de login do painel master                       |
| `MASTER_SENHA` | Senha do master - use uma senha NOVA, nunca reutilizada|

So isso. A chave de seguranca interna (SECRET_KEY) o sistema gera sozinho -
voce nao precisa configurar nem rodar nada.

**Importante**: nenhuma senha fica escrita no codigo. Se as variaveis nao
estiverem configuradas, o login master nao funciona - isso e proposital.

## Deploy no Render

1. Suba o código para o GitHub (veja a seção abaixo).
2. No Render, crie um **Web Service** apontando para o repositório.
3. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`
4. Adicione as variáveis de ambiente da tabela acima.
5. Deploy.

## Como subir para o GitHub

Na pasta do projeto, no terminal:

```
git init
git add .
git commit -m "Painel Aviator - versao limpa"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

Se o repositório já existe e tinha senhas no histórico antigo, o mais seguro
é **criar um repositório novo** e subir só esta versão limpa.

## Aviso sobre o banco de dados

Este projeto usa **SQLite**. No plano gratuito do Render, o disco é apagado a
cada deploy ou reinício — ou seja, **os clientes cadastrados e o histórico de
velas são perdidos** quando isso acontece. O master é recriado sozinho pelas
variáveis de ambiente.

Para uso real com clientes, migrar para **Postgres** (o Render oferece um plano
gratuito). A migração é pequena.

## Sobre o histórico de velas

O histórico mostra as rodadas já ocorridas: multiplicador, horário e soma dos
dígitos. É um registro do que aconteceu — um visualizador. Os resultados do
Aviator são gerados por sorteio criptográfico (provably fair) e cada rodada é
independente das anteriores; o histórico não permite prever rodadas futuras.
