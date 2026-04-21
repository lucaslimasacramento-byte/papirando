-- Tabelas de Flashcards com suporte ao algoritmo FSRS-4.5

-- Decks (coleções de cards)
CREATE TABLE IF NOT EXISTS flashcard_decks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  disciplina  TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT 'blue',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cards com campos FSRS-4.5
CREATE TABLE IF NOT EXISTS flashcard_cards (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id         UUID NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front           TEXT NOT NULL,
  back            TEXT NOT NULL,
  -- FSRS fields
  stability       FLOAT NOT NULL DEFAULT 0,
  difficulty      FLOAT NOT NULL DEFAULT 5,
  elapsed_days    INTEGER NOT NULL DEFAULT 0,
  scheduled_days  INTEGER NOT NULL DEFAULT 0,
  reps            INTEGER NOT NULL DEFAULT 0,
  lapses          INTEGER NOT NULL DEFAULT 0,
  state           SMALLINT NOT NULL DEFAULT 0,  -- 0=New 1=Learning 2=Review 3=Relearning
  due             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_review     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS flashcard_decks_user_id_idx ON flashcard_decks(user_id);
CREATE INDEX IF NOT EXISTS flashcard_cards_deck_id_idx ON flashcard_cards(deck_id);
CREATE INDEX IF NOT EXISTS flashcard_cards_user_due_idx ON flashcard_cards(user_id, due);

-- RLS Decks
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário gerencia próprios decks"
  ON flashcard_decks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Cards
ALTER TABLE flashcard_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário gerencia próprios cards"
  ON flashcard_cards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
