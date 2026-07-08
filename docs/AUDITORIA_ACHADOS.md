# Auditoria — Achados e Status (2026-07-04)

Legenda: ✅ corrigido · 🟡 corrigido no repo, falta aplicar no banco · ⏳ pendente · ℹ️ falso alarme

> **ATUALIZAÇÃO 2026-07-04 (aplicação):** verificado contra o banco REAL via Management API.
> Repo estava dessincronizado do banco. Reconciliado e aplicado. Ver abaixo.

## ✅ APLICADO NO BANCO DE PRODUÇÃO (verificado)

- ✅ **`admin_notices`: qualquer usuário reescrevia broadcasts globais** — CONFIRMADO no banco (`user_id IS NULL` no UPDATE). **Corrigido:** policy restrita a `user_id = auth.uid()`. Frontend ajustado: dispensar broadcast agora usa localStorage (App.jsx).
- ✅ **`community_comments` USING(true)** — CONFIRMADO. **Corrigido:** SELECT condicionado à visibilidade do post pai.
- ✅ **`resolve_squad_invite` exposto a anônimo** — CONFIRMADO (anon + PUBLIC com EXECUTE). **Corrigido:** revogado de PUBLIC/anon; só authenticated.

## ℹ️ FALSO POSITIVO (repo desatualizado ≠ banco real)

- ℹ️ **"Escalada a admin via `profiles.email`"** — **NÃO existe em produção.** O `is_app_admin()` real é role-only (sem cláusula de e-mail — mudado em 21/06). O arquivo `admin_rls_helpers.sql` do repo estava stale. Escalada de `role` já bloqueada por 2 triggers (`protect_profile_privileged_fields` + `profiles_block_sensitive_self_update`). Migration NÃO mexe em is_app_admin (seria retrocesso).

## 🔴 P0 restantes (bloqueiam lançamento)

- ⏳ **`ai-server.mjs` sem validação de JWT/plano** — token estático compartilhado; `return true` se `AI_SERVER_TOKEN` vazio. IA sem controle de plano server-side. Precisa validar JWT Supabase + `usage_counters`.
- ⏳ **Limites de plano só no frontend** — usuário free cria flashcards/mapas/questões/redações ilimitados via API direta (RLS só checa posse, não plano). Precisa RPC `security definer` de criação OU policy com checagem de plano.

## 🟠 P1 — Altos restantes (1ª versão)
- ✅ **`essay-uploads` sem validação de tipo/tamanho** — bucket público servia .html/.svg com script. **Fix aplicado:** validação de MIME + 10MB em `redacoesApi.js`. (Follow-up: setar `allowed_mime_types`/`file_size_limit` no bucket + torná-lo privado.)
- ⏳ **`profiles_referral_related_read` expõe PII completa** (CPF/telefone/IP do par de indicação). Precisa RPC/view com só nome/username/avatar.
- ⏳ **`npm audit`: vitest/vite/ws** com vulnerabilidades (dev-only, não afetam produção). Rodar `npm audit fix` e testar.

## ✅ Confirmado SÓLIDO (verificado, sem furo)

- Webhook Asaas: valida token + reverifica pagamento na fonte + idempotente. Sem "premium grátis".
- `create-checkout-session`: preço server-side, auth obrigatória.
- Escalada de plano via `subscriptions`/`profiles.role`: bloqueada (grant coluna a coluna + trigger).
- Tabelas admin gated por `is_app_admin()` no banco.
- Maioria das tabelas de usuário com RLS `auth.uid() = user_id` + WITH CHECK.
- XSS: nenhum `dangerouslySetInnerHTML` com conteúdo de usuário/IA; tudo renderizado como texto.
- Security headers no `vercel.json`: CSP/HSTS/X-Frame/etc. completos e fortes.
- Segredos: nada vazou no git; nenhuma chave privada no bundle.

## ℹ️ Falsos alarmes da primeira varredura

- ".env commitado com chaves" → **falso.** Só `.env.example` está no git; `.gitignore` cobre `.env*` e `.claude/`.
- "settings.local.json com tokens versionado" → **falso.** `.claude/` gitignored.

## 🟢 P2 — Médios (2ª versão)
Ver `AUDITORIA_MEGA_PROMPT.md` Seção F: MFA admin, logs de auditoria, SPF/DKIM/DMARC, code-splitting App.jsx, LGPD (exportação/exclusão), remover ~149 console.log, testes dos fluxos críticos.
