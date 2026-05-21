# Memoria do Projeto - Painel Aviator

Documento de referencia completo do projeto. Descreve o que e cada arquivo,
como tudo se conecta, e o que o sistema faz.

## Visao geral

Sistema web com duas areas:

1. **Painel master** - area do administrador. Faz login, cria clientes,
   gera links unicos, bloqueia, edita, exclui, ve relatorios.
2. **Painel do cliente** - cada cliente acessa seu link e ve duas telas:
   a grade de velas (historico) e a aba de estatistica descritiva.

O sistema e um SaaS multi-cliente: um master gerencia varios clientes,
cada um com seu proprio acesso.

## Estrutura de arquivos

```
Painel-aviator/
├── app.py                  Ponto de entrada (Render executa este)
├── requirements.txt        Dependencias Python
├── runtime.txt             Versao do Python
├── README.md               Instrucoes de deploy
├── MEMORIA.md              Este documento
├── .gitignore
├── backend/
│   ├── server.py           Rotas Flask (todas as URLs do sistema)
│   ├── auth.py             Login do master e do cliente
│   ├── database.py         Banco SQLite: master, clientes, rodadas
│   ├── config.py           Configuracoes
│   └── models.py           Modelo de dados de uma rodada
├── templates/
│   ├── login.html          Tela de login do master
│   ├── admin/
│   │   ├── dashboard.html  Painel inicial do master
│   │   ├── clientes.html   Gestao de clientes (criar, bloquear, excluir)
│   │   └── relatorios.html Relatorio + exportar CSV
│   └── cliente/
│       ├── login.html      Tela de login do cliente
│       ├── painel.html     Grade de velas do cliente
│       └── estatistica.html Aba de estatistica do historico
└── extension/              Extensao de navegador (coletor de velas)
    ├── manifest.json
    ├── content.js
    ├── background.js
    ├── main-world.js
    └── popup.html
```

## O que cada arquivo do backend faz

**app.py** - inicia o servidor. O Render executa este arquivo. Ele carrega
o `server.py` e sobe o Flask com o Waitress na porta indicada pelo Render.

**backend/database.py** - toda a parte de banco de dados (SQLite). Tres tabelas:
- `master`: o administrador. Criado a partir das variaveis de ambiente
  `MASTER_EMAIL` e `MASTER_SENHA` - nenhuma senha fica escrita no codigo.
- `clientes`: cada cliente, com token unico, login, senha (hash), slug,
  tempo de acesso, status de bloqueio.
- `rodadas`: o historico de velas (painel 1 e 2 separados).
Funcoes principais: criar/listar/editar/excluir cliente; salvar e listar
rodadas; `estatistica_painel()` que calcula a estatistica descritiva.

**backend/auth.py** - autenticacao. `login_master` e `login_cliente` criam
a sessao. Os decorators `master_required` e `cliente_required` protegem as
rotas para que so quem esta logado acesse.

**backend/server.py** - todas as rotas (URLs) do sistema:
- `/login` - login do master
- `/admin`, `/admin/clientes`, `/admin/relatorios` - area do master
- `/admin/clientes/criar`, `/editar`, `/bloquear`, `/excluir` - acoes
- `/painel/<slug>` - login do cliente
- `/painel/<token>/dash` - grade de velas do cliente
- `/painel/<token>/estatistica` - aba de estatistica
- `/api/webhook` - recebe velas (a extensao envia para aqui)
- `/api/<painel>/historico`, `/api/<painel>/estatistica` - dados em JSON

**backend/config.py** - configuracoes lidas de variavel de ambiente
(porta, quantas velas o historico mostra, faixas de cor).

**backend/models.py** - classe `Rodada`, que representa uma vela
(multiplicador, horario, cor, soma dos digitos).

## A aba de estatistica

A aba de estatistica mostra somente dados descritivos do historico - o que
ja aconteceu. Inclui: total de velas, media geral, maior vela, distribuicao
de cores (azul/roxa/rosa), maior seca de rosa, rodadas desde a ultima rosa,
intervalo medio entre rosas, sequencia atual, e a tabela de minutagem
(quantas velas de cada cor por minuto do relogio).

Importante: esses numeros descrevem o passado. O resultado de cada rodada
do Aviator e sorteado de forma independente (provably fair, SHA-512), e o
historico nao permite prever rodadas futuras. A aba e um visualizador de
dados, nao uma ferramenta de previsao.

## A extensao

A pasta `extension/` contem uma extensao de navegador (Manifest V3) cuja
funcao seria capturar as velas da tela do jogo e enviar para `/api/webhook`.

Limitacao conhecida: o jogo Aviator roda dentro de um iframe isolado
(cross-origin) da provedora Spribe. Esse isolamento dificulta ou impede a
captura automatica de forma estavel, independente da casa de apostas. O
endpoint `/api/webhook` no servidor funciona corretamente e aceita velas;
o ponto fragil e a extensao conseguir captura-las.

## Variaveis de ambiente (configurar no Render)

| Variavel       | Funcao                                              |
|----------------|-----------------------------------------------------|
| `MASTER_EMAIL` | Email de login do master                            |
| `MASTER_SENHA` | Senha do master (use uma senha nova)                 |

A chave de sessao (SECRET_KEY) e gerada automaticamente pelo sistema na
primeira execucao e guardada em arquivo - nao precisa ser configurada.

## Banco de dados - aviso

O sistema usa SQLite. No plano gratuito do Render, o disco e apagado a cada
deploy ou reinicio, o que apaga clientes e historico. O master e recriado
sozinho pelas variaveis de ambiente. Para uso em producao com clientes
reais, recomenda-se migrar para Postgres (o Render oferece plano gratuito).

## Estado do projeto

Backend, painel master, painel do cliente (velas + estatistica) e templates:
completos e testados. A extensao esta incluida com a limitacao descrita acima.
