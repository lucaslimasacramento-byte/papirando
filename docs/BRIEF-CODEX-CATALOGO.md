# Brief para o Codex — coleta de concursos/vestibulares para o catálogo

Este arquivo tem duas partes:

1. **O prompt** — copiar da linha `--- INÍCIO DO PROMPT ---` até o fim e colar no Codex.
2. **O que fazer com o resultado** — pipeline de import (no fim do arquivo).

O formato do JSON abaixo é exatamente o que `scripts/gen_catalog_drafts_sql.mjs` consome.
Não mudar nomes de campos sem mudar o script junto.

---

--- INÍCIO DO PROMPT ---

Você vai montar um seed de dados de concursos públicos brasileiros para o catálogo de um
app de estudos. O resultado é **um arquivo JSON**, não um relatório.

## Formato de saída

Um array JSON. Cada item é um concurso (um cargo específico, não o edital inteiro):

```json
[
  {
    "nome": "Polícia Federal — Agente 2026",
    "tipo": "concurso",
    "plano": "Polícia Federal — Agente 2026",
    "concurso": "Polícia Federal",
    "area": "Policial",
    "cargo": "Agente de Polícia Federal",
    "banca": "Cebraspe",
    "salario": "R$ 12.522,50",
    "inscricao_valor": "R$ 180,00",
    "escolaridade": "Superior completo",
    "vagas": "1000",
    "lotacao": "Nacional",
    "etapas": "Prova objetiva, discursiva, TAF, investigação social",
    "etapas_tags": ["objetiva", "discursiva", "taf", "investigacao_social"],
    "taf_itens": ["Corrida 12 min", "Barra fixa", "Impulsão horizontal"],
    "status_concurso": "edital_publicado",
    "prova_data": "2026-09-13",
    "edital_url": "https://...",
    "descricao": "Concurso nacional para o cargo de Agente da Polícia Federal.",
    "cor": "#1e3a5f",
    "disciplinas": [
      {
        "nome": "Direito Constitucional",
        "topicos": [
          "Direitos e garantias fundamentais",
          "Organização do Estado",
          "Poder Judiciário"
        ]
      },
      { "nome": "Português", "topicos": ["Interpretação de texto", "Crase"] }
    ]
  }
]
```

## Regras dos campos

| Campo | Obrigatório | Regra |
|---|---|---|
| `nome` | sim | Rótulo que o aluno vê. Padrão: `Órgão — Cargo Ano` |
| `tipo` | sim | Exatamente um de: `concurso`, `vestibular`, `enem`. Qualquer outro valor é rejeitado pelo banco |
| `plano`, `concurso` | sim | Se não souber, repita o `nome` em `plano` e o nome do órgão em `concurso` |
| `area` | sim | Ex.: `Policial`, `Fiscal`, `Tribunais`, `Saúde`, `Educação`, `Militar`, `Geral` |
| `cargo` | não | Nome do cargo isolado |
| `banca` | sim | Se ainda não definida, use exatamente `A definir` |
| `salario`, `inscricao_valor` | não | **String formatada em BRL**, ex.: `"R$ 12.522,50"`. Não usar número |
| `escolaridade` | não | `Nível médio`, `Superior completo`, etc. |
| `vagas` | não | String. Aceita `"1000"`, `"200 + CR"`, `"CR"` |
| `lotacao` | não | Cidade/UF/`Nacional` |
| `etapas` | não | Frase curta listando as fases |
| `etapas_tags` | não | Array de slugs em minúsculo sem acento: `objetiva`, `discursiva`, `redacao`, `taf`, `oral`, `titulos`, `investigacao_social`, `psicotecnico`, `medico` |
| `taf_itens` | não | Array de strings. Só se houver teste físico. Senão, `[]` |
| `status_concurso` | sim | Um de: `previsto`, `autorizado`, `comissao_formada`, `banca_em_definicao`, `banca_definida`, `edital_iminente`, `edital_publicado`, `inscricoes_abertas`, `prova_marcada`, `em_andamento`, `homologado` |
| `prova_data` | não | **Formato `YYYY-MM-DD` ou omitido.** Qualquer outro formato vira nulo silenciosamente |
| `edital_url` | sim | URL direta do edital ou da página oficial. É a prova de que o dado é real |
| `descricao` | não | 1–2 frases |
| `cor` | não | Hex `#RRGGBB`. Se não souber, omita |
| `disciplinas` | sim | Array. Cada item: `{ "nome": "...", "topicos": ["...", "..."] }`. É o campo mais valioso — vem do conteúdo programático do edital |

## Regras de conteúdo (importantes)

1. **Nunca invente.** Se não achou o dado, **omita o campo** ou use `null`. Um campo vazio é
   corrigível depois; um dado errado destrói a confiança do usuário e é invisível pra gente.
