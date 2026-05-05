# Papirando — Próximos passos (atualizado: 2026-05-04)

## ✅ Concluído

| # | Passo | Detalhe |
|---|-------|---------|
| 1 | Deploy banco de dados | RLS + SQLs pendentes aplicados no Supabase |
| 2 | Vercel env vars + Auth URLs | Smoke test OK |
| 3 | Testes automatizados | 4 fluxos críticos cobertos |
| 4 | Padronização visual Admin | AdminMindMapsGallery, AdminConfiguracoes, PageHeadPremium fixos |
| 5 | Redesign Hero Edital em Questão | Novo layout hero section |
| 6 | Gate IA (VITE_AI_ENABLED) | Todos os entry points protegidos; produção segura sem a env var |
| 7 | Sentry | Inicializa apenas com VITE_SENTRY_DSN; DSN configurado no .env.local |
| 8 | Sistema de feedback beta | Tabela beta_feedback no Supabase (RLS), botão no Header, modal inline, página Admin · Feedback beta |
| 9 | Lançamento beta fechado | Tabela beta_invites, AdminBetaConvites (geração de links), AdminBetaFeedback, BetaWelcomeBanner (first-run) |

---

## ⚠️ Ação manual necessária — Supabase

Antes de usar AdminBetaConvites, rodar no SQL Editor do Supabase:

```
supabase/beta_invites.sql
```

Isso cria a tabela `beta_invites` + RLS + função `mark_beta_invite_used()`.

---

## 🔜 Pendente

### Passo 10 — Gateway de pagamento (pós-beta)
- Escolher provider: **Stripe** (recomendado) ou PagSeguro / Iugu
- Criar tabela `subscriptions` no Supabase (+ webhook handler)
- Implementar webhook pagamento → atualizar `subscription_plan` do usuário
- Liberar features premium no `SubscriptionPlanSeal` e guards de conteúdo

---

## Fluxo operacional — beta fechado

1. Admin entra em **Admin → Convites beta** (`/admin_beta_convites`)
2. Clica em "Convidar" → preenche e-mail + nome
3. Copia o link gerado → envia por WhatsApp / e-mail
4. Usuário abre o link, se cadastra e vê o `BetaWelcomeBanner` no primeiro acesso
5. Admin acompanha quem acessou na mesma tela (badge "Acessou" / "Pendente")
6. Feedbacks aparecem em **Admin → Feedback beta** (`/admin_beta_feedback`)
7. Erros em produção aparecem no Sentry

---

## Arquitetura atual — referência rápida

| Item | Detalhe |
|------|---------|
| Framework | React 19 + Vite 8 SPA |
| Banco | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| IA | Gemini (opt-in via VITE_AI_ENABLED=true) |
| Observabilidade | Sentry (opt-in via VITE_SENTRY_DSN) |
| Hosting | Vercel |
| Dev server | `C:\Users\lucas\Desktop\App_Estudos\papirando` (projeto principal, NÃO o worktree) |

## Arquivos-chave

| Arquivo | Finalidade |
|---------|-----------|
| `src/App.jsx` | Roteamento central (activeTab switch) |
| `src/components/Header.jsx` | Header: feedback inline, cronômetro, notificações |
| `src/components/Sidebar.jsx` | Navegação lateral (NAV_SECTIONS_BASE + ADMIN_SECTION) |
| `src/components/BetaWelcomeBanner.jsx` | Banner first-run para usuários beta |
| `src/lib/adminTabIds.js` | IDs e títulos das abas admin |
| `src/lib/aiClient.js` | Gate VITE_AI_ENABLED |
| `src/lib/betaFeedbackApi.js` | CRUD da tabela beta_feedback |
| `src/lib/betaInvitesApi.js` | CRUD da tabela beta_invites + buildInviteUrl |
| `src/pages/AdminBetaConvites.jsx` | Gestão dos 50 convites (geração de links, status) |
| `src/pages/AdminBetaFeedback.jsx` | Visualização e exclusão dos feedbacks |
| `src/main.jsx` | Sentry init (gated em VITE_SENTRY_DSN) |
| `supabase/beta_feedback.sql` | Schema + RLS da tabela de feedback |
| `supabase/beta_invites.sql` | Schema + RLS + função da tabela de convites |
