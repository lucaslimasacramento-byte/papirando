# Teste de extração de PDF de editais — 2026-09-15

Feito para decidir se a aposta do catálogo N1 se sustenta: se o aluno sobe o edital e a IA
monta o plano, a qualidade da extração de PDF é o gargalo. O medo registrado em
[CATALOGO-ESTRATEGIA.md](CATALOGO-ESTRATEGIA.md) era esse — o caso do TJSC, PDF de 1,3 MB
que voltou parcialmente ilegível.

Reproduzir: `node scripts/testar-extracao-edital.mjs <pasta-com-pdfs>`.
O script copia a rotina de extração de [`src/pages/Planos.jsx`](../src/pages/Planos.jsx) e o
`MIN_EDITAL_CHARS` de [`src/pages/Edital.jsx`](../src/pages/Edital.jsx), para medir o app e
não uma implementação paralela.

## Amostra

16 PDFs baixados de domínio oficial (órgão ou banca), todos de 2026, via busca aberta.
Bancas e operadores cobertos: Cebraspe (2), Instituto AOCP (3), Fundatec (2), IBFC (1),
Instituto Verbena/UFG (1), INEPAM (1), Selecao.net (1), prefeituras com banca própria (2).
Porte: de câmara municipal de 29 páginas a edital de 207 páginas.

**3 dos 16 não eram edital de abertura** — eram comunicado de recurso, convocação e
resultado, apesar de a URL e o título dizerem "edital". Ficaram de fora da conta;
o fato em si é um achado (ver risco 3). Restaram **13 editais de abertura**.

## Resultado

| medida | resultado |
|---|---|
| Texto extraído legível | **13/13** |
| Conteúdo programático presente e localizável no mesmo PDF | **13/13** |
| Campos de catálogo presentes (vagas, cargos, remuneração, taxa, escolaridade, cronograma) | **13/13, nenhum ausente** |
| PDF escaneado / ilegível | **0/13** |

Densidade de texto entre 2.713 e 5.765 caracteres por página — todos born-digital, nenhum
perto do piso de 200 c/pg que indicaria PDF-imagem. **O medo do PDF ilegível não se
confirmou nesta amostra.** A extração via pdfjs que já está no app dá conta.

## O achado que importa: o problema não é o PDF, é o corte de texto

O conteúdo programático fica **sempre na metade final do edital** — começa entre 51% e 97%
do documento, o que em caractere significa entre a posição 81.088 e 545.060.

E o backend corta o texto antes de mandar para a IA:

| corte | onde | conteúdo programático chega ao modelo |
|---|---|---|
| `text.slice(0, 24000)` | [`api/_ai.js`](../api/_ai.js) → `analyzeEdital()` — **caminho de produção** | **0 de 13** |
| `prepareEditalText()`, 120.000 | [`ai-server.mjs`](../ai-server.mjs) — dev, porta 8787 | 4 de 13 |

Em produção a IA recebe os primeiros 24.000 caracteres do edital, que são capa, sumário e
regras de inscrição. **Ela nunca vê as disciplinas.** É por isso que a análise volta com
cargo e data preenchidos e conteúdo pobre — não é o modelo errando, é o texto não chegando.

`resolveAiBaseUrl()` ([`src/lib/aiRuntime.js`](../src/lib/aiRuntime.js)) devolve string vazia
sem `VITE_AI_SERVER_URL`, então o app chama `/api/ai/analyze-edital` relativo, que na Vercel
cai em `api/ai.js` → `api/_ai.js`. O caminho de produção é o de 24.000.

Dois defeitos menores no caminho de dev, no mesmo lugar:

- O `keywordRegex` de `prepareEditalText` procura `conteudo programatico` e
  `objetos de avaliacao` **sem acento**, contra texto acentuado. Não casa em nenhum dos 13.
- Mesmo quando a fatia intermediária é montada, a linha de disciplina
  (`Língua Portuguesa: ...`) sobrevive em só 2 dos 13 — ela não bate em nenhuma palavra-chave
  da lista.

## Vocabulário: cada banca chama de um nome

Descoberto ao investigar quatro "falsos ausentes". Uma busca por "conteúdo programático"
erra em quase metade dos editais:

| banca / operador | como o anexo se chama |
|---|---|
| Cebraspe | `DOS OBJETOS DE AVALIAÇÃO (HABILIDADES E CONHECIMENTOS)` |
| Fundatec | `ANEXO IX – PROGRAMAS – PROVA BASE` / `ANEXO X – PROGRAMAS – CONHECIMENTOS ESPECÍFICOS` |
| AOCP, IBFC, Verbena, INEPAM, prefeituras | `CONTEÚDO(S) PROGRAMÁTICO(S)` |

A regex `RE_CONTEUDO` do script cobre as três formas e é o ponto único a estender quando
aparecer uma quarta.

## Riscos medidos

1. **Custo por análise.** Mediana de ~83.000 tokens por edital, máximo ~160.000. Mandar o
   edital inteiro resolve o corte mas multiplica o custo por análise, e 3 dos 13 passam de
   100k tokens. O caminho barato é recortar o anexo (o `acharCabecalhoConteudo` do script
   faz isso) e mandar só ele: de 83k para ~15–40k tokens, com o pedaço certo dentro.
