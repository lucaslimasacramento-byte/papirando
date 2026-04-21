# RLS de administradores (Supabase)

Referência para **Fase C** do painel admin: critério único no Postgres, alinhado ao cliente (`profiles.role = 'admin'` + `ADMIN_EMAILS` em `App.jsx`).

---

## Ficheiros novos

| Ficheiro | Função |
|----------|--------|
| `supabase/admin_rls_helpers.sql` | `public.is_app_admin()` (`security definer`) e alias `public.is_profile_admin()`; `grant execute` a `authenticated`. |
| `supabase/profiles_admin_rls.sql` | Políticas `profiles_admin_select` e `profiles_admin_update` para admins verem/atualizarem **todos** os perfis (`AdminUsuarios`, contagens). |

---

## Ordem recomendada no SQL Editor

1. `admin_rls_helpers.sql`
2. `profiles_admin_rls.sql`
3. Reaplicar scripts cujas políticas foram alteradas (ou só os blocos `DROP POLICY` / `CREATE POLICY` correspondentes), conforme a vossa rotina de migração.

`admin_role_bootstrap.sql` comenta esta ordem e o papel de `profiles.role`.

**Automatizar a reaplicação dos scripts alinhados (4–15 da checklist):** com o projeto ligado (`npm run supabase:link`), na raiz do repo: `npm run db:deploy:admin-rls-phase-c` — executa em sequência os `.sql` listados na secção *Scripts em `supabase/` já alinhados* mais `admin_role_bootstrap.sql` (ver `scripts/deploy-admin-rls-phase-c.mjs`). Isto **não** inclui o bundle `db:deploy:admin-registration` (helpers + `profiles` + antifraude); aplique esse primeiro se ainda não estiver no remoto.

---

## Critério `is_app_admin()`

A função considera admin quem (em resumo):

- tem `profiles.role = 'admin'` para `auth.uid()`, ou
- e-mail do perfil em `@papirando.com`, ou
- e-mail do perfil na lista curta espelhada em SQL (hoje inclui o mesmo endereço que está em `ADMIN_EMAILS` no app), ou
- a mesma lógica via claim `email` no JWT (útil se o perfil ainda não estiver sincronizado).

**Manutenção:** ao acrescentar admins só por e-mail (sem `role` nem domínio institucional), atualizar a lista em **`admin_rls_helpers.sql`** *e* **`ADMIN_EMAILS`** em `App.jsx` até tudo depender só de `role`.

---

## Scripts em `supabase/` já alinhados a `is_app_admin()`

Políticas que antes fixavam `auth.jwt() ->> 'email' = '…'` ou duplicavam lógica de admin:

- `admin_finance.sql`, `admin_crm.sql`
- `subject_catalog.sql`, `exam_boards_catalog.sql`
- `redacao_site_content.sql`, `redacao_expert_tips.sql`
- `vade_mecum.sql` (tabelas + storage)
- `contest_templates.sql` (tabelas + storage)
- `questions.sql` (política “Admin gerencia questões”)

**Moderação / galeria:** `community.sql` e `mind_map_gallery.sql` deixaram de definir `is_profile_admin()` localmente; dependem do helper (aplicar `admin_rls_helpers.sql` **antes** destes ao correr tudo de raiz).

---

## Próximos passos (retomada)

- [ ] Aplicar no projeto Supabase **produção/staging** na ordem acima e validar: Financeiro, CRM, Concursos/templates, Questões, Usuários, Redações, Legislação/storage, mapas/comunidade (ações admin).
- [ ] Confirmar que um utilizador com `role = 'admin'` **sem** estar na lista JWT antiga consegue todas as operações acima.
- [ ] (Opcional) Reduzir duplicação: expandir só `profiles.role` e remover gradualmente lista de e-mails do SQL e do `App.jsx` para novos admins.

---

## Ver também

- `docs/handoff.md` — estado da última sessão e prioridades gerais.
- `docs/architecture.md` — secção Supabase / segurança.
