---
name: questoes
description: Decodifica um lote de questões bruto — export do TEC, resposta da API do ENEM, texto de PDF, planilha, foto transcrita — e entrega tudo no padrão do banco do Papirando, com gabarito conferido, disciplina escrita por extenso e comentário explicando a resposta. Use sempre que o usuário mandar questões para adicionar ao banco, pedir para organizar/padronizar questões que já existem, ou reclamar de questão sem comentário, sem gabarito ou com nome de matéria errado.
---

# Questões — do lote bruto ao banco

O banco de questões do Papirando é uma tabela só: `public.questions`. Qualquer fonte que
chegue tem de virar linhas dessa tabela, e esta skill é o caminho único para isso.

Três regras fecham o assunto:

1. **O padrão tem uma definição só**: `src/lib/padraoDaQuestao.js`. Não escreva um
   normalizador novo — adicione um leitor para a fonte nova e chame `normalizarQuestao`.
2. **Gabarito errado é pior do que questão ausente.** Uma questão que marca a alternativa
   errada faz o aluno estudar o conteúdo errado e desconfiar do banco inteiro.
3. **Toda questão precisa de comentário.** Sem explicação a questão corrige, mas não ensina.

## De onde as questões vêm hoje

| Fonte | Como entra | Estado |
|---|---|---|
| **api.enem.dev** | `src/services/importQuestions.ts` → `importEnemYear(ano)` / `importAllEnemYears()`. ENEM 2009–2023. | É de onde veio a maior parte do banco. Traz enunciado, alternativas e gabarito — **e nenhum comentário**. A disciplina vem em slug (`matematica`) e o enunciado em markdown, com a figura como `![](url)` no meio da frase. |
| **Export do TEC** | Colagem em Admin → Colar questões (`src/pages/AdminQuestoesColar.jsx`), leitor em `src/lib/questoesColadas.js`. | Texto com rótulos em caixa alta e `=====` entre questões. Costuma vir sem gabarito e com `[Mesmo texto da Questão N]`. |
| **opentdb** | `normalizeOpenTriviaQuestion` em `src/services/questionsApi.ts`. | Legado. Não importe mais: é trivia em inglês, não questão de prova. |
| **PDF / foto / planilha** | Não há leitor pronto. Transcreva para um dos formatos acima e siga o fluxo. | — |

O que o app já conserta sozinho na hora de mostrar, sem precisar mexer no banco:

- `src/lib/rotuloDaDisciplina.js` — `matematica` vira `Matemática` na tela.
- `src/lib/textoDaQuestao.js` — tira a figura do meio da frase e a transforma em bloco.
- `src/lib/comentarioDaQuestao.js` — gera o comentário que falta na primeira vez que um
  aluno abre a questão, e guarda em `question_comments` para todo mundo depois.

Isso significa que **uma questão sem comentário não está quebrada** — mas um lote que chega
já com comentário é melhor: sai de graça para o aluno e não depende do humor do modelo.

## O fluxo

### 1. Rode a ferramenta

```bash
node .claude/skills/questoes/padronizar.mjs <arquivo>          # JSON padronizado na saída
node .claude/skills/questoes/padronizar.mjs <arquivo> --sql    # SQL pronto para o Supabase
cat lote.txt | node .claude/skills/questoes/padronizar.mjs --formato tec
```

O formato é adivinhado pelo conteúdo (`tec`, `enem`, `json`); `--formato` força.
O relatório sai em **stderr**, então redirecionar a saída não o suja:

```
questões lidas:        10
prontas para o banco:   9
sem comentário:         9  (o app gera na primeira abertura)
bloqueadas:             1
  - 1234568: falta gabarito
```

### 2. Resolva o que está bloqueado

`impedem` é o que trava a gravação: enunciado, alternativas, gabarito ausente, ou gabarito
que não corresponde a nenhuma alternativa. **Não invente gabarito.** Se o lote veio sem,
pergunte ao usuário ou busque na fonte oficial; questão com gabarito chutado é exatamente o
defeito da regra 2.

`avisos` não trava nada: disciplina vazia, comentário ausente, `external_id` ausente. O
`external_id` merece atenção — sem ele, recolar o mesmo lote **duplica** em vez de atualizar.

### 3. Preencha o que só um modelo preenche

Para cada questão, escreva no campo correspondente:

- **`explicacao`** — por que o gabarito está certo **e** por que as outras não servem. Duas a
  quatro frases, em português do Brasil, na segunda pessoa ("você"). Cite o artigo, a lei ou a
  fórmula quando houver. Nada de "a alternativa B está correta" e ponto.
- **`topico`** — o assunto dentro da matéria ("Concordância Verbal", não "Gramática").
- **`dificuldade`** — `Facil`, `Media` ou `Dificil`.

Ao mexer no JSON, rode a ferramenta de novo sobre o arquivo editado: ela reconcilia gabarito
com alternativa e confere o resto.

### 4. Grave

Duas saídas, ambas idempotentes por `(source, external_id)`:

- **`--sql`** → cole no editor SQL do Supabase. É o caminho do lote grande.
- **JSON** → entregue para o usuário colar em Admin → Colar questões, se ele preferir
  conferir na tela antes.

O `on conflict` atualiza tudo **menos** o comentário quando o lote novo vem sem comentário —
senão uma reimportação apagaria explicações que já existiam.

## Fazer isso em escala

Se o pedido for "comentar todas as questões que estão sem comentário", não gere nada aqui:
o caminho é o do app. `src/lib/comentarioDaQuestao.js` já faz a geração sob demanda, com
cache compartilhado em `question_comments` (migração
`supabase/migrations/202610120001_comentarios_das_questoes.sql`). Gerar milhares de
comentários de uma vez custa caro e envelhece junto com o modelo.

Se mesmo assim for para fazer em lote, faça por recorte — uma disciplina, um ano — e sempre
escrevendo em `question_comments`, nunca sobrescrevendo `questions.explicacao`, que é o
campo curado.

## Armadilhas conhecidas

- **`[Mesmo texto da Questão N]`** — o TEC não repete o texto-base. `lerLote` já costura, mas
  só dentro do mesmo lote: se a questão 7 referencia a 3 e a 3 ficou de fora da colagem, o
  enunciado sai incompleto. Confira antes de gravar.
- **`GABARITO: (não disponível)`** — o export do TEC traz isso com frequência. É bloqueio, não
  aviso.
- **Figura dentro da alternativa** — comum em matemática do ENEM. Mantenha o `![](url)` no
  `label`: `textoDaAlternativa` separa na hora de mostrar.
- **Markdown no enunciado fica como está.** Não "limpe" o enunciado tirando as imagens: sem o
  gráfico a questão de estatística não tem resposta.
- **Não mexa em `questions.explicacao` para corrigir texto gerado por IA.** Aquele campo é o
  conteúdo curado; o gerado vive em `question_comments`.
