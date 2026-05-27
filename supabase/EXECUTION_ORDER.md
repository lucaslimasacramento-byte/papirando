# Supabase SQL Scripts - Execution Order

Ordem recomendada para aplicar os scripts SQL do Papirando em um ambiente novo ou em uma recuperacao. Esta lista cobre os SQLs em `supabase/` e `supabase/migrations/`.

Legenda:

- **Idempotente**: seguro para reexecutar; usa `IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS`, `ON CONFLICT`, ou guards equivalentes.
- **Parcial**: partes sao seguras, mas pode falhar ao reexecutar por policies/triggers/constraints ja existentes ou por data migrations.
- **Nao idempotente**: contem mutacao de dados/constraint sem guarda forte; revise antes de reexecutar.
- **Opcional**: script de apoio, bundle ou draft; nao rode junto com o fluxo principal sem decidir conscientemente.

## Quick Start

Para um Supabase limpo:

1. Confirme que o projeto ja tem `auth.users` e uma tabela `public.profiles` criada pelo fluxo de cadastro, ou revise/aplique `missing_tables_draft.sql` como bootstrap de schema.
2. Execute as camadas abaixo na ordem: **foundation -> admin/RLS helpers -> features -> patches -> storage -> security -> crons**.
3. Nao rode `deploy_registration_and_admin_rls.bundle.sql` se voce ja rodou `admin_rls_helpers.sql` + `registration_antifraud.sql`; ele e um bundle alternativo.
4. Rode `storage_buckets_missing.sql` depois da migration de Instagram para garantir `instagram-temp` privado e limitado a 10 MB.
5. Rode `send_reminder_cron.sql` apenas depois de ativar `pg_cron`/`pg_net` e publicar a Edge Function de lembrete.

Promova o primeiro admin depois que `profiles` e `admin_role_bootstrap.sql` existirem:

```sql
update public.profiles
set role = 'admin'
where lower(trim(email)) = lower('seu@email.com');
```

## 1. Foundation

| # | Script | Dependencias | Idempotencia | Observacoes |
|---|--------|--------------|--------------|-------------|
| 1 | `missing_tables_draft.sql` | `auth.users`, `admin_rls_helpers.sql` se usar policies admin | Opcional / Parcial | Draft inferido do app para `profiles`, `subjects`, `topics`, `calendar_reminders`, `weekly_availability`, `flashcard_reviews`. Revise contra o banco real antes de aplicar. Em ambiente novo pode precisar vir depois do passo 7 por causa de `public.is_app_admin()`. |
| 2 | `study_sessions.sql` | `auth.users` | Parcial | Cria historico de estudos. Policies nao usam `DROP POLICY IF EXISTS`, entao reexecucao pode falhar. |
| 3 | `weekly_goals.sql` | `auth.users` | Parcial | Cria metas semanais. Policy nao usa drop antes de criar. |
| 4 | `flashcards.sql` | `auth.users` | Parcial | Cria decks/cards. Necessario antes de `flashcard_reviews` no draft. Policies nao usam drop antes de criar. |
| 5 | `materials.sql` | `auth.users` | Parcial | Cria `study_materials`, `material_highlights`, `material_notes`. Bucket fica em `storage_buckets_missing.sql`. Policies nao usam drop antes de criar. |
| 6 | `mind_maps.sql` | `auth.users` | Idempotente | Cria mapas mentais do usuario e policies own scoped. |
| 7 | `questions.sql` | `auth.users`, `admin_rls_helpers.sql` | Idempotente | Cria banco de questoes; policy admin chama `public.is_app_admin()`, entao o helper precisa existir antes. |

## 2. Admin e RLS Helpers

| # | Script | Dependencias | Idempotencia | Observacoes |
|---|--------|--------------|--------------|-------------|
| 8 | `admin_rls_helpers.sql` | `public.profiles` | Idempotente | Define `public.is_app_admin()` e `public.is_profile_admin()`. Rode cedo, antes de policies admin. |
| 9 | `admin_role_bootstrap.sql` | `public.profiles` | Idempotente | Adiciona `profiles.role`. Necessario para admins reais. |
| 10 | `admin_user_helpers.sql` | `auth.users`, `admin_rls_helpers.sql` | Idempotente | Funcoes para resolver email/user id no painel admin. |

## 3. Feature Schemas

