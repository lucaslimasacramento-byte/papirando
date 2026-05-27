-- CPF: normaliza para só dígitos antes de adicionar constraint
-- (garante que formatos diferentes (111.222.333-44 vs 11122233344) não passem)

-- 1. Normaliza CPFs existentes para só dígitos
UPDATE profiles
SET cpf = regexp_replace(cpf, '\D', '', 'g')
WHERE cpf IS NOT NULL AND cpf ~ '\D';

-- 2. Zera CPFs vazios ou inválidos (menos de 11 dígitos)
UPDATE profiles
SET cpf = NULL
WHERE cpf IS NOT NULL AND length(regexp_replace(cpf, '\D', '', 'g')) < 11;

-- 3. Adiciona UNIQUE constraint no cpf (null values são ignorados pelo UNIQUE)
--    Usa DO block para não falhar se a constraint já existir
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_cpf_unique UNIQUE (cpf);
EXCEPTION WHEN duplicate_table THEN
  -- constraint já existe, ok
END $$;

-- 4. Migra meta_horas_semana de integer para numeric(4,1)
--    para aceitar meias-horas (ex: 0.5, 1.5)
ALTER TABLE profiles
  ALTER COLUMN meta_horas_semana TYPE numeric(4,1)
  USING meta_horas_semana::numeric(4,1);
