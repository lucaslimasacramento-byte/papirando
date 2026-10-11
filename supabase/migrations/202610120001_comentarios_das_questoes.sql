-- ============================================================================
-- Comentário da questão — cache compartilhado
--
-- Toda questão precisa de comentário explicando a resposta. As questões que entraram pela
-- API do ENEM (api.enem.dev) não têm nenhum: a API devolve enunciado, alternativas e
-- gabarito, e nada mais. São milhares de questões — gerar tudo de uma vez por IA custaria
-- caro e envelheceria junto com o modelo.
--
-- Aqui o comentário é gerado UMA VEZ, por quem chegar primeiro na questão, e fica guardado
-- para todos os outros. Por isso a tabela é separada de `questions`: aquela só o admin
-- escreve (e tem de continuar assim — é o conteúdo curado), e esta qualquer aluno autenticado
-- preenche. O comentário escrito à mão pelo admin em `questions.explicacao` continua tendo
-- prioridade: esta tabela só responde quando aquele campo está vazio.
--
-- Idempotente.
-- ============================================================================

create table if not exists public.question_comments (
  question_id   uuid primary key references public.questions(id) on delete cascade,
  comentario    text        not null,
  gabarito      text        not null default '',
  conceitos     jsonb       not null default '[]'::jsonb,
  dica          text        not null default '',
  -- Quem gerou. Serve para reprocessar o que um modelo antigo escreveu mal sem apagar
  -- o resto.
  modelo        text        not null default '',
  origem        text        not null default 'ia',
  created_by    uuid        references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.question_comments is
  'Comentário da resposta, gerado sob demanda e compartilhado entre todos os alunos. Cache, não conteúdo curado: questions.explicacao continua sendo a fonte da verdade quando preenchida.';

alter table public.question_comments enable row level security;

-- Leitura: igual à da questão. Se o aluno pode ver a questão, pode ver o comentário dela.
drop policy if exists "Leitura dos comentários de questões públicas" on public.question_comments;
create policy "Leitura dos comentários de questões públicas"
  on public.question_comments for select
  using (
    exists (
      select 1 from public.questions q
      where q.id = question_comments.question_id and q.is_public = true
    )
  );

-- Escrita: qualquer aluno autenticado PREENCHE o que está vazio, e ninguém sobrescreve o
-- que já existe. Sem o update, o primeiro comentário fica — o que importa é a questão deixar
-- de estar sem explicação, não quem gerou.
drop policy if exists "Aluno autenticado gera o comentário que falta" on public.question_comments;
create policy "Aluno autenticado gera o comentário que falta"
  on public.question_comments for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.questions q
      where q.id = question_comments.question_id and q.is_public = true
    )
  );

-- Correção e reprocessamento são do admin.
drop policy if exists "Admin gerencia comentários de questões" on public.question_comments;
create policy "Admin gerencia comentários de questões"
  on public.question_comments for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());