2. **Só fonte oficial.** Site do órgão, site da banca, diário oficial ou PDF do edital.
   Blog de cursinho serve só pra *encontrar* o edital, nunca como fonte do dado.
3. **`edital_url` é obrigatório.** Item sem link não entra.
4. **Não copie texto do edital.** De `disciplinas`/`topicos`, extraia apenas os **nomes** das
   matérias e dos tópicos do conteúdo programático — nada de parágrafos, ementas longas ou
   trechos transcritos.
5. **Um item por cargo**, não por edital. Se o edital tem 5 cargos com conteúdos diferentes,
   são 5 itens. Se os cargos compartilham exatamente o mesmo conteúdo, pode ser 1 item com o
   cargo mais representativo.
6. **Prefira concursos vivos:** com edital publicado, inscrições abertas ou prova marcada.
   Concursos `previsto` só se forem grandes e muito aguardados.
7. **Dados de 2026 em diante.** Nada de edital vencido.

## Entrega

- Um arquivo `.json` por lote, com no máximo **80 itens** por arquivo.
- Nome do arquivo: `papirando_lote_<NN>_<tema>_<AAAA_MM_DD>.json`
  (ex.: `papirando_lote_04_tribunais_2026_08_02.json`).
- **Antes de entregar, valide:** o arquivo faz `JSON.parse` sem erro; todo item tem `nome`,
  `tipo` válido, `banca`, `status_concurso` válido e `edital_url`; toda `prova_data` casa com
  `^\d{4}-\d{2}-\d{2}$`; `etapas_tags` e `taf_itens` são arrays (nunca string).
- No fim, escreva um resumo curto: quantos itens, quais órgãos, e **quais itens ficaram com
  campos faltando** (pra revisão manual).

## Se você tem acesso ao repositório

Você pode e deve rodar o pipeline você mesmo, em vez de só entregar o JSON:

1. Salve o JSON em `scratchpad/` (não em `Downloads`, não em `src/`).
2. Crie `scripts/validate_catalog_json.mjs` se ele ainda não existir: um validador que lê um
   ou mais JSONs e falha listando, por item, o que está fora da spec acima (`tipo` inválido,
   `status_concurso` inválido, `prova_data` fora de `YYYY-MM-DD`, `edital_url` ausente,
   `etapas_tags`/`taf_itens` que não são array, `disciplinas` vazio). Sem dependências novas.
3. Rode o validador. Conserte o JSON até passar limpo.
4. Rode o gerador que **já existe** — não reescreva, não "melhore":
   `CATALOG_FILES="<caminho do json>" node scripts/gen_catalog_drafts_sql.mjs`
5. Entregue: o JSON, o SQL gerado e a saída do validador.

**Limites (não negociáveis):**

- **Não toque em `src/`, `api/`, `supabase/migrations/`.** Seu escopo é `scripts/` e os dados.
- **Não altere `scripts/gen_catalog_drafts_sql.mjs`.** Ele já está validado contra o schema de
  produção. Se algo não encaixa, ajuste o JSON, não o gerador — e avise no resumo.
- **Não rode SQL em banco nenhum.** Você entrega o arquivo `.sql`; quem aplica em produção é o
  dono do projeto.
- **Não instale dependências** nem adicione libs de scraping ao `package.json`.
- Trabalhe em uma branch separada (ex.: `catalogo/lote-04`), nunca commitando na `master`.

## Lote pedido agora

<!-- edite esta seção a cada pedido -->
Lote 04 — Tribunais (TJ, TRF, TRT, TRE) com edital publicado ou inscrições abertas em 2026.
Meta: 40 a 60 itens.

--- FIM DO PROMPT ---

---

## O que fazer com o JSON que voltar

1. Salve o(s) arquivo(s) em `C:\Users\lucas\Downloads`.

2. Gere o SQL (o script marca tudo como rascunho `is_public=false`, então nada aparece
   pro usuário antes de você aprovar):

```bash
CATALOG_FILES="C:/Users/lucas/Downloads/papirando_lote_04_tribunais_2026_08_02.json" node scripts/gen_catalog_drafts_sql.mjs
```

3. Rode o SQL no banco de produção via Management API (o `on conflict (slug) do nothing`
   protege contra duplicata — pode rodar duas vezes sem estragar nada).

4. Abra o admin → Concursos → aba **Rascunhos** e publique o que estiver bom.

## Por que rascunho e não publicado direto

O dado vem de raspagem: nome de banca errado, vaga desatualizada e conteúdo programático
incompleto acontecem. A fila de rascunhos é a rede de proteção — e é ela que a camada de
correção comunitária vai ajudar a esvaziar depois.
