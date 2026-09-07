-- Propostas de revisão do catálogo de concursos.
--
-- Decisão registrada em docs/CATALOGO-ESTRATEGIA.md: o catálogo nunca é alterado
-- destrutivamente por processo automático. Coleta nova, correção de aluno e diff de
-- robô produzem sempre o MESMO artefato — uma proposta com evidência, esperando
-- aprovação humana. Por isso existe uma tabela só, e não duas.
--
-- Depende de: supabase/admin_rls_helpers.sql (public.is_app_admin()).

create extension if not exists pgcrypto;

create table if not exists public.contest_revisions (
  id uuid primary key default gen_random_uuid(),

  -- Item alvo. Fica nulo enquanto a proposta se refere a um certame que ainda não
  -- existe no catálogo (o robô descobriu antes de haver rascunho).
  contest_template_id uuid references public.contest_templates(id) on delete cascade,

  -- Identidade da fonte no formato do coletor: orgao|numero-do-edital|cargo.
  -- É o que o scripts/catalog_daily_state.mjs já usa para separar novo de atualização.
  source_identity text,

  -- Quem propôs. 'robo' = coleta automática; 'aluno' = correção comunitária;
  -- 'import' = lote manual.
  origem text not null default 'robo',
  status text not null default 'pendente',

  -- Patch proposto: { "coluna": "novo valor" }. Só as colunas da allowlist da
  -- função de aprovação são aplicáveis.
  changes jsonb not null default '{}'::jsonb,

  -- Evidência é obrigatória por decisão de produto: proposta sem fonte não é
  -- revisável. A lista branca de domínios oficiais vive no validador
  -- (scripts/validate_catalog_json.mjs) e continua valendo para quem coleta.
  evidencia_url text,
  evidencia_nota text,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),

  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_nota text,

  constraint contest_revisions_status_valido
    check (status in ('pendente', 'aprovada', 'recusada')),
  constraint contest_revisions_origem_valida
    check (origem in ('robo', 'aluno', 'import')),
  constraint contest_revisions_alvo_presente
    check (contest_template_id is not null or source_identity is not null)
);

create index if not exists idx_contest_revisions_fila
  on public.contest_revisions (status, created_at desc);

create index if not exists idx_contest_revisions_template
  on public.contest_revisions (contest_template_id)
  where contest_template_id is not null;

-- Uma proposta pendente por (item, origem): o robô re-propor a mesma coisa todo dia
-- não pode inflar a fila. Reproposta atualiza a linha existente (ver upsert na API).
create unique index if not exists uniq_contest_revisions_pendente
  on public.contest_revisions (contest_template_id, origem)
  where status = 'pendente' and contest_template_id is not null;

comment on table public.contest_revisions is
  'Fila única de propostas de correção do catálogo — robô de monitoramento e correção comunitária entregam aqui.';

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.contest_revisions enable row level security;

drop policy if exists contest_revisions_admin_all on public.contest_revisions;
create policy contest_revisions_admin_all
  on public.contest_revisions
  for all
  using (public.is_app_admin())
  with check (public.is_app_admin());

-- Aluno enxerga apenas o que ele mesmo propôs.
drop policy if exists contest_revisions_own_select on public.contest_revisions;
create policy contest_revisions_own_select
  on public.contest_revisions
  for select
  using (created_by = auth.uid());

-- Aluno propõe correção em nome próprio e só como 'aluno'. Não consegue forjar
-- proposta de robô nem já nascer aprovada.
drop policy if exists contest_revisions_own_insert on public.contest_revisions;
create policy contest_revisions_own_insert
  on public.contest_revisions
  for insert
  with check (
    created_by = auth.uid()
    and origem = 'aluno'
    and status = 'pendente'
  );

-- ── Aprovação ────────────────────────────────────────────────────────────────
-- Aplica o patch com allowlist de colunas. Fora da allowlist nada é escrito:
-- slug, id, is_public e origem continuam sob controle exclusivo do admin pela
-- tela de edição, como no SEC-001 do profileApi.
create or replace function public.apply_contest_revision(revision_id uuid, nota text default null)
returns public.contest_revisions
language plpgsql
security definer
set search_path = public
as $$
declare
  rev public.contest_revisions;
  allowed text[] := array[
    'nome', 'concurso', 'cargo', 'area', 'banca', 'salario', 'inscricao_valor',
    'escolaridade', 'vagas', 'lotacao', 'etapas', 'etapas_tags', 'taf_itens',
    'status_concurso', 'prova_data', 'edital_url', 'imagem_url', 'descricao',
    'uf', 'scope', 'modality', 'institution_type'
  ];
  campo text;
  valor jsonb;
  sets text[] := '{}';
begin
  if not public.is_app_admin() then
    raise exception 'Apenas admin pode aprovar revisao.' using errcode = '42501';
  end if;

  select * into rev from public.contest_revisions where id = revision_id for update;
  if not found then
    raise exception 'Revisao % nao encontrada.', revision_id using errcode = 'P0002';
  end if;
  if rev.status <> 'pendente' then
    raise exception 'Revisao % ja foi %.', revision_id, rev.status using errcode = '22023';
  end if;
  if rev.contest_template_id is null then
    raise exception 'Revisao % nao aponta para um item do catalogo.', revision_id using errcode = '22023';
  end if;

  for campo, valor in select * from jsonb_each(rev.changes) loop
    if campo = any(allowed) then
      -- #>>'{}' extrai o texto sem as aspas do JSON; o cast da coluna resolve
      -- date/jsonb. Valor null vira null de verdade na coluna.
      sets := sets || format(
        '%I = %L::text::%s',
        campo,
        valor #>> '{}',
        case
          when campo in ('etapas_tags', 'taf_itens') then 'jsonb'
          when campo = 'prova_data' then 'date'
          else 'text'
        end
      );
    end if;
  end loop;

  if array_length(sets, 1) is null then
    raise exception 'Revisao % nao tem nenhum campo aplicavel.', revision_id using errcode = '22023';
  end if;

  execute format(
    'update public.contest_templates set %s, updated_at = now() where id = %L',
    array_to_string(sets, ', '),
    rev.contest_template_id
  );

  update public.contest_revisions
     set status = 'aprovada',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         review_nota = coalesce(nota, review_nota)
   where id = revision_id
  returning * into rev;

  return rev;
end;
$$;

create or replace function public.reject_contest_revision(revision_id uuid, nota text default null)
returns public.contest_revisions
language plpgsql
security definer
set search_path = public
as $$
declare
  rev public.contest_revisions;
begin
  if not public.is_app_admin() then
    raise exception 'Apenas admin pode recusar revisao.' using errcode = '42501';
  end if;

  update public.contest_revisions
     set status = 'recusada',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         review_nota = coalesce(nota, review_nota)
   where id = revision_id and status = 'pendente'
  returning * into rev;

  if not found then
    raise exception 'Revisao % nao encontrada ou ja revisada.', revision_id using errcode = 'P0002';
  end if;

  return rev;
end;
$$;

revoke all on function public.apply_contest_revision(uuid, text) from public;
revoke all on function public.reject_contest_revision(uuid, text) from public;
grant execute on function public.apply_contest_revision(uuid, text) to authenticated;
grant execute on function public.reject_contest_revision(uuid, text) to authenticated;