| # | Script | Dependencias | Idempotencia | Observacoes |
|---|--------|--------------|--------------|-------------|
| 11 | `subject_catalog.sql` | `admin_rls_helpers.sql` | Idempotente | Catalogo global de disciplinas; policies admin usam helper. |
| 12 | `exam_boards_catalog.sql` | `admin_rls_helpers.sql` | Idempotente | Catalogo de bancas. |
| 13 | `contest_templates.sql` | `auth.users`, `admin_rls_helpers.sql` | Idempotente | Cria templates, subjects/topics de concurso e buckets publicos de concurso. |
| 14 | `question_answers.sql` | `questions.sql`, `auth.users` | Idempotente | Historico/respostas do usuario por questao. |
| 15 | `question_api_import.sql` | `questions.sql`, `admin_rls_helpers.sql` | Idempotente / Parcial | Cria `question_sources` e adiciona colunas/indices em `questions`. Deve vir depois de `questions.sql`. |
| 16 | `material_markers.sql` | `materials.sql`, `auth.users` | Idempotente | Marcacoes salvas por material. |
| 17 | `audiobook_progress.sql` | `auth.users` | Idempotente | Progresso de audiobooks. |
| 18 | `vade_mecum.sql` | `auth.users`, `admin_rls_helpers.sql` | Idempotente | Cria documentos/estado do Vade Mecum e bucket `vade-mecum-files`. |
| 19 | `mind_map_gallery.sql` | `admin_rls_helpers.sql` | Idempotente | Galeria publica/admin de mapas mentais. |
| 20 | `redacoes.sql` | `auth.users` | Idempotente | Cria `essay_submissions` e bucket `essay-uploads` seguindo path por `auth.uid()`. |
| 21 | `redacao_expert_tips.sql` | `admin_rls_helpers.sql` | Idempotente | Dicas de redacao geridas por admin. |
| 22 | `redacao_site_content.sql` | `admin_rls_helpers.sql` | Idempotente | Conteudo global da area de redacao; base para patches de conteudo. |
| 23 | `community.sql` | `auth.users`, `admin_rls_helpers.sql` | Idempotente | Comunidades, posts, comentarios, reacoes. |
| 24 | `squad_payload.sql` | `community.sql` | Idempotente | Complementa `community_posts` e cria resolver de convite de esquadroes. |
| 25 | `subscriptions.sql` | `auth.users`, `admin_rls_helpers.sql` | Idempotente | Assinaturas Stripe e eventos de webhook. |
| 26 | `referrals.sql` | `public.profiles` | Idempotente / Parcial | Programa de indicacoes. Tem triggers e funcoes; revise se ja houver dados inconsistentes. |
| 27 | `beta_invites.sql` | `admin_rls_helpers.sql` | Idempotente / Parcial | Convites beta. Possui blocos defensivos, mas revise constraints antes de reexecutar. |
| 28 | `beta_invites_rpc.sql` | `beta_invites.sql`, `admin_rls_helpers.sql` | Idempotente | RPCs de convite beta. |
| 29 | `admin_finance.sql` | `admin_rls_helpers.sql` | Idempotente | Despesas/financeiro admin. |
| 30 | `admin_crm.sql` | `admin_rls_helpers.sql` | Idempotente | Leads/CRM admin. |
| 31 | `migrations/202605240001_instagram_integration.sql` | `auth.users` | Idempotente / Parcial | Cria tabelas de Instagram e bucket `instagram-temp`, mas com leitura publica e 100 MB. Rode `storage_buckets_missing.sql` depois para corrigir o bucket para privado/10 MB. |

## 4. Patches e Extensoes

| # | Script | Dependencias | Idempotencia | Observacoes |
|---|--------|--------------|--------------|-------------|
| 32 | `profile_identity_constraints.sql` | `public.profiles` | Idempotente / Parcial | Adiciona identidade, CPF e codinome. Revise constraints se ja houver duplicados. |
| 33 | `registration_antifraud.sql` | `public.profiles` | Parcial | Adiciona antifraude, funcoes e triggers em `profiles`/`auth.users`. Pode ser substituido pelo bundle do final se ainda nao rodou helpers. |
| 34 | `onboarding.sql` | `public.profiles` | Nao idempotente | Contem update em massa marcando usuarios existentes como onboarding completo. Revise antes de reexecutar. |
| 35 | `subject_catalog_links.sql` | `subject_catalog.sql`, `contest_templates.sql`, `subjects` | Idempotente | Adiciona FK opcional para catalogo em `subjects` e `contest_template_subjects`. |
| 36 | `redacao_site_content_audiobooks.sql` | `redacao_site_content.sql` | Idempotente | Adiciona catalogo de audiobooks ao conteudo global. |
| 37 | `redacao_site_content_sidebar_labels.sql` | `redacao_site_content.sql` | Idempotente | Adiciona labels da sidebar ao conteudo global. |
| 38 | `redacao_site_content_notification_settings.sql` | `redacao_site_content.sql` | Idempotente | Adiciona configuracoes de notificacao ao conteudo global. |
| 39 | `redacao_site_content_course_templates.sql` | `redacao_site_content.sql` | Idempotente | Adiciona templates de cursos; inclui update com `coalesce`. |
| 40 | `profiles_admin_rls.sql` | `public.profiles`, `admin_rls_helpers.sql` | Idempotente | Policies admin adicionais para profiles. |
| 41 | `migrations/202505240002_cpf_unique_horas_numeric.sql` | `public.profiles`, colunas `cpf` e `meta_horas_semana` | Nao idempotente | Normaliza dados de CPF e altera tipo de `meta_horas_semana`. Execute uma vez e com backup. |
| 42 | `migrations/202505240003_contest_templates_tipo.sql` | `contest_templates.sql` | Idempotente | Adiciona coluna `tipo` em templates. |

