# Auditoria — Achados e Status (2026-07-04)

Legenda: ✅ corrigido · 🟡 corrigido no repo, falta aplicar no banco · ⏳ pendente · ℹ️ falso alarme

## 🔴 P0 — Críticos (bloqueiam lançamento)

- 🟡 **Escalada a admin via `profiles.email`** — usuário comum podia `update profiles set email='x@papirando.com'` e virar admin (`is_app_admin()` confia no domínio + trigger não protegia email). **Fix:** `migrations/202607040001_blindagem_rls.sql` (is_app_admin não confia mais em profiles.email para domínio; trigger bloqueia email institucional). Falta aplicar no banco.
- 🟡 **`admin_notices`: qualquer usuário reescrevia broadcasts globais** (phishing pra toda a base). **Fix:** policy de UPDATE restrita ao próprio aviso. Falta aplicar no banco.
- ⏳ **`ai-server.mjs` sem validação de JWT/plano** — token estático compartilhado; `return true` se `AI_SERVER_TOKEN` vazio. IA sem controle de plano server-side. Precisa validar JWT Supabase + `usage_counters`.
- ⏳ **Limites de plano só no frontend** — usuário free cria flashcards/mapas/questões/redações ilimitados via API direta (RLS só checa posse, não plano). Precisa RPC `security definer` de criação OU policy com checagem de plano.

## 🟠 P1 — Altos (1ª versão)

- 🟡 **`community_comments` USING(true)** — comentários de posts privados legíveis por qualquer um (até anônimo). **Fix:** SELECT condicionado à visibilidade do post pai. Falta aplicar no banco.
- 🟡 **`resolve_squad_invite` exposto a anônimo** — enumeração de esquadrões + payload completo. **Fix:** grant só a authenticated. Falta aplicar no banco.
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
