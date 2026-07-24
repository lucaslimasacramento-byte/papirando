# Papirando — Contexto do produto

Documento de referência **técnico/produto** para humanos e para IA. Atualizar quando o produto ou a stack mudarem materialmente.

> **Escopo deste doc:** produto, stack, arquitetura e estado do código.
> **Marketing (posicionamento, redes, campanhas) NÃO fica aqui** → ver [`docs/MARKETING.md`](MARKETING.md).
> Como separar o contexto por categoria → ver seção [Mapa de documentação](#mapa-de-documentação).

---

## Objetivo do produto

O **Papirando** é uma plataforma SaaS de **estudo com IA** — o "estúdio onde o seu material vira estudo de verdade". O usuário traz o próprio conteúdo (PDFs, anotações, edital) e a plataforma transforma isso em trilha, questões, simulados, flashcards, revisão espaçada e planejamento. Posicionamento **premium/editorial**: interface calma, hierarquia clara, sensação de produto sério.

---

## Público e proposta de valor

- **Público:** estudante **em geral** — não só concurseiros. Três personas:
  1. **Concurseiro** — usa trilhas/simulados/edital embutidos.
  2. **Universitário** — sobe o próprio material e usa IA + organização + simulados em cima dele.
  3. **Autodidata / pós / vestibulando** — traz qualquer conteúdo e usa as ferramentas.
- **Diferencial:** *"traga seu material, a plataforma adapta"* — não *"temos o melhor curso de concurso"*. A marca-mãe é generalista; pode haver campanhas verticais (concurso, faculdade).

---

## Stack técnica

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19.2, Vite 8 |
| Estilo | Tailwind CSS 3.4 + design tokens `pl-*` em `src/index.css` |
| Backend / dados | Supabase (Auth + Postgres + RLS + APIs geradas) |
| Serverless | Supabase Edge Functions (`supabase/functions/*`) + API routes na Vercel (`/api/*`) |
| Pagamentos | **Asaas** (checkout + webhook) |
| Monitoramento | Sentry (`@sentry/react`) |
| PDF | pdfjs-dist |
| Ícones | lucide-react |
| IA | `src/lib/aiClient.js` → provider **Gemini** (via `ai-server.mjs` em dev / proxy). Alt: OpenRouter, Groq, HuggingFace |
| Testes / Qualidade | Vitest (`npm run test`), ESLint 9 (`npm run lint`) |
| Deploy | Vercel (`npm run vercel:prod`) |

Variáveis de ambiente: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GEMINI_API_KEY` (e chaves alt em `.env.local`, não commitado). Secrets de servidor (Asaas, Meta, service role) no Supabase/Vercel.

---

## Funcionalidades (visão macro)

**Estudo e conteúdo**

- Dashboard e estatísticas
- Objetivos → disciplinas (uma disciplina só existe alimentada por um objetivo)
- Detalhe por disciplina (progresso, materiais)
- Catálogo: concursos e vestibulares disponíveis, "meus concursos", detalhe
- Edital e navegação por edital/questão
- Questões, simulados, flashcards (lógica FSRS em `src/lib/fsrs.js`)
- Revisão espaçada por tópico (FSRS) — passo 4 da trilha de planejamento
- Mapas mentais (premium), redações, legislação / Vade Mecum
- Audiobooks e progresso
- Materiais, revisões, ciclos, metas semanais, planejamento
- Sessões de estudo e histórico
- Bem-estar (biblioteca de conteúdo)

**Conta e monetização**

- Login (Supabase Auth)
- Perfil, assinatura, **3 planos**:

  | Label (marketing) | Valor DB `subscription_plan` | Preço |
  |---|---|---|
  | **Folha** (free) | `gratuito` | R$ 0 — limites duros |
  | **Caderno** | `caderno` | R$ 49,90/mês · R$ 39,90 anual |
  | **Estúdio** | `estudio` | R$ 89,90/mês · R$ 71,90 anual |

  Status de assinatura inclui `trialing` (período grátis → libera premium sem pagar).
- Convide e ganhe (referrals)

**Comunidade e social:** comunidades, esquadrões.

**Administração (operacional):** painéis admin — dashboard, usuários, concursos, questões, disciplinas padrão, CRM, finanças, assinaturas, configurações.

**Integrações:** Instagram Graph API (publicação/métricas) — setup técnico em [`docs/instagram-setup.md`](instagram-setup.md).

---

## Identidade visual — sistema `pl-*` (editorial)

Design system **Papirando Editorial** definido em `src/index.css` (`:root` / `.pl-theme-light` / `.pl-theme-dark`). É a **única** identidade válida — classes antigas (`section-card`, `btn-primary`, `page-shell`, `PageHeadPremium`) foram removidas.

Tokens-âncora (light):

| Token | Valor | Uso |
|---|---|---|
| `--pl-bg` | `#f3efe5` | Fundo papel bege quente |
| `--pl-ink` | `#14110d` | Texto/logo principal |
| `--pl-accent` | `#1e3a5f` | Acento tinta-de-caneta (único acento de marca) |

Tipografia: **Fraunces** (editorial, italic display) · **Plus Jakarta Sans** (UI) · **JetBrains Mono** (mono).
Guia completo de tokens e átomos CSS (`pl-card`, `pl-btn`, `pl-display`, `pl-eyebrow`, etc.) no `CLAUDE.md` e em `docs/brand/`.

---

## Estado atual (snapshot)

- **App:** SPA; `App.jsx` concentra estado e roteamento por "view".
- **UI:** identidade **editorial `pl-*`** migrada em todas as ~32 páginas + Sidebar/Header. Backlog é só polish fino (espaçamentos, estados vazios, mobile, dark mode 100%).
- **Pagamentos:** Asaas integrado (checkout funcionando, trial libera premium). Edge Functions `create-checkout-session` e `asaas-webhook` prontas. `stripe-webhook` = legado.
- **Segurança:** auditoria com blindagem RLS aplicada no banco real; plano de IA movido para o servidor; PII de indicação e mind_maps premium tratados. Achados abertos residuais rastreados em `docs/AUDITORIA_ACHADOS.md`.
- **Catálogo:** ~200 vestibulares publicados + ~1.500 concursos importados (rascunho) via Management API.
- **Riscos conhecidos:** possível drift entre SQL em repo e tabelas reais; `ai-server` é dev — não expor sem auth/CORS.

---

## Mapa de documentação

> **Regra:** cada tipo de contexto tem seu doc. Não misture marketing em doc de produto, nem detalhe técnico em doc de estratégia. Ao registrar algo, escolha a categoria certa abaixo.

| Categoria | Doc | O que vai aqui |
|---|---|---|
| **Produto / contexto** | `docs/CONTEXT.md` (este) | Objetivo, stack, funcionalidades, estado do código |
| **Arquitetura** | `docs/architecture.md` | Decisões estruturais, contratos, data flow |
| **Roadmap** | `docs/ROADMAP.md` | O que vem por aí, priorização |
| **Continuidade entre sessões** | `docs/handoff.md` / `docs/WORKLOG.md` | Onde parei, próximo passo, log de sessões |
| **UI / design** | `docs/ui-guidelines.md`, `CLAUDE.md`, `docs/brand/` | Tokens, componentes, padrões visuais |
| **Segurança** | `docs/supabase-admin-rls.md`, `docs/AUDITORIA_ACHADOS.md` | RLS, auditorias, achados |
| **Deploy / infra** | `docs/vercel-deploy-runbook.md` | Runbooks de deploy |
| **Marketing (estratégia)** | **`docs/MARKETING.md`** | Posicionamento, voz, redes, campanhas, calendário, copy |
| **Marketing (técnico)** | `docs/instagram-setup.md`, `docs/email-strategy.md` | Integrações e infra de canais |

---

## Manutenção deste documento

- Ao adicionar um módulo grande (nova área de menu / novo domínio de dados): atualizar **funcionalidades**, **estado atual** e, se preciso, `architecture.md` / `ROADMAP.md`.
- Ao mudar posicionamento, oferta, canal ou campanha: **não editar aqui** — vai em `docs/MARKETING.md`.
- Continuidade entre chats de IA: usar `docs/handoff.md` / `docs/WORKLOG.md`.
