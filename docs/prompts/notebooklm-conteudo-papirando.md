# Prompts NotebookLM → Conteúdo Papirando

Fluxo: **1 notebook por matéria** → configurar a conversa (Prompt 0) → gerar a trilha (Prompt 1) →
para cada tópico rodar os Prompts 2, 3 e 4 → salvar cada JSON em `conteudo/<materia>/<slug>.<parte>.json`
→ importador grava como rascunho → revisão no admin → publicar.

Dicas de uso no NotebookLM:
- Configurar conversa → Estilo **Personalizado** (colar o Prompt 0) e Tamanho **Mais longas**.
- **Um tópico por mensagem.** JSON grande demais é cortado; se cortar, peça o tópico de novo, não "continue".
- Substitua `{{...}}` antes de enviar.

---

## Prompt 0 — Instruções fixas do notebook (Configurar conversa → Personalizado)

```
Você é o redator-chefe do Papirando, plataforma brasileira de estudos para concursos e vestibulares. Você produz material ORIGINAL usando as fontes do notebook como base factual.

REGRAS DE FONTE
1. Hierarquia de confiança: Constituição, leis, súmulas e julgados > doutrina > apostilas de curso.
2. Apostilas, resumos e mapas mentais de cursos servem apenas para conferir fatos e cobertura. NUNCA copie frases, exemplos, tabelas, esquemas, mnemônicos ou questões deles. Reescreva com palavras, ordem e estrutura próprias. Nunca mencione nome de curso, professor de cursinho ou marca.
3. Texto de lei, súmula e enunciado de tese pode ser transcrito literalmente, sempre com o dispositivo exato.
4. Doutrinador: no máximo uma frase curta citada, com o nome do autor.
5. Se as fontes não sustentam uma afirmação, não invente: registre em "pendencias".
6. Entendimentos de 2023 em diante devem ser marcados como novidade, com o julgado. Atenção especial: ADI 2135 (fim da obrigatoriedade do Regime Jurídico Único), Lei 14.133/2021, Lei 14.230/2021 (improbidade), Lei 13.303/2016 (estatais).
7. Diferencie "exceção à publicidade" de "exceção ao sigilo", "legalidade" de "reserva legal", "órgão" de "entidade". Precisão terminológica é obrigatória.

QUESTÕES
- Todas são inéditas. Nunca diga ou sugira que vieram de prova real. Use o rótulo "Inédita Papirando – estilo <banca>".
- Nunca diga que uma assertiva é "reprodução exata" de um artigo se não for literal.

TOM
- Direto, didático, frases curtas, falando com o aluno ("você").
- Proibido: "exaustivo", "alta densidade", "completo", "100%", promessas de cobertura, "Direitos Reservados".
- O conteúdo entregue deve corresponder exatamente ao que o título e o sumário prometem.

FORMATO
- Quando eu pedir JSON: responda SOMENTE com JSON válido. Sem ```, sem texto antes ou depois, sem comentários, aspas duplas, sem vírgula sobrando.
- Dentro de strings, o único markdown permitido é **negrito**.
```

---

## Prompt 1 — Trilha da matéria x edital (rodar 1 vez por matéria)

```
Gere a trilha de {{MATERIA}} para o concurso {{CONCURSO}}, usando o conteúdo programático do edital que está nas fontes. Cada tópico deve ser uma unidade estudável em 20–40 minutos. Seja honesto sobre a cobertura das fontes: marque "parcial" ou "sem_fonte" sempre que faltar material.

Responda SOMENTE com JSON neste formato:
{
  "schema": "papirando.trilha.v1",
  "materia": "{{MATERIA}}",
  "concurso": "{{CONCURSO}}",
  "topicos": [
    {
      "ordem": 1,
      "slug": "principios-expressos",
      "titulo": "Princípios expressos (art. 37, caput)",
      "edital_ref": "trecho literal do edital que este tópico cobre",
      "subtopicos": ["Legalidade", "Impessoalidade"],
      "fontes": ["nome exato da fonte no notebook"],
      "cobertura": "completa | parcial | sem_fonte",
      "incidencia": "alta | media | baixa"
    }
  ],
  "lacunas": ["itens do edital sem fonte suficiente no notebook"]
}
```

---

## Prompt 2 — Aula do tópico (camada "completa")

```
Escreva a AULA do tópico "{{TITULO}}" (slug {{SLUG}}) de {{MATERIA}}, foco {{CONCURSO}}, banca {{BANCA}}. Cubra todos estes subtópicos e nada além: {{SUBTOPICOS}}.
Extensão: 1.200 a 2.000 palavras. Use os blocos abaixo; varie (tabela quando houver comparação, lei quando citar dispositivo, pegadinha quando a banca costuma explorar).

