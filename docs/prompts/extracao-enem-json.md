# Prompt — extrair o ENEM (edital + Matriz de Referência) em JSON

> Cole em uma IA COM ACESSO À INTERNET (ChatGPT com busca, Gemini, Perplexity).
> Ela pesquisa as fontes oficiais e devolve um JSON único do ENEM, pronto para
> importar no catálogo do Papirando.

---

Você é um pesquisador educacional. Pesquise na internet as fontes OFICIAIS do INEP/MEC e me devolva SOMENTE um JSON válido (sem markdown, sem comentários, sem texto antes ou depois). A resposta deve começar em `{` e terminar em `}`.

## Objetivo

Gerar o cadastro ÚNICO do ENEM para a plataforma Papirando: cabeçalho (datas, inscrição) + trilha de estudos completa baseada na Matriz de Referência.

## Fontes (use só oficiais e a edição mais recente)

1. **Edital do ENEM** mais recente em gov.br/inep — para datas, inscrição e taxa.
2. **Matriz de Referência do ENEM** (INEP) — para o conteúdo das 4 áreas + a Redação. É de lá que sai a trilha de estudos (o edital não traz conteúdo programático).

## Regras obrigatórias

1. ENEM é UM só. NÃO separe por "PPL", "Digital", "Reaplicação" — o conteúdo é o mesmo; ignore essas variantes.
2. Use somente informação das fontes oficiais. Se não achar com segurança, deixe o campo como string vazia `""`. Não invente datas, taxa nem URL.
3. Datas no formato `YYYY-MM-DD`.
4. `edital_url` deve ser URL pura (sem markdown).
5. Preserve TODOS os objetos de conhecimento da Matriz como tópicos de estudo — seja completo, não resuma.
6. Não inclua regras de inscrição, documentos ou logística como tópico de estudo.
7. Escape aspas internas com barra invertida. Não use aspas curvas.
8. Não coloque nada depois do último `}` (sem fontes, sem notas, sem citações).

## Estrutura das disciplinas

- Crie UMA disciplina por matéria do ENEM, agrupada pela sua área de conhecimento (campo `area`).
- Em `topicos`, liste os objetos de conhecimento daquela matéria conforme a Matriz.
- A **Redação** é uma disciplina à parte, cujos tópicos são as 5 competências + a estrutura do texto.

Áreas e matérias esperadas:
- **Linguagens, Códigos e suas Tecnologias**: Língua Portuguesa, Literatura, Língua Estrangeira (Inglês/Espanhol), Artes, Educação Física, Tecnologias da Informação.
- **Ciências Humanas e suas Tecnologias**: História, Geografia, Filosofia, Sociologia.
- **Ciências da Natureza e suas Tecnologias**: Biologia, Física, Química.
- **Matemática e suas Tecnologias**: Matemática.
- **Redação**.

## Formato obrigatório (preencha com os dados reais que você pesquisar)

```json
{
  "tipo": "enem",
  "nome": "ENEM 2026",
  "concurso": "ENEM",
  "orgao": "Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira",
  "banca": "INEP",
  "area": "Múltiplas áreas",
  "scope": "nacional",
  "escolaridade": "Ensino médio completo",
  "edital_url": "",
  "inscricao_valor": "",
  "registration_start": "",
  "registration_end": "",
  "prova_data": "",
  "prova_data_dia2": "",
  "descricao": "Maior exame do país, usado para acesso ao ensino superior via SiSU, ProUni e Fies.",
  "disciplinas": [
    {
      "area": "Linguagens, Códigos e suas Tecnologias",
      "nome": "Língua Portuguesa",
      "topicos": ["...", "..."]
    },
    {
      "area": "Ciências Humanas e suas Tecnologias",
      "nome": "História",
      "topicos": ["...", "..."]
    },
    {
      "area": "Ciências da Natureza e suas Tecnologias",
      "nome": "Biologia",
      "topicos": ["...", "..."]
    },
    {
      "area": "Matemática e suas Tecnologias",
      "nome": "Matemática",
      "topicos": ["...", "..."]
    },
    {
      "area": "Redação",
      "nome": "Redação",
      "topicos": [
        "Competência 1 — Domínio da norma padrão da língua escrita",
        "Competência 2 — Compreensão da proposta e repertório sociocultural",
        "Competência 3 — Seleção e organização de argumentos",
        "Competência 4 — Mecanismos linguísticos de coesão",
        "Competência 5 — Proposta de intervenção respeitando os direitos humanos",
        "Estrutura do texto dissertativo-argumentativo"
      ]
    }
  ]
}
```

Inclua TODAS as matérias listadas acima (uma disciplina cada), com seus tópicos preenchidos a partir da Matriz de Referência. Retorne somente o JSON.
