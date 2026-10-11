-- ============================================================================
-- Feedback do aluno sobre a questão
--
-- Quem resolve a questão é quem descobre que ela está errada: gabarito trocado, enunciado
-- truncado, imagem que não carrega, comentário que não bate. Sem um caminho para avisar, o
-- aluno só pode fechar a tela — e o defeito fica no banco para o próximo encontrar.
--
-- Um voto por aluno por questão (a chave primária é o par), e o voto pode mudar de ideia:
-- o aluno marca "não ajudou", relê e troca para "ajudou". Por isso o update é dele.
--
-- Idempotente.
-- ============================================================================

create table if not exists public.question_feedback (
  question_id uuid        not null references public.questions(id) on delete cascade,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  -- 'util' (joinha para cima) ou 'ruim' (para baixo). O check existe para a coluna não virar
  -- campo livre: relatório que soma texto arbitrário não soma nada.
  voto        text        not null check (voto in ('util', 'ruim')),
  comentario  text        not null default '' check (char_length(comentario) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (question_id, user_id)
);

comment on table public.question_feedback is
  'O que o aluno achou da questão. Um voto por aluno por questão; serve para achar questão com gabarito errado antes que ela ensine errado a muita gente.';

-- O relatório do admin é "quais questões têm mais voto ruim": o índice é por questão.
create index if not exists question_feedback_voto_idx on public.question_feedback(question_id, voto);

alter table public.question_feedback enable row level security;

-- O aluno vê, escreve e corrige o PRÓPRIO voto. Ninguém vê o voto do outro: feedback é
-- recado para quem mantém o banco, não placar público.
drop policy if exists "Aluno le o proprio feedback" on public.question_feedback;
create policy "Aluno le o proprio feedback"
  on public.question_feedback for select
  to authenticated
  using (user_id = auth.uid() or public.is_app_admin());

drop policy if exists "Aluno registra o proprio feedback" on public.question_feedback;
create policy "Aluno registra o proprio feedback"
  on public.question_feedback for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.questions q
      where q.id = question_feedback.question_id and q.is_public = true
    )
  );

drop policy if exists "Aluno muda de ideia" on public.question_feedback;
create policy "Aluno muda de ideia"
  on public.question_feedback for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Admin gerencia o feedback" on public.question_feedback;
create policy "Admin gerencia o feedback"
  on public.question_feedback for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());
