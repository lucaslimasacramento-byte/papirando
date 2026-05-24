# Papirando — Próximos passos (atualizado: 2026-05-07)

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
| 8 | Sistema de feedback | Tabela beta_feedback legada, botão Header, modal, AdminBetaFeedback |
| 9 | Trial aberto de lançamento | Todo cadastro recebe 3 meses do plano Elite automaticamente |
| 10 | Gateway de pagamento | Edge Functions Stripe (checkout + webhook), tabela subscriptions, useSubscription hook, AdminAssinaturas, Assinatura.jsx com checkout real |

---

## ⚠️ SQLs pendentes no Supabase (rodar no SQL Editor)

Arquivos criados localmente que precisam ser executados no Supabase:

| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `supabase/beta_invites.sql` | ⛔ Legado | Convites beta fechados removidos do fluxo do app |
| `supabase/subscriptions.sql` | ⏳ Pendente | Tabela subscriptions + RLS + get_my_subscription() |
| `supabase/admin_user_helpers.sql` | ⏳ Pendente | get_user_id_by_email() e get_email_by_user_id() |

---

## ⚠️ Stripe — configuração pendente (durante conta em aprovação)

1. Conta Stripe aprovada → criar produtos (Tatico mensal/anual, Elite mensal/anual)
2. Supabase CLI: `supabase secrets set STRIPE_SECRET_KEY=...` (ver `supabase/STRIPE_SETUP.md`)
3. Deploy Edge Functions: `supabase functions deploy create-checkout-session` + `stripe-webhook`
4. Configurar webhook no Stripe Dashboard (eventos: checkout.session.completed, subscription.updated, subscription.deleted, invoice.payment_failed)

Guia completo: `supabase/STRIPE_SETUP.md`

---

## 🔜 Próximas etapas (pós-lançamento)

### Alta prioridade
- **Emails transacionais próprios** — padronizar confirmação, boas-vindas, recuperação, troca de e-mail, lembretes e indicações com identidade Papirando.
- **Feature gates reais** — usar `isPremiumPlan` já conectado ao Stripe para bloquear funcionalidades (ex: limite de questões/dia no plano gratuito, IA gates)
- **Portal do cliente Stripe** — botão "Gerenciar assinatura" em Assinatura.jsx que redireciona para `https://billing.stripe.com` com o customer ID

### Média prioridade
- **Admin: mostrar e-mail na tabela de assinaturas** — `AdminAssinaturas.jsx` hoje mostra `user_id`. Conectar `get_email_by_user_id()` para mostrar o e-mail
- **Onboarding** — wizard de configuração inicial (concurso alvo, horário de estudo) para usuários novos
- **Notificações push** — alertas de revisão e metas atrasadas

### Baixa prioridade (após crescimento)
- Programa de afiliados / referral bônus real
- App mobile (React Native / Expo)
- Integrações: Google Calendar, Notion

---

## 🏗️ Arquitetura — referência rápida

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite 8, TailwindCSS |
| Backend | Supabase (PostgreSQL + Auth + RLS + Edge Functions Deno) |
| IA | Gemini 1.5 Pro (produção), Ollama local (dev), OpenAI fallback |
| Pagamentos | Stripe Billing + Checkout + Webhooks |
| Monitoramento | Sentry (VITE_SENTRY_DSN) |
| Deploy | Vercel (frontend) + Supabase Cloud (backend) |

---

## 📁 Arquivos críticos

| Arquivo | Propósito |
|---------|-----------|
| `src/components/AppTabContent.jsx` | **Hub de roteamento** — TODA rota nova vai aqui |
| `src/lib/subscriptionApi.js` | Hook `useSubscription()` + checkout Stripe |
| `src/lib/betaInvitesApi.js` | Removido; o fluxo atual usa apenas indicação/referral |
| `src/lib/adminTabIds.js` | Lista de abas admin + títulos |
| `src/components/Sidebar.jsx` | Menu lateral — itens admin aqui |
| `src/App.jsx` | `isPremiumPlan` e `isElitePlan` agora leem tabela Stripe |
| `supabase/STRIPE_SETUP.md` | Guia de configuração Stripe passo a passo |
