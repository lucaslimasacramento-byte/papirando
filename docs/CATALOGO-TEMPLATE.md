# Template do Catálogo — Concursos / Vestibulares / Faculdades

Base para preencher (com outra IA) e devolver ao Claude popular no banco.
Formato: **JSON** — um objeto por item. Cada item vira 1 linha em `contest_templates`
+ suas disciplinas (`contest_template_subjects`) + tópicos (`contest_template_topics`).

## Estrutura de cada item

```json
{
  "tipo": "concurso | vestibular | faculdade",   // OBRIGATÓRIO
  "nome": "PMBA",                                  // OBRIGATÓRIO — nome curto/sigla
  "area": "Policial",                              // OBRIGATÓRIO — categoria (ver enums)
  "banca": "FGV",                                  // organizador (banca / INEP / instituição)
  "cargo": "Soldado",                              // cargo (concurso) | curso (faculdade: "Medicina") | "" (vestibular)
  "status_concurso": "previsto",                   // ver enums (use "previsto" se não souber)
  "prova_data": "2026-09-20",                      // "AAAA-MM-DD" ou null
  "escolaridade": "Nível médio",                   // Nível médio | Nível superior | Nível fundamental | ""
  "salario": "R$ 4.012,11",                        // só concurso; "" nos outros
  "inscricao_valor": "R$ 90,00",                   // opcional
  "vagas": "2000",                                 // opcional (texto)
  "lotacao": "Bahia",                              // opcional
  "etapas": "Prova objetiva, TAF, investigação",   // opcional (texto livre)
  "edital_url": "https://...",                     // opcional
  "descricao": "Resumo de 1 linha.",               // opcional
  "imagem_url": "",                                // deixe "" — logo a gente sobe depois
  "disciplinas": [                                  // edital verticalizado (pode deixar [] se não tiver)
    {
      "nome": "Língua Portuguesa",
      "topicos": ["Interpretação de texto", "Crase", "Concordância verbal", "Regência"]
    },
    {
      "nome": "Direito Constitucional",
      "topicos": ["Direitos fundamentais", "Organização do Estado", "Controle de constitucionalidade"]
    }
  ]
}
```

## Enums (use exatamente esses valores)

- **tipo:** `concurso` · `vestibular` · `faculdade`
- **area (com cor própria):** `Policial` · `Militar` · `Fiscal` · `Tribunais` · `Saude`
  - outras áreas funcionam (cor neutra). Sugestões: `Administrativa`, `Bancária`, `Educação`, `Jurídica`, `Vestibular`, `Engenharia`, `Medicina`, `Direito`, `Exatas`, `Humanas`.
- **status_concurso:** `previsto` · `autorizado` · `comissao_formada` · `banca_em_definicao` · `banca_definida` · `edital_iminente` · `edital_publicado` · `inscricoes_abertas` · `prova_marcada` · `em_andamento` · `homologado`
- **escolaridade:** `Nível fundamental` · `Nível médio` · `Nível superior` · `` (vazio)

## Como cada TIPO se preenche

- **concurso:** todos os campos fazem sentido (cargo, salário, banca, status, etapas, TAF…).
- **vestibular:** `cargo` = "" ; `salario` = "" ; `banca` = organizador (ex: INEP/Fuvest/Comvest) ; `area` = "Vestibular" (ou o estado) ; `disciplinas` = matérias da prova.
- **faculdade:** `cargo` = nome do curso (ex: "Medicina") ; `banca` = instituição (ex: "UFBA") ; `area` = área do curso (ex: "Saúde"/"Engenharia") ; `salario` = "".

## Exemplos prontos (1 de cada tipo)

```json
[
  {
    "tipo": "concurso",
    "nome": "Receita Federal",
    "area": "Fiscal",
    "banca": "FGV",
    "cargo": "Auditor-Fiscal",
    "status_concurso": "edital_publicado",
    "prova_data": "2026-08-10",
    "escolaridade": "Nível superior",
    "salario": "R$ 22.921,71",
    "vagas": "230",
    "disciplinas": [
      { "nome": "Língua Portuguesa", "topicos": ["Interpretação de texto", "Redação oficial"] },
      { "nome": "Direito Tributário", "topicos": ["Tributos", "Obrigação tributária", "Crédito tributário"] }
    ]
  },
  {
    "tipo": "vestibular",
    "nome": "ENEM",
    "area": "Vestibular",
    "banca": "INEP",
    "cargo": "",
    "status_concurso": "inscricoes_abertas",
    "prova_data": "2026-11-08",
    "escolaridade": "Nível médio",
    "salario": "",
    "disciplinas": [
      { "nome": "Matemática", "topicos": ["Funções", "Geometria", "Probabilidade"] },
      { "nome": "Linguagens", "topicos": ["Interpretação", "Literatura", "Inglês/Espanhol"] }
    ]
  },
  {
    "tipo": "faculdade",
    "nome": "UFBA — Medicina",
    "area": "Saude",
    "banca": "UFBA",
    "cargo": "Medicina",
    "status_concurso": "previsto",
    "prova_data": null,
    "escolaridade": "Nível superior",
    "salario": "",
    "disciplinas": []
  }
]
```

## Instrução pra outra IA (cole junto)

> "Preencha um array JSON seguindo EXATAMENTE este schema e estes enums. Um objeto por
> concurso/vestibular/faculdade. Use só os valores de enum indicados. Datas em AAAA-MM-DD ou null.
> Não invente campos novos. Para `disciplinas`, gere o edital verticalizado real (matérias e tópicos)
> quando souber; se não souber, deixe `[]`. Não preencha `imagem_url` (deixe "")."

Devolva o JSON preenchido ao Claude — ele converte em SQL e popula
`contest_templates` + `contest_template_subjects` + `contest_template_topics`.
