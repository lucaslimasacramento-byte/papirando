-- Vestibulares: modelo híbrido sobre a tabela compartilhada contest_templates.
-- Colunas novas SÓ para o que filtra/agrupa; o resto (timeline, etapas, cursos,
-- leituras, sobre a instituição, etc.) vive em `meta` (jsonb).
-- Tudo nullable / com default seguro — NÃO afeta os concursos existentes.
--
-- Como rodar: Supabase Studio → SQL Editor → cole e execute (ou Management API).

-- 1) Migração (colunas novas)
alter table public.contest_templates add column if not exists uf char(2);                 -- UF quando estadual; null = nacional/EAD
alter table public.contest_templates add column if not exists scope text;                 -- 'nacional' | 'estadual'
alter table public.contest_templates add column if not exists modality text;              -- 'presencial' | 'ead' | 'hibrido' | 'multiplo'
alter table public.contest_templates add column if not exists institution_type text;      -- 'publica' | 'privada' | 'programa_governo'
alter table public.contest_templates add column if not exists registration_start date;    -- início das inscrições
alter table public.contest_templates add column if not exists registration_end date;      -- fim das inscrições (null = sempre aberto)
alter table public.contest_templates add column if not exists meta jsonb not null default '{}'::jsonb;

-- índice leve para agrupar/filtrar por localidade (só vestibulares interessam, mas é genérico)
create index if not exists contest_templates_scope_uf_idx on public.contest_templates (scope, uf);

-- 2) Backfill best-effort dos vestibulares já importados (os 200).
--    Não há UF na origem -> scope = nacional. institution_type/modality por heurística do nome/banca.
update public.contest_templates set
  scope = coalesce(scope, 'nacional'),
  institution_type = coalesce(
    institution_type,
    case
      when nome ilike '%enem%' or banca ilike '%inep%' then 'publica'
      when nome ilike '%sisu%' or nome ilike '%prouni%' or nome ilike '%fies%' or banca ilike '%mec%' then 'programa_governo'
      else 'privada'
    end
  ),
  modality = coalesce(
    modality,
    case
      when nome ilike '%enem%' or nome ilike '%fuvest%' or nome ilike '%sisu%' then 'presencial'
      else 'multiplo'   -- redes privadas costumam ter presencial + EAD
    end
  )
where tipo = 'vestibular';

-- Conferência rápida:
-- select scope, institution_type, modality, count(*) from public.contest_templates
-- where tipo='vestibular' group by 1,2,3 order by 4 desc;
