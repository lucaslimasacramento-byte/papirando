-- Onboarding: adiciona campos ao profiles para rastrear wizard inicial

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_done       boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS meta_horas_semana     integer  DEFAULT 15;

-- Garante que usuários existentes não vejam o wizard (opta-in apenas novos)
-- Comente a linha abaixo se quiser que todos passem pelo wizard
UPDATE profiles SET onboarding_done = true WHERE onboarding_done IS FALSE OR onboarding_done IS NULL;
