-- Registro de respostas dos usuários às questões do banco
-- Usado por src/lib/questoesApi.js > submitAnswer() para alimentar
-- estatísticas de acerto/erro, trilha de revisão e ranking.

CREATE TABLE IF NOT EXISTS public.question_answers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  resposta        TEXT NOT NULL DEFAULT '',
  is_correct      BOOLEAN NOT NULL DEFAULT FALSE,
  tempo_segundos  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS question_answers_user_idx
  ON public.question_answers(user_id);
CREATE INDEX IF NOT EXISTS question_answers_question_idx
  ON public.question_answers(question_id);
CREATE INDEX IF NOT EXISTS question_answers_user_question_idx
  ON public.question_answers(user_id, question_id);
CREATE INDEX IF NOT EXISTS question_answers_created_at_idx
  ON public.question_answers(created_at DESC);

ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;

-- O dono da linha pode ler suas próprias respostas
DROP POLICY IF EXISTS "question_answers_select_own" ON public.question_answers;
CREATE POLICY "question_answers_select_own"
  ON public.question_answers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- O dono pode inserir uma resposta para si mesmo
DROP POLICY IF EXISTS "question_answers_insert_own" ON public.question_answers;
CREATE POLICY "question_answers_insert_own"
  ON public.question_answers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Não permitimos UPDATE/DELETE pelo usuário (registros são imutáveis para
-- preservar histórico de acertos/erros). O admin do app continua tendo
-- acesso total via policies de admin específicas, se necessárias.

-- Admin pode ler/gerenciar tudo (usa helper is_app_admin já no projeto)
DROP POLICY IF EXISTS "question_answers_admin_all" ON public.question_answers;
CREATE POLICY "question_answers_admin_all"
  ON public.question_answers FOR ALL
  TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());
