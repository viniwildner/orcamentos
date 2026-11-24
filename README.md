# Orçamentos · Wildner Design

Sistema para montar propostas comerciais no navegador, guardar no banco de dados, mandar para o cliente por WhatsApp ou e-mail e gerar o PDF.

## Páginas

| Arquivo | Para quem | O que faz |
| --- | --- | --- |
| `index.html` | Marcus | Painel: lista de orçamentos com status, editor com pré-visualização ao vivo, envio e configurações |
| `proposta.html?id=…` | Cliente | A proposta online. O cliente escolhe a forma de pagamento e os opcionais, aprova pelo WhatsApp e baixa o PDF |
| `antigo.html` | Marcus | O sistema anterior, mantido para consultar os orçamentos antigos |

## Como funciona

1. **Novo orçamento** cria uma proposta já preenchida com os padrões de **Configurações** (empresa, portfólio, depoimentos, funcionalidades, opcionais, condições, valores, formas de pagamento e mensagens). Tudo pode ser alterado em cada orçamento.
2. O editor salva sozinho e mostra a proposta ao lado, no tamanho de computador ou de celular.
3. **Enviar** abre o WhatsApp ou o e-mail com a mensagem pronta e o link. O status passa para *Enviado*.
4. Quando o cliente abre o link, o status vira *Visualizado*. Ao clicar em **Aprovar pelo WhatsApp**, a escolha dele (pagamento e opcionais) fica gravada e o status vira *Aprovado*.
5. **PDF** pergunta se é a versão colorida ou a preto e branco (fundo branco, para imprimir) e abre a impressão já em A4: escolha *Salvar como PDF*.
6. A **numeração** é automática e não pode ser editada: `0129/2026`, `0130/2026`… Em 2026 começa em 0129 e a cada ano novo recomeça em 0001. Número de orçamento excluído não é reaproveitado.
7. O botão de **sol/lua** no topo alterna entre modo escuro e modo claro.

## Conectar o banco online (Supabase)

Sem esta etapa o sistema funciona no **modo local**: os dados ficam só no navegador onde foram criados e o link do cliente não abre em outro aparelho.

1. Crie um projeto grátis em [supabase.com](https://supabase.com).
2. No projeto, abra **SQL Editor**, cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Em **Authentication → Users**, clique em **Add user** e crie o seu usuário com e-mail e senha. É com ele que você entra no painel.
4. Em **Authentication → Sign In / Providers**, desative **Allow new users to sign up**, para ninguém mais criar conta.
5. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public** para `js/config.js`:

```js
WD.SUPABASE_URL = 'https://xxxx.supabase.co';
WD.SUPABASE_ANON_KEY = 'eyJ...';
```

A chave *anon public* pode ficar no código: sem login ela só consegue abrir uma proposta pelo link e registrar a escolha do cliente. Nunca coloque aqui a chave *service_role*.

## Publicar

É um site estático (HTML, CSS e JavaScript, sem build). Funciona no GitHub Pages: **Settings → Pages → Deploy from a branch → main / (root)**. O link do cliente fica `https://<seu-endereço>/proposta.html?id=…`.

## Arquivos

- `js/defaults.js`: padrões de fábrica e o modelo "Website". Novos tipos de projeto (identidade visual, chatbot…) entram aqui.
- `js/render.js`: monta a proposta a partir dos dados (usado pelo painel e pela página do cliente).
- `js/store.js`: grava no Supabase ou, sem configuração, no IndexedDB do navegador.
- `js/admin.js` e `assets/admin.css`: o painel.
- `js/proposta.js` e `assets/proposta.css`: a página do cliente e o layout da proposta (tela e A4).
- `img/`: logo e mockups do portfólio.
