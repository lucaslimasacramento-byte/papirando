-- Curso padrão PM-BA Soldado + concurso no catálogo (ambos em RASCUNHO).
-- Rodar depois de supabase/migrations/202610130001_cursos_biblioteca.sql.
-- Idempotente. As disciplinas/tópicos do concurso e o material são preenchidos por
-- scripts/upload_biblioteca.mjs --materia "<matéria>".
--
-- Para publicar quando estiver revisado:
--   update contest_templates set is_public = true, status = 'ativo' where slug = 'pm-ba-soldado';
--   update course_packages set is_published = true where slug = 'pmba-soldado';

insert into public.contest_templates (
  slug, nome, plano, concurso, cargo, banca, area, cor, tipo, status, origem, is_public,
  status_concurso, escolaridade, lotacao, uf, descricao
) values (
  'pm-ba-soldado',
  'PM-BA — Soldado',
  'PM-BA — Soldado',
  'Polícia Militar da Bahia',
  'Soldado',
  'A definir',
  'Policial',
  '#1e3a5f',
  'concurso',
  'rascunho',
  'catalogo',
  false,
  'previsto',
  'Nível médio',
  'Bahia',
  'BA',
  'Curso padrão Papirando para Soldado da PM-BA: PDFs completos, mapas mentais, resumos, simulados, slides, flashcards e banco de questões comentadas por tema. Revisar dados do certame (banca, vagas, datas) antes de publicar.'
)
on conflict (slug) do nothing;

insert into public.course_packages (slug, titulo, descricao, contest_template_id, is_published)
select
  'pmba-soldado',
  'PM-BA — Soldado',
  'Curso padrão Papirando com todo o material pronto para estudo.',
  ct.id,
  false
from public.contest_templates ct
where ct.slug = 'pm-ba-soldado'
on conflict (slug) do nothing;

select c.slug, c.is_published, ct.slug as template_slug, ct.is_public as template_publico
from public.course_packages c
left join public.contest_templates ct on ct.id = c.contest_template_id
where c.slug = 'pmba-soldado';
