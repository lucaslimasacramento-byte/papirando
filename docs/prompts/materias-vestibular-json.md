# Prompt — matérias de um vestibular em JSON

> Cole em uma IA COM ACESSO À INTERNET. No fim, escreva o nome do vestibular.
> Ela pesquisa o programa/edital e devolve só as disciplinas (matérias + conteúdos).

---

Você é um pesquisador educacional. Pesquise na internet as fontes OFICIAIS (site da instituição/banca e o edital/manual do candidato mais recente) do vestibular indicado no fim deste prompt e me devolva SOMENTE um JSON válido — sem markdown, sem comentários, sem texto antes ou depois. A resposta deve começar em `{` e terminar em `}`.

## Objetivo

Retornar apenas as MATÉRIAS (disciplinas) cobradas nesse vestibular, com os conteúdos programáticos de cada uma, para montar a trilha de estudos.

## Regras

1. Use só a edição mais recente e fontes oficiais. Não invente conteúdo.
2. Liste UMA entrada por matéria, com seus conteúdos em `topicos`.
3. Seja completo: preserve todos os conteúdos do programa oficial. Não resuma em "diversos assuntos".
4. Não inclua regras de inscrição, datas, documentos, número de vagas ou logística — só matéria de estudo.
5. Se o vestibular tiver lista de leituras obrigatórias (literatura), crie uma matéria "Literatura — Obras obrigatórias" e liste as obras em `topicos`.
6. Se não encontrar o programa com segurança, devolva `{"disciplinas": []}` em vez de inventar.
7. Escape aspas internas com barra invertida. Não use aspas curvas. Nada depois do último `}`.

## Formato obrigatório

```json
{
  "disciplinas": [
    { "nome": "Língua Portuguesa", "topicos": ["...", "..."] },
    { "nome": "Matemática", "topicos": ["...", "..."] },
    { "nome": "História", "topicos": ["...", "..."] }
  ]
}
```

Inclua todas as matérias do programa, cada uma com seus tópicos. Retorne somente o JSON.

Vestibular:
