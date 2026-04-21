# Papirando — Arquitetura

Visão estrutural do repositório, fluxo de dados e integração Supabase. Útil para onboarding e para IA planejar mudanças sem quebrar convenções.

---

## Visão de alto nível

```
Browser (React SPA)
    │
    ├─► Supabase (Auth + PostgREST + Realtime conforme uso)
    │       URL: produção direta | dev: opcional proxy /supabase → VITE_SUPABASE_URL
    │
    └─► (Opcional) ai-server.mjs — HTTP local para provedores de IA em desenvolvimento
```

O frontend é **stateful no cliente**: sessão Supabase persistida; grande parte do estado de UI e “view atual” vive em componentes de topo (especialmente `App.jsx`).

---

## Organização de pastas

| Caminho | Responsabilidade |
|---------|------------------|
| `src/main.jsx` | Entrada React, montagem do root |
| `src/App.jsx` | Shell da aplicação, roteamento por view, muito estado global e efeitos |
| `src/components/` | Componentes reutilizáveis (Header, Sidebar, modais, overlays, etc.) |
| `src/pages/` | Telas por domínio (Dashboard, Questões, Admin*, etc.) |
| `src/lib/` | Cliente Supabase, APIs por domínio (`*Api.js`), utilitários (FSRS, analytics, catálogo) |
| `src/data/` | Dados estáticos ou seeds (ex.: catálogos) |
| `src/index.css` | Tokens CSS, component layers Tailwind, utilities globais |
| `tailwind.config.js` | Extensão do tema Tailwind |
| `vite.config.js` | Build, dev server, **proxy** `/supabase` e `/api` (conforme configurado) |
| `supabase/*.sql` | Esquema e migrações lógicas por feature (referência para DBA/backend) |
| `ai-server.mjs` | Servidor Node opcional para features de IA |

---

## Fluxo de dados (padrão)

1. **Autenticação:** `@supabase/supabase-js` com sessão persistida (`src/lib/supabase.js`).
2. **Leitura/escrita:** módulos em `src/lib/*Api.js` encapsulam `supabase.from(...)`, RPCs ou queries específicas.
3. **Estado de tela:** páginas e `App.jsx` mantêm `useState` / `useEffect`; não há Redux/Zustand no `package.json` atual — ao adicionar store global, documentar aqui.
4. **Catálogo híbrido:** parte do conteúdo pode vir de `src/data/*` e parte de Supabase — ao criar feature, definir fonte única de verdade por entidade.

---

## Integração Supabase

### Cliente

- Arquivo: `src/lib/supabase.js`.
- `createClient(supabaseBaseUrl, supabaseAnonKey, { auth: { persistSession, autoRefreshToken, detectSessionInUrl } })`.
- **Dev proxy:** se `import.meta.env.DEV` e URL direta configurada, `supabaseBaseUrl` pode ser `${origin}/supabase` para contornar limitações de cookie/CORS em desenvolvimento (ver comentários e `vite.config.js`).

### Variáveis

- `VITE_SUPABASE_URL` — URL do projeto Supabase.
- `VITE_SUPABASE_ANON_KEY` — chave anônima (apenas operações permitidas por RLS).

### Esquema no repositório

Scripts em `supabase/` cobrem (entre outros): perfil e identidade, materiais, questões, flashcards, sessões de estudo, metas semanais, mapas mentais, progresso de audiobook, redações, Vade Mecum, comunidade, referrals, catálogo de disciplinas/links, templates de concurso, admin CRM/finance.

**Regra de engenharia:** ao alterar tabelas usadas no app, atualizar o SQL correspondente **e** os módulos `*Api.js` na mesma entrega quando possível, para evitar drift.

### CLI e deploy remoto (automação)

