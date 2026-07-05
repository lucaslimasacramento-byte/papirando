-- Migration: agenda de repeticao espacada por topico (Passo 4 da trilha).
-- Um "card" FSRS por (usuario, disciplina, topico). Reaproveita a mesma
-- engine (src/lib/fsrs.js) ja usada nos flashcards. A revisao aparece embutida
-- no plano como bloco "Revisao" — nao ha tela separada. Idempotente.

CREATE TABLE IF NOT EXISTS public.topic_review_schedule (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  disciplina     text NOT NULL DEFAULT '',
  topico         text NOT NULL DEFAULT '',
  -- Estado FSRS (mesmos campos de flashcard_cards)
  stability      double precision NOT NULL DEFAULT 0,
  difficulty     double precision NOT NULL DEFAULT 5,
  elapsed_days   integer NOT NULL DEFAULT 0,
  scheduled_days integer NOT NULL DEFAULT 0,
  reps           integer NOT NULL DEFAULT 0,
  lapses         integer NOT NULL DEFAULT 0,
  state          integer NOT NULL DEFAULT 0,
  due            timestamptz NOT NULL DEFAULT timezone('utc', now()),
  last_review    timestamptz,
  last_rating    integer,
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT topic_review_unique UNIQUE (user_id, disciplina, topico)
);
CREATE INDEX IF NOT EXISTS topic_review_user_id_idx ON public.topic_review_schedule (user_id);
CREATE INDEX IF NOT EXISTS topic_review_user_due_idx ON public.topic_review_schedule (user_id, due);
ALTER TABLE public.topic_review_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "topic_review_own_all" ON public.topic_review_schedule;
CREATE POLICY "topic_review_own_all"
  ON public.topic_review_schedule FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_review_schedule TO authenticated;
