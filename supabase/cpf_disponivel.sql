-- RPC chamada pelo OnboardingWizard e App.jsx para verificar se um CPF
-- já está em uso por OUTRA conta antes de salvar o perfil.
-- Retorna true = CPF disponível, false = CPF já cadastrado em outra conta.

create or replace function public.cpf_disponivel(check_cpf text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned text;
  cnt int;
begin
  -- Normaliza: só dígitos
  cleaned := regexp_replace(coalesce(check_cpf, ''), '\D', '', 'g');

  -- CPF vazio ou tamanho errado = disponível (validação de formato fica no cliente)
  if cleaned is null or length(cleaned) <> 11 then
    return true;
  end if;

  -- Conta quantos profiles têm esse CPF em uma conta DIFERENTE do usuário logado
  select count(*) into cnt
  from public.profiles
  where cpf = cleaned
    and id <> auth.uid();

  return cnt = 0;
end;
$$;

-- Apenas usuários autenticados podem chamar
revoke all on function public.cpf_disponivel(text) from public;
grant execute on function public.cpf_disponivel(text) to authenticated;
