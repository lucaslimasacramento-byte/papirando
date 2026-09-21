# Papirando - Deploy Vercel

Objetivo: publicar o frontend na Vercel com Supabase funcionando e deixar claro o que precisa ser manual.

## 1. Preparar uma copia local limpa

Use uma pasta fora do OneDrive/Drive:

```powershell
cd C:\projetos\papirando
npm ci
npm run lint
npm run test
npm run build
```

Se o build falhar por `Cannot find module ... node_modules\vite\bin\vite.js`, a instalacao de dependencias esta corrompida. Remova `node_modules` e rode `npm ci` novamente na pasta local limpa.

## 2. Conferir variaveis

No `.env` local:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_PUBLIC_APP_ORIGIN=
VITE_AI_SERVER_URL=
```

Na Vercel, cadastre em `Settings > Environment Variables` para `Production` e `Preview`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PUBLIC_APP_ORIGIN`, se quiser forcar links canonicos de convite para um dominio especifico
- `VITE_AI_SERVER_URL`, se a IA estiver hospedada fora do gateway `/api/ai`
- `ANTHROPIC_API_KEY` somente como variavel server-side (nunca com prefixo VITE_)

Nunca cadastrar chaves `service_role`, Stripe ou provider de IA como variaveis `VITE_`.

## 3. Configurar Supabase Auth

No painel Supabase:

- `Authentication > URL Configuration`
- `Site URL`: URL final da Vercel, por exemplo `https://papirando.vercel.app`
- `Redirect URLs`: URL final e URLs de preview usadas no projeto

Sem isso, login, cadastro e callback podem funcionar localmente e falhar em producao.

## 4. Importar projeto na Vercel

No painel Vercel:

- `Add New Project`
- Importar repositorio do GitHub
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

O arquivo `vercel.json` ja contem o rewrite de SPA:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## 5. IA em producao

A Vercel publica o frontend. O arquivo `ai-server.mjs` e um servidor Node separado.

Para manter IA ativa em producao, hospede o `ai-server` em um servico proprio:

- Render
- Railway
- Fly.io
- VPS

Variaveis esperadas pelo `ai-server`:

```env
ANTHROPIC_API_KEY=cole_a_chave_da_anthropic_aqui
ANTHROPIC_MODEL=claude-sonnet-5
# So para chave de escopo "Organizacao"; chave de workspace dispensa.
ANTHROPIC_WORKSPACE_ID=
AI_ALLOWED_ORIGINS=https://SEU-PROJETO.vercel.app
AI_SERVER_TOKEN=
AI_SERVER_PORT=8787
```

> A Anthropic e o unico provedor. A cadeia de fallback (OpenRouter, Groq, Gemini, OpenAI)
> saiu em 21/09: nenhuma das chaves funcionava, e cada falha virava uma mensagem com quatro
> erros colados em que o motivo real ficava escondido. Pode apagar essas variaveis da Vercel.

Depois de publicar o backend de IA, configure na Vercel:

```env
VITE_AI_SERVER_URL=https://URL-DO-SEU-AI-SERVER
```

O frontend envia o JWT da sessao Supabase; nao use token estatico em variavel `VITE_`.

Se `VITE_AI_SERVER_URL` nao for definido em Preview/Production, o frontend usa o gateway same-origin `/api/ai`.

## 6. Smoke test pos-deploy

- [ ] Abrir URL de producao.
- [ ] Criar uma conta nova.
- [ ] Fazer login.
- [ ] Recarregar pagina logada.
- [ ] Atualizar perfil.
- [ ] Abrir concursos.
- [ ] Abrir disciplinas.
- [ ] Registrar sessao de estudo.
- [ ] Conferir historico.
- [ ] Abrir redacoes.
- [ ] Testar uma chamada de IA, se `VITE_AI_SERVER_URL` estiver configurado.
- [ ] Conferir console do navegador.
- [ ] Conferir logs da Vercel.
- [ ] Conferir logs do servidor de IA.

## 7. Comandos uteis