2. **Letter-spacing.** pdfjs junta glifo a glifo com espaço, então título espaçado vira
   `E D I T A L`. A normalização que desfaz isso é lossy — colou palavras em
   `ANEXOII - DOCONTEÚDOPROGRAMÁTICO`. Serve para localizar seção, não para compor o texto
   que vai à IA. Mandar para o modelo o trecho **bruto**, e usar o normalizado só para achar
   o offset.
3. **~19% dos links "de edital" não são o edital de abertura** (3 de 16). São comunicado,
   retificação ou resultado. Isso vale para o `edital_url` do catálogo e para o upload do
   aluno: precisa de uma checagem de sanidade (tamanho mínimo + presença dos campos) antes de
   chamar a IA, senão o aluno sobe um comunicado de 1 página e recebe um plano vazio sem
   entender por quê.
4. **Retificação muda o conteúdo.** `pmcgs_selecao_net` está marcado "RETIFICADO EM
   14.05.2026" no cabeçalho. O plano montado a partir de um edital carrega a versão daquele
   PDF, e a retificação seguinte não chega a quem já montou. É o que a regra de validade
   (`vence_em`) tem que cobrir.

## Limites deste teste

- **Nenhum PDF escaneado caiu na amostra.** Os 13 são born-digital. O caso TJSC do
  `CATALOGO-ESTRATEGIA.md` não foi reproduzido — não dá para dizer que PDF-imagem deixou de
  existir, só que não apareceu em 13 editais de 2026 de 8 operadores diferentes. O tratamento
  de erro de `Edital.jsx:138` continua necessário.
- **A contagem de disciplinas do script é um piso grosseiro**, feita por heurística de caixa
  alta e `Disciplina: tópicos`. Ela conta ruído junto (nome de cargo, `ANEXO IV`,
  `ASSINATURA`). Serve para responder "a seção tem estrutura?", não para medir qualidade de
  estruturação — quem estrutura é a IA, e isso é o próximo teste.
- **Não foi medida a qualidade da saída da IA**, porque o corte de 24.000 torna a medição sem
  sentido enquanto não for corrigido.

## Conclusão para a decisão do N1

A aposta se sustenta: o insumo existe e é legível em 13 de 13 editais reais. O que está
quebrado é uma linha de corte no backend, não o pipeline de PDF.

Ordem sugerida: corrigir o corte (recortando o anexo em vez de aumentar o limite), colocar a
checagem de sanidade do documento, e só então medir a qualidade da estruturação da IA.

---

# Correção aplicada — 2026-09-15

O recorte passou a ser por **posição do anexo**, não por tamanho do começo.
Implementado em [`api/_edital-text.js`](../api/_edital-text.js) e usado pelos dois backends
(`api/_ai.js` em produção, `ai-server.mjs` em dev), que antes cortavam cada um do seu jeito.

Regra: acha a linha do cabeçalho do anexo de conteúdo programático (nos três vocabulários de
banca) e monta **cabeçalho de identificação + anexo**, jogando fora o miolo de regras de
inscrição. O cabeçalho vai junto porque a análise também devolve concurso, órgão, banca,
cargos e datas — mandar só o anexo perderia esses campos.

A detecção roda linha a linha sobre uma cópia normalizada e o recorte sai sempre do texto
original: a normalização que desfaz o letter-spacing do pdfjs é lossy e cola palavras.

## Antes e depois, nos mesmos 13 editais

| | antes (`slice(0, 24000)`) | depois |
|---|---|---|
| Anexo presente no texto enviado à IA | **1/13** | **13/13** |
| Disciplinas identificáveis (soma) | 214 | 893 |
| Caracteres enviados (mediana) | 24.000 (~6.9k tokens) | 89.659 (~26k tokens) |

O único "1/13" do antes é falso positivo do medidor: era a linha de sumário do
`pref_minacu_verbena`, não o anexo — as disciplinas visíveis ali eram 4, contra 35 depois.

**O custo por análise sobe ~3,7× em relação ao corte antigo** — que é um custo que não
comprava nada, já que o plano voltava vazio. Contra a alternativa de mandar o edital inteiro
(~83k tokens), o recorte é ~3,2× mais barato. `CHARS_TOTAL` em `api/_edital-text.js` é o botão:
baixar para 60.000 leva a mediana para ~17k tokens, ao preço de mandar o anexo inteiro em só
4 dos 13.

## O que ficou de fora

- **3 de 13 ainda truncam o anexo** (IFC/Fundatec, SAEB/AOCP, Sta. Isabel/INEPAM): o anexo
  deles tem de 131k a 210k caracteres porque lista o conteúdo de dezenas de cargos. Aumentar o
  orçamento é remédio caro e parcial — o certo é recortar **só o cargo que o aluno escolheu**,
  o que exige duas passadas (primeiro identificar o cargo, depois recortar). Fica para quando
  a tela do aluno souber o cargo antes da análise.
- **`pareceEdital` está exposto mas não é usado por ninguém ainda.** É a checagem de sanidade
  do risco 3 (documento curto demais para ser edital de abertura). Ligar em `Edital.jsx` para
  avisar o aluno antes de gastar uma análise.
- **A qualidade da estruturação da IA continua não medida.** Agora é possível medir, que era o
  ponto de fazer esta correção primeiro.

Regressão coberta em [`api/_edital-text.test.js`](../api/_edital-text.test.js) (11 testes):
os três vocabulários de banca, a armadilha do sumário, o letter-spacing e os quatro modos de
recorte.
