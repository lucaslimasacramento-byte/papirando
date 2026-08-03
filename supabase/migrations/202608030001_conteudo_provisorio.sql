-- Concursos PRÉ-EDITAL: o certame já existe oficialmente (autorizado, comissão formada,
-- banca contratada, edital iminente) mas o edital ainda não saiu.
--
-- Nesse caso o conteúdo programático vem do EDITAL ANTERIOR do mesmo órgão/cargo — que é
-- exatamente como o concurseiro estuda no pré-edital. Precisa ficar explícito na tela:
-- o aluno tem direito de saber que aquela lista pode mudar quando o edital sair.
--
-- `conteudo_fonte_url` guarda o link do edital anterior (fonte do conteúdo), separado de
-- `edital_url`, que no pré-edital aponta para o ATO oficial do novo certame.

alter table public.contest_templates
  add column if not exists conteudo_provisorio boolean not null default false;

alter table public.contest_templates
  add column if not exists conteudo_fonte_url text;

comment on column public.contest_templates.conteudo_provisorio is
  'true = conteudo programatico veio do edital anterior (certame pre-edital); exibir aviso ao aluno';
comment on column public.contest_templates.conteudo_fonte_url is
  'URL do edital anterior de onde saiu o conteudo programatico, quando conteudo_provisorio = true';