Deploy preview:

```powershell
npm run vercel:preview
```

Deploy producao:

```powershell
npm run vercel:prod
```

Validacao antes de publicar:

```powershell
npm ci
npm run lint
npm run test
npm run build
```

## O que fica manual

- Criar ou conectar repositorio no GitHub.
- Criar projeto na Vercel.
- Cadastrar variaveis na Vercel.
- Configurar Site URL e Redirect URLs no Supabase.
- Aplicar SQL/RLS no Supabase quando necessario.
- Hospedar `ai-server.mjs` em servico Node.
- Configurar dominio proprio, se houver.

## IA em produção — variáveis e limite de duração

A análise de edital manda ~26k tokens para o modelo e não responde em poucos segundos. Sem
`maxDuration` declarado, a Vercel encerra a função no padrão dela e o sintoma é "a IA não
responde" ou 504 — o que faz procurar defeito na chave, que não é o problema.

`vercel.json` declara `functions."api/ai.js".maxDuration = 60`. O teto real depende do plano
(o projeto está no Hobby hoje); se o deploy recusar o valor, baixar até passar.

Variáveis obrigatórias no projeto da Vercel:

| variável | observação |
|---|---|
| `ANTHROPIC_API_KEY` | provider preferido por padrão em `providerOrder` (`api/_ai.js`) |
| `VITE_AI_ENABLED=true` | **build-time** — salvar não basta, precisa de redeploy |
| `SUPABASE_URL` + `SUPABASE_ANON_KEY` | `requireAiAuth` valida o token do aluno; sem isso a IA responde 500 |

`ANTHROPIC_MODEL` é opcional (há default no código).

**Se ainda der timeout no Hobby:** baixar `CHARS_TOTAL` em
[`api/_edital-text.js`](../api/_edital-text.js) de 120.000 para 60.000. Corta o texto enviado
quase pela metade (~17k tokens) e a resposta vem mais rápido, ao preço de mandar o anexo
inteiro em 4 dos 13 editais do teste em vez de 10.

Dois limites que atrapalham teste em lote: `AI_RATE_LIMIT_MAX` (padrão 30 por 10 min) e
`AI_FREE_DAILY_CAP`.

## Diagnosticar falha de IA em produção

O backend responde mensagem genérica para todo 500 e o motivo real vai para o log da Vercel,
que o plano Hobby não libera pela API (403). Para não depender disso:

1. `api/ai.js` devolve um `detail` **classificado** — chave rejeitada, crédito/limite de gasto,
   chamadas por minuto, sobrecarga, texto grande demais, permissão, modelo não encontrado, ou
   o status HTTP e o tipo de erro do provedor. É o suficiente na maioria dos casos.
2. Quando não for, ligue `AI_DEBUG_ERRORS=true` nas variáveis do projeto e **redeploy**: o
   motivo cru do provedor passa a acompanhar a mensagem, com qualquer coisa parecida com
   chave apagada. **Desligue depois** — é diagnóstico, não estado normal.

Lembrete que já custou horas: **apagar ou alterar variável exige redeploy.** Sem ele a função
continua rodando com o valor antigo, e o sintoma é idêntico ao de não ter mexido em nada.

### Escopo da chave da Anthropic

A chave tem dois escopos possíveis e eles não são intercambiáveis:

| escopo da chave | o que a API exige |
|---|---|
| **Workspace** | nada — funciona direto |
| **Organização** | o cabeçalho `anthropic-workspace-id`; sem ele responde **400** |

O código envia esse cabeçalho quando `ANTHROPIC_WORKSPACE_ID` está definida nas variáveis do
projeto. Então valem as duas configurações:

- chave de **workspace** → não defina `ANTHROPIC_WORKSPACE_ID`
- chave de **organização** → defina `ANTHROPIC_WORKSPACE_ID` com o ID do workspace a usar

O erro correspondente é reconhecido por `motivoDaFalhaDeIa()` e já diz o que fazer, em vez de
aparecer como "o provedor recusou a chamada".
