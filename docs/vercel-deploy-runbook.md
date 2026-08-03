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
- `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `GOOGLE_API_KEY` ou `OPENAI_API_KEY` somente como variaveis server-side

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
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=cole_a_chave_da_anthropic_aqui
ANTHROPIC_MODEL=claude-sonnet-4-6
AI_FALLBACK_PROVIDER=openai
AI_ALLOWED_ORIGINS=https://SEU-PROJETO.vercel.app
AI_SERVER_TOKEN=
AI_SERVER_PORT=8787
GOOGLE_API_KEY=
GOOGLE_MODEL=gemini-2.0-flash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
```

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