Responda SOMENTE com JSON:
{
  "schema": "papirando.aula.v1",
  "slug": "{{SLUG}}",
  "titulo": "{{TITULO}}",
  "objetivos": ["Ao final você sabe ..."],
  "tempo_estimado_min": 30,
  "blocos": [
    {"tipo": "titulo", "texto": "..."},
    {"tipo": "paragrafo", "texto": "..."},
    {"tipo": "lista", "itens": ["..."]},
    {"tipo": "tabela", "titulo": "...", "colunas": ["...", "..."], "linhas": [["...", "..."]]},
    {"tipo": "lei", "dispositivo": "CF/88, art. 37, caput", "texto": "transcrição literal"},
    {"tipo": "jurisprudencia", "tribunal": "STF", "referencia": "Súmula Vinculante 13", "tese": "paráfrase fiel"},
    {"tipo": "atencao", "texto": "..."},
    {"tipo": "pegadinha", "texto": "como a banca tenta enganar e como reconhecer"},
    {"tipo": "mnemonico", "sigla": "...", "explicacao": "..."},
    {"tipo": "novidade", "texto": "...", "referencia": "julgado/lei e ano"},
    {"tipo": "exemplo", "texto": "caso concreto curto"}
  ],
  "dispositivos_citados": ["CF/88, art. 37"],
  "pendencias": ["afirmações que precisam de conferência humana"]
}
```

---

## Prompt 3 — Resumo, Véspera e Mapa mental do tópico

```
Para o tópico "{{TITULO}}" (slug {{SLUG}}), gere as 3 camadas de revisão, coerentes com a aula, mas com redação própria (não copie frases da aula).
- resumo: 300 a 500 palavras, mesmos tipos de bloco da aula.
- vespera: 6 a 10 itens de uma linha, só o que mais cai, cada um com o tipo.
- mapa: árvore com no máximo 3 níveis e 4 a 7 ramos principais, textos de até 6 palavras.

Responda SOMENTE com JSON:
{
  "schema": "papirando.revisao.v1",
  "slug": "{{SLUG}}",
  "resumo": {"blocos": []},
  "vespera": [
    {"tipo": "regra | pegadinha | mnemonico | prazo | numero | jurisprudencia", "texto": "..."}
  ],
  "mapa": {
    "raiz": "{{TITULO}}",
    "nos": [{"texto": "...", "filhos": [{"texto": "...", "filhos": []}]}]
  }
}
```

---

## Prompt 4 — Prática: flashcards e questões

```
Para o tópico "{{TITULO}}" (slug {{SLUG}}), crie a prática.
- 12 flashcards: frente com pergunta objetiva (não "explique..."); verso com até 40 palavras.
- 10 questões inéditas: 6 certo/errado estilo {{BANCA}} e 4 de múltipla escolha (5 alternativas, A–E). Distribua: 3 fáceis, 5 médias, 2 difíceis. Cada questão errada deve explorar uma pegadinha real do tema e a explicação diz qual.
- Equilibre gabaritos (C e E perto de 50%; letras corretas variadas).

Responda SOMENTE com JSON:
{
  "schema": "papirando.pratica.v1",
  "slug": "{{SLUG}}",
  "flashcards": [
    {"front": "...", "back": "...", "fundamento": "CF/88, art. 37, §1º"}
  ],
  "questoes": [
    {
      "tipo": "certo_errado",
      "rotulo": "Inédita Papirando – estilo {{BANCA}}",
      "enunciado": "...",
      "alternativas": [],
      "gabarito": "C",
      "explicacao": "por que está certa/errada, em até 80 palavras",
      "fundamento": "dispositivo ou julgado",
      "pegadinha": "o que a questão tenta confundir (ou null)",
      "dificuldade": "Facil | Media | Dificil"
    },
    {
      "tipo": "multipla_escolha",
      "rotulo": "Inédita Papirando – estilo FGV",
      "enunciado": "...",
      "alternativas": [
        {"id": "A", "label": "...", "isCorrect": false},
        {"id": "B", "label": "...", "isCorrect": true},
        {"id": "C", "label": "...", "isCorrect": false},
        {"id": "D", "label": "...", "isCorrect": false},
        {"id": "E", "label": "...", "isCorrect": false}
      ],
      "gabarito": "B",
      "explicacao": "por que a correta está certa e o erro de cada incorreta",
      "fundamento": "...",
      "pegadinha": null,
      "dificuldade": "Media"
    }
  ]
}
```

---

## Mapeamento para o banco

| JSON | Destino |
|---|---|
| `papirando.trilha.v1` | `contest_template_subjects` / `contest_template_topics` (ou trilha da matéria) |
| `papirando.aula.v1` + `papirando.revisao.v1` | nova tabela de conteúdo oficial por tópico (a criar) |
| `pratica.flashcards` | decks oficiais (a criar: deck público clonável) |
| `pratica.questoes` | `questions` (`tipo`, `enunciado`, `alternativas`, `gabarito`, `explicacao`, `dificuldade`, `topico` = slug, `banca` = "Papirando (inédita)") |
