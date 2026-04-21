-- Rótulos customizados do menu lateral (JSON: { "home": "Início", ... }).
-- Rode no SQL Editor do Supabase quando já existir public.redacao_site_content.

alter table public.redacao_site_content
  add column if not exists sidebar_labels_json jsonb;

comment on column public.redacao_site_content.sidebar_labels_json is
  'Mapa opcional tabId -> texto exibido no sidebar. Null ou {} = usar textos padrão do app.';