1. **Instalar uso pontual da CLI:** não é obrigatório instalar globalmente; os scripts usam `npx supabase`.
2. **Login (uma vez por máquina):** `npm run supabase:login` — abre o browser e grava o access token (ou defina `SUPABASE_ACCESS_TOKEN` no ambiente, útil em CI).
3. **Ligar o repositório ao projeto hospedado:** na raiz do repo, `npm run supabase:link` e indique o **Project ref** (Settings → General no dashboard; também aparece na URL do projeto).
4. **Gerar o SQL combinado (RLS admin + registration_antifraud):** `npm run db:bundle:admin-registration` → cria `supabase/deploy_registration_and_admin_rls.bundle.sql` (ficheiro ignorado pelo git).
5. **Aplicar no Postgres remoto:** com o link feito, `npm run db:deploy:admin-registration` — executa o bundle via Management API (`supabase db query --linked -f ...`). Equivale a colar o bundle no SQL Editor, sem abrir o painel.
6. **Resto do esquema:** outros ficheiros em `supabase/*.sql` continuam a ser aplicados conforme [`supabase-admin-rls.md`](supabase-admin-rls.md) e necessidade; o bundle acima cobre só helpers + políticas em `profiles` + cadastro/antifraude.
7. **RLS admin (Fase C) em lote:** `npm run db:deploy:admin-rls-phase-c` — aplica no remoto a lista em `scripts/deploy-admin-rls-phase-c.mjs` (catálogo, questões, admin finance/CRM, redações, Vade Mecum, comunidade, mapas, etc.), desde que `admin_rls_helpers.sql` já exista no banco.

### Deploy na Vercel (testes com URL pública)

- O repo já inclui `vercel.json` com rewrite SPA (`/(.*)` → `/index.html`).
- **Build:** `npm run build` (saída `dist/`). A Vercel deteta Vite pelo `package.json`.
- **Variáveis de ambiente no projeto Vercel** (Settings → Environment Variables), para *Production* e *Preview*: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (os mesmos valores do `.env` local; **não** commits).
- **Supabase Auth:** em Authentication → URL configuration, definir **Site URL** como a URL da Vercel (ex.: `https://<projeto>.vercel.app`) e incluir em **Redirect URLs** essa URL e, se usares previews, `https://*.vercel.app` ou cada URL de preview — senão login/callback falha no domínio novo.
- **Comandos:** primeira vez: `npx vercel login` (ou login no browser ao correr o deploy). Preview: `npm run vercel:preview`. Produção: `npm run vercel:prod`.

### Segurança

- Toda regra de acesso sensível deve estar em **RLS** no Postgres; o front não é confiável.
- Chaves service role **não** pertencem ao Vite bundle; apenas anon no cliente.
- **Admins no RLS:** função `public.is_app_admin()` (e alias `is_profile_admin()`) em `supabase/admin_rls_helpers.sql`; políticas extra de perfis em `supabase/profiles_admin_rls.sql`. Ordem de deploy e lista de scripts afetados: [`docs/supabase-admin-rls.md`](supabase-admin-rls.md).

---

## IA (`ai-server.mjs` + `src/lib/aiClient.js`)

- Servidor Node lê `.env` e expõe endpoints para análise/chat conforme provedor (Ollama, OpenAI, Gemini).
- **Produção:** tratar como serviço com autenticação, rate limit e CORS restrito; o estado atual é orientado a **desenvolvimento local**.

---

## Pontos de atenção arquiteturais

1. **`App.jsx` grande:** risco de acoplamento e rerenders; evolução natural seria extrair providers, hooks de navegação ou router explícito.
2. **Duplicação de max-width:** já existe normalização via CSS em `index.css` para filhos de `main`; novas páginas devem usar `page-shell` / 1320px em vez de novos máximos arbitrários.
3. **Admin vs app:** páginas `Admin*` compartilham o mesmo bundle; garantir guards por perfil no backend (RLS) e no front apenas como UX.

---

## Build e ambientes

- `npm run dev` — Vite dev server.
- `npm run build` — artefato estático para hospedagem edge/static + configuração de env no host.
- `npm run ai:server` — sobe o servidor de IA local (quando necessário).

---

## Referência cruzada

- Produto e features: `docs/context.md`
- UI: `docs/ui-guidelines.md`
- Processo: `docs/rules.md`
- Planejamento: `docs/roadmap.md`