## 5. Storage

| # | Script | Dependencias | Idempotencia | Observacoes |
|---|--------|--------------|--------------|-------------|
| 43 | `storage_buckets.sql` | Storage schema do Supabase | Idempotente | Buckets documentados: `avatars`, `contest-images`, `contest-edital-files`, `vade-mecum-files`. |
| 44 | `storage_buckets_missing.sql` | Storage schema do Supabase | Idempotente | Buckets faltantes usados no codigo: `study-materials` e `instagram-temp`, ambos privados e user-scoped por prefixo `auth.uid()`. Deve vir depois da migration de Instagram para sobrescrever configuracao publica antiga. |

## 6. Security Hardening

| # | Script | Dependencias | Idempotencia | Observacoes |
|---|--------|--------------|--------------|-------------|
| 45 | `security_hardening.sql` | `admin_rls_helpers.sql`; tabelas alvo se existirem | Idempotente | Usa `to_regclass()` para aplicar RLS complementar apenas em tabelas existentes e protege campos privilegiados de `profiles`. |

## 7. Crons

| # | Script | Dependencias | Idempotencia | Observacoes |
|---|--------|--------------|--------------|-------------|
| 46 | `send_reminder_cron.sql` | Extensoes `pg_cron` e `pg_net`; Edge Function `send-reminder-email` publicada | Idempotente | Desagenda job anterior e agenda novamente. Rode por ultimo. |

## Scripts Bundle / Operacionais

| Script | Status | Quando usar |
|--------|--------|-------------|
| `deploy_registration_and_admin_rls.bundle.sql` | Opcional | Bundle gerado para aplicar `admin_rls_helpers.sql` + partes de admin/profiles/antifraude em um unico arquivo. Use **em vez de** rodar `admin_rls_helpers.sql` e `registration_antifraud.sql` separadamente, nao junto. |

Arquivos nao-SQL de apoio:

- `deploy_registration_and_admin_rls.ps1`: gera/aplica bundle conforme fluxo local.
- `STRIPE_SETUP.md`: checklist operacional do Stripe.
- `config.toml`: configuracao do Supabase CLI.

## Dependencias Principais

```text
auth.users
  -> public.profiles
     -> admin_role_bootstrap.sql
     -> admin_rls_helpers.sql
     -> profile_identity_constraints.sql
     -> registration_antifraud.sql
     -> onboarding.sql
     -> referrals.sql
     -> profiles_admin_rls.sql

admin_rls_helpers.sql
  -> questions.sql
  -> contest_templates.sql
  -> subject_catalog.sql
  -> exam_boards_catalog.sql
  -> redacao_* admin content
  -> community.sql
  -> subscriptions.sql
  -> beta_invites.sql
  -> admin_finance.sql
  -> admin_crm.sql
  -> security_hardening.sql

materials.sql
  -> material_markers.sql
  -> storage_buckets_missing.sql (study-materials bucket)

flashcards.sql
  -> missing_tables_draft.sql (flashcard_reviews, se usado)

questions.sql
  -> question_answers.sql
  -> question_api_import.sql

contest_templates.sql
  -> subject_catalog_links.sql
  -> migrations/202505240003_contest_templates_tipo.sql

redacao_site_content.sql
  -> redacao_site_content_audiobooks.sql
  -> redacao_site_content_sidebar_labels.sql
  -> redacao_site_content_notification_settings.sql
  -> redacao_site_content_course_templates.sql

community.sql
  -> squad_payload.sql

migrations/202605240001_instagram_integration.sql
  -> storage_buckets_missing.sql (corrige instagram-temp para privado/user-scoped)
```

## Observacoes de Producao

- Rode os scripts em uma branch/staging do Supabase antes de producao.
- Scripts marcados como **Parcial** podem precisar de `DROP POLICY IF EXISTS` manual se ja foram aplicados antes.
- Scripts marcados como **Nao idempotente** devem ser tratados como migration unica, com backup e revisao dos dados afetados.
- Se `profiles` ainda nao existir em um ambiente novo, revise `missing_tables_draft.sql`; ele e intencionalmente conservador e foi inferido do codigo.
