# Operação diária do catálogo

Cada execução lê o brief atual, `../catalogo-operacao.json`, as fontes oficiais de
`../catalogo-fontes-monitoradas.json` e as fontes de descoberta de
`../catalogo-fontes-descoberta.json`.

As fontes de descoberta ampliam a cobertura nacional, mas nunca são fonte final:
todo item precisa terminar em edital, órgão, banca ou diário oficial permitido pelo
brief. `edital_url` de agregador é proibido.

Enquanto `phase` for `reconstrucao_inicial`, a coleta busca concursos vivos mesmo que
o edital não tenha sido publicado nas últimas 48 horas. Depois da base inicial, a fase
`daily` aplica a janela de 48 horas.

## Resultado da execução

- Sem fonte nova e sem falha: não cria arquivo e responde `sem editais novos hoje`.
- Fonte inacessível: responde `falha de coleta`, listando a fonte; nunca confunde isso com ausência de edital.
- Item novo válido: salva o JSON e o SQL nesta pasta, em uma subpasta `AAAA-MM-DD`.
- Atualização de item já entregue: registra uma proposta em `atualizacoes-pendentes/`; não gera SQL até existir suporte a revisões no catálogo.

## Critérios de aceitação

- Fonte oficial ou banca da lista branca; agregador só serve para descoberta.
- Documento publicado/retificado nas últimas 48 horas ou mudança oficial de fase.
- Edital publicado: conteúdo completo do anexo, com a quantidade de disciplinas e tópicos exigida pelo validador.
- Pré-edital: ato oficial e conteúdo explicitamente provisório, ancorado em edital anterior oficial.
- Prova datada deve ter pelo menos 60 dias de antecedência.
- Todo SQL criado mantém `is_public=false` e só aparece no Admin > Concursos > Rascunhos depois de aplicado manualmente no banco.
