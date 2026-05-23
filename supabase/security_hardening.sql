-- Hardening complementar de RLS para tabelas usadas pelo app mas ausentes/parciais nos scripts locais.
-- Revise no SQL Editor do Supabase antes de executar em producao.
-- Objetivo: impedir leitura/escrita cruzada por user_id e restringir feedback beta a admin.

do $$
begin
  if to_regclass('public.calendar_reminders') is not null then
    alter table public.calendar_reminders enable row level security;
    drop policy if exists "calendar_reminders_own_all" on public.calendar_reminders;
    create policy "calendar_reminders_own_all"
      on public.calendar_reminders
      for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if to_regclass('public.weekly_availability') is not null then
    alter table public.weekly_availability enable row level security;
    drop policy if exists "weekly_availability_own_all" on public.weekly_availability;
    create policy "weekly_availability_own_all"
      on public.weekly_availability
      for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if to_regclass('public.subjects') is not null then
    alter table public.subjects enable row level security;
    drop policy if exists "subjects_own_all" on public.subjects;
    create policy "subjects_own_all"
      on public.subjects
      for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if to_regclass('public.topics') is not null then
    alter table public.topics enable row level security;
    drop policy if exists "topics_own_all" on public.topics;
    create policy "topics_own_all"
      on public.topics
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.subjects s
          where s.id = topics.subject_id
            and s.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.subjects s
          where s.id = topics.subject_id
            and s.user_id = auth.uid()
        )
      );
  end if;

  if to_regclass('public.flashcard_reviews') is not null then
    alter table public.flashcard_reviews enable row level security;
    drop policy if exists "flashcard_reviews_own_all" on public.flashcard_reviews;
    create policy "flashcard_reviews_own_all"
      on public.flashcard_reviews
      for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if to_regclass('public.beta_feedback') is not null then
    alter table public.beta_feedback enable row level security;

    drop policy if exists "beta_feedback_insert_authenticated" on public.beta_feedback;
    create policy "beta_feedback_insert_authenticated"
      on public.beta_feedback
      for insert
      to authenticated
      with check (auth.uid() = user_id);

    drop policy if exists "beta_feedback_admin_read" on public.beta_feedback;
    create policy "beta_feedback_admin_read"
      on public.beta_feedback
      for select
      to authenticated
      using (public.is_app_admin());

    drop policy if exists "beta_feedback_admin_delete" on public.beta_feedback;
    create policy "beta_feedback_admin_delete"
      on public.beta_feedback
      for delete
      to authenticated
      using (public.is_app_admin());
  end if;
end $$;

-- Defesa em profundidade: usuarios comuns nao podem promover a propria conta
-- alterando role/plano/status por chamadas diretas ao PostgREST. Admin e service_role
-- continuam autorizados para painel administrativo, webhooks e edge functions.
do $$
begin
  if to_regclass('public.profiles') is not null then
    create or replace function public.protect_profile_privileged_fields()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $fn$
    begin
      if auth.role() = 'service_role' or public.is_app_admin() then
        return new;
      end if;

      if to_jsonb(new)->'role' is distinct from to_jsonb(old)->'role'
        or to_jsonb(new)->'subscription_plan' is distinct from to_jsonb(old)->'subscription_plan'
        or to_jsonb(new)->'subscription_status' is distinct from to_jsonb(old)->'subscription_status'
        or to_jsonb(new)->'max_courses' is distinct from to_jsonb(old)->'max_courses'
      then
        raise exception 'profile privileged fields are read-only';
      end if;

      return new;
    end;
    $fn$;

    drop trigger if exists trg_protect_profile_privileged_fields on public.profiles;
    create trigger trg_protect_profile_privileged_fields
      before update on public.profiles
      for each row
      execute function public.protect_profile_privileged_fields();
  end if;
end $$;
