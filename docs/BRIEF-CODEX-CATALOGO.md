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
| `status_concurso` | sim | Um de: `previsto`, `autorizado`, `comissao_formada`, `banca_em_definicao`, `banca_definida`, `edital_iminente`, `edital_publicado`, `inscricoes_abertas`, `prova_marcada`. **`em_andamento` e `homologado` são proibidos** — significam certame em curso ou encerrado |
| `prova_data` | não | **`YYYY-MM-DD` ou omitido**, e a prova precisa estar **pelo menos 60 dias no futuro** (ver regra 6). Outro formato vira nulo silenciosamente |
| `edital_url` | sim | URL direta do edital ou da página oficial. É a prova de que o dado é real |
| `descricao` | **sim** | 1–2 frases, mínimo 40 caracteres. É o texto do card no catálogo |
| `cor` | não | Hex `#RRGGBB`. Se não souber, omita |
| `disciplinas` | sim | Array, **mínimo 3 disciplinas** e **mínimo 10 tópicos em cada uma** (ver regra 5). Formato: `{ "nome": "...", "topicos": ["...", "..."] }` |

## Regras de conteúdo (importantes)

1. **Nunca invente.** Se não achou o dado, **omita o campo** ou use `null`. Um campo vazio é
   corrigível depois; um dado errado destrói a confiança do usuário e é invisível pra gente.
2. **Só fonte oficial.** Site do órgão, site da banca, diário oficial ou PDF do edital.
   Blog de cursinho serve só pra *encontrar* o edital, nunca como fonte do dado.
3. **`edital_url` é obrigatório.** Item sem link não entra.
4. **Não copie texto do edital.** De `disciplinas`/`topicos`, extraia apenas os **nomes** das
   matérias e dos tópicos do conteúdo programático — nada de parágrafos, ementas longas ou
   trechos transcritos.
5. **O conteúdo programático é o item mais importante da coleta — abra o anexo do edital.**
   Mínimo de **10 tópicos por disciplina**, na granularidade em que o edital lista
   (`"Direitos e garantias fundamentais"`, `"Controle de constitucionalidade"`, ...).
   Resumir a disciplina em 2 ou 3 tópicos genéricos **invalida o item**: é esse array que vira
   a trilha de estudo do aluno dentro do app. Se você não conseguiu abrir o PDF e ler o anexo,
   **não entregue o item** — reporte no resumo que a fonte não foi acessível.
6. **A prova tem que estar no futuro, com folga.** `prova_data` no mínimo **60 dias à frente**
   da data de hoje. Concurso cuja prova já aconteceu, ou acontece em duas semanas, é inútil
   para quem vai começar a estudar agora — não importa quão bem documentado esteja.
   Pelo mesmo motivo, `status_concurso` **nunca** pode ser `em_andamento` nem `homologado`.
7. **Um item por cargo**, não por edital. Se o edital tem 5 cargos com conteúdos diferentes,
   são 5 itens. Se os cargos compartilham exatamente o mesmo conteúdo, pode ser 1 item com o
   cargo mais representativo.
8. **Prefira editais recém-publicados**, com inscrições abertas ou a abrir. Concursos
   `previsto` só se forem grandes e muito aguardados.
9. **Nada de edital vencido.** Se ao pesquisar você só achar certames já aplicados, diga isso
   no resumo e entregue menos itens — não preencha cota com concurso morto.

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
2. **O validador já existe: `scripts/validate_catalog_json.mjs`.** Não reescreva.
   Ele checa tudo que está na spec acima, incluindo a janela de 60 dias e o mínimo de tópicos.
3. Rode `node scripts/validate_catalog_json.mjs <caminho do json>` e conserte o JSON até passar
   limpo. **Erro é bloqueio; aviso é informação.** Se você acha que uma regra está errada para
   um caso específico, diga no resumo — não afrouxe o validador para o seu lote passar.
4. Rode o gerador que **já existe** — não reescreva, não "melhore":
   `CATALOG_FILES="<caminho do json>" node scripts/gen_catalog_drafts_sql.mjs`
5. Entregue: o JSON, o SQL gerado e a saída do validador.

**Limites (não negociáveis):**

- **Não toque em `src/`, `api/`, `supabase/migrations/`.** Seu escopo é `scripts/` e os dados.
- **Não altere `scripts/gen_catalog_drafts_sql.mjs` nem `scripts/validate_catalog_json.mjs`.**
  Os dois já estão validados contra o schema de produção. Se algo não encaixa, ajuste o JSON,
  nunca as ferramentas — e avise no resumo.
- **Não rode SQL em banco nenhum.** Você entrega o arquivo `.sql`; quem aplica em produção é o
  dono do projeto.
- **Não instale dependências** nem adicione libs de scraping ao `package.json`.
- Trabalhe em uma branch separada (ex.: `catalogo/lote-04`), nunca commitando na `master`.

## Lote pedido agora

<!-- edite esta seção a cada pedido -->
Lote 05 — editais **recém-publicados**, com prova a partir de outubro de 2026 (de preferência
2027), em qualquer área: policial, fiscal, tribunais, bancária, saúde, educação.
Meta: 30 a 50 itens — mas **quantidade não vale nada aqui**. Prefiro 15 itens com o conteúdo
programático completo do que 50 rasos. Itens rasos são descartados na revisão.

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
