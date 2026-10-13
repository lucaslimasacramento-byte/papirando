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

---

# Pacote completo — 2026-09-15

Decisões do dono nesta rodada: a plataforma inteira se monta a partir do edital que o aluno
sobe (um concurso só, no início); **leitura única** (a IA devolve todos os cargos e o aluno
escolhe na lista); **pacote completo** de extração; **tela de revisão** obrigatória antes de
o resultado virar o eixo do app; telas sem acervo viram **container do que o aluno sobe**.

## Duas passadas: testado e descartado

A ideia era uma primeira leitura barata só para listar os cargos, o aluno escolher, e uma
segunda leitura recortando o trecho daquele cargo. Resolveria os editais que truncam.

Não se sustenta: **localizar a tabela de cargos é 8/13**. A heurística de densidade de `R$`
acha a tabela em 8 editais e falha nos dois da Cebraspe (que declaram a remuneração uma vez,
em prosa: `REMUNERAÇÃO: R$ 6.858,78`), no `pref_catanduvas_pr` e em mais dois. Construir a
primeira passada em cima disso deixaria 5 de 13 alunos sem lista de cargos.

Fica a leitura única, como decidido. **Custo aceito:** 3 dos 13 editais continuam com o anexo
truncado — são os que listam dezenas de cargos (anexo de 131k a 210k caracteres).

## A janela que faltava: o quadro de provas

Investigando o pacote completo apareceu um buraco no recorte anterior. O quadro de provas —
quantas questões e que peso cada disciplina tem — **não fica nem no cabeçalho nem no anexo**:
nos 13 editais aparece entre 1,9% e 51,6% do documento, ou seja, no miolo de regras que o
recorte descartava. Só 2 dos 13 caíam dentro do cabeçalho.

Sem ele, todas as disciplinas parecem iguais e a plataforma não tem o que dizer sobre
prioridade. Com ele, dá para dizer que Conhecimentos Específicos vale 15 questões com peso 2,
metade dos pontos da prova.

Localizar exigiu dois sinais, porque só 4 dos 13 nomeiam a seção:

| sinal | cobertura |
|---|---|
| título explícito (`quadro demonstrativo de provas`, `composição das provas`) | 4/13 |
| seção numerada `DAS PROVAS` / `DAS PROVAS OBJETIVAS` / `DA ETAPA` | +7/13 |
| **combinados** | **11/13** |

Os 2 que a busca não localiza têm a composição dentro do cabeçalho ou do anexo, que já vão
no recorte. Resultado final: **composição presente no texto enviado em 13/13**, ao custo de
~26k tokens de mediana (era ~26k antes também — a janela do quadro coube no orçamento).

## Schema ampliado

`ANALYSIS_SCHEMA` (`ai-server.mjs`) e o prompt de produção (`api/_ai.js`) passaram a pedir,
além de disciplinas e tópicos:

- **por certame:** `inscricao_valor`, `etapas[]` (Objetiva, Discursiva, TAF, Títulos, Prática)
- **por cargo:** `vagas`, `salario`, `escolaridade`, `lotacao`, `carga_horaria`
- **por cargo:** `prova[]` — `{disciplina, questoes, peso}`, o quadro de provas

São exatamente os campos que `createCourse` (`src/App.jsx`) já carrega e que hoje vinham do
catálogo ou preenchidos à mão. O modelo do app já era edital-shaped; faltava a IA preencher.

**Granularidade de tópico** entrou no prompt como regra explícita: quebrar o bloco da
disciplina em tópicos separados, mirando 8 a 15 por disciplina. Sem isso cada edital gera uma
estrutura diferente — fino demais intimida, grosso demais faz a barra de progresso não andar.
O número é um chute calibrado, não medido; é o primeiro botão a girar quando houver uso real.

## Verificado em produção (21/09/2026)

**A saída da IA foi checada e aprovada pelo dono.** Edital da PM/AL, 2 cargos, 70 páginas,
com a Anthropic respondendo: disciplinas reais, tópicos em granularidade útil, quadro de
provas preenchido (121 questões em cada cargo) e dados do cargo presentes.

É uma avaliação humana sobre a tela de revisão, não uma medição automatizada — vale como
aprovação para seguir, não como métrica repetível.

## Não verificado

**Os 3 editais que truncam o anexo** (150k–210k caracteres, dezenas de cargos) não foram
re-testados: os 13 PDFs do lote não estão no repositório, foram baixados numa sessão
anterior. Mexer no recorte sem poder medir arriscaria quebrar o que acabou de ser aprovado.
Para retomar: juntar os PDFs de novo e rodar `scripts/testar-extracao-edital.mjs` antes e
depois da mudança.

## Pendente

1. **Tela de revisão** — decidida, não implementada. Sem catálogo para cair de volta, uma
   leitura ruim quebra o produto inteiro; o aluno precisa conferir antes de confirmar.
2. **`pareceEdital` não está ligado** no `Edital.jsx`. ~19% dos arquivos anunciados como
   edital são comunicado ou retificação.
3. **Consumir os campos novos** em `createCourse` e nas telas — o schema devolve, o app ainda
   ignora `prova[]`, `etapas[]` e os dados de cargo.
4. **Versão do edital.** Toda a plataforma fica pendurada num PDF; retificação posterior não
   chega a quem já montou. Guardar arquivo e data, no mínimo.

---

# Pendências fechadas — 2026-09-15

As quatro pendências da rodada anterior, implementadas.

## 1. Os campos novos chegam à tela

`normalizeOpenAiAnalysis` ([`src/lib/editalAiClient.js`](../src/lib/editalAiClient.js)) descartava
tudo que não fosse disciplina. Passa a repassar `vagas`, `salario`, `escolaridade`, `lotacao`,
`cargaHoraria`, `roleName` e `prova[]` por cargo, e `inscricaoValor` e `etapas[]` do certame.
Sem isso o schema ampliado não servia para nada — o dado morria no cliente.

## 2. Aviso antes de gastar a análise

[`src/lib/edital.js`](../src/lib/edital.js) concentra a leitura do edital do lado do aluno.
`avisosDoDocumento()` **avisa, nunca bloqueia** — o aluno pode legitimamente colar só o anexo
de conteúdo programático, que é curto. Três avisos:

- documento curto demais para um edital de abertura (limiar `CHARS_MINIMO_EDITAL`, importado do
  módulo do backend para não existirem duas verdades);
- edital que se declara retificado no cabeçalho — o plano fica pendurado na versão enviada;
- nome de arquivo que sugere comunicado, resultado, gabarito ou convocação.

## 3. Tela de revisão

[`src/components/RevisaoEditalPanel.jsx`](../src/components/RevisaoEditalPanel.jsx), renderizada
no modo IA do [`Planos.jsx`](../src/pages/Planos.jsx). Mostra os dados do cargo, o quadro de
provas e a lista de disciplinas — cada uma com caixa de inclusão, nome editável e os tópicos
abertos para marcar um a um. O rodapé diz quantas disciplinas e tópicos vão ser criados, e o
botão virou **"Confirmar e criar"**.

O que a importação recebe é `disciplinasRevisadas` — a revisão do aluno, não a proposta crua da
IA. `importSelectedEditalWithAI` passou a aceitar esse override, e falha com mensagem própria
quando o aluno desmarca tudo.

## 4. Campos no curso, e a versão do edital

`createCourse` ganhou `carga_horaria`, `prova[]`, `edital_arquivo`, `edital_lido_em` e
`edital_impressao`. O import por edital passou a preencher cargo, vagas, salário, escolaridade,
lotação, carga horária, taxa, etapas e a data da prova — que antes vinham do catálogo ou da mão.

`parseEditalDate()` converte o que a IA devolve (`26/04/2026`, `26 de abril de 2026`, ISO) para
o formato que o curso guarda. A data da prova é o eixo de Planejamento, Metas e Revisões: sem
ela metade do app não se orienta.

`impressaoDoEdital()` guarda uma impressão do texto lido, insensível a espaço em branco (a
extração do pdfjs varia no espaçamento, e isso não é versão nova). É o mínimo para um dia
detectar que o aluno está com um edital diferente do que gerou o plano dele.

Onde aparece para o aluno:

- card do curso: total de questões da prova e "Edital lido em dd/mm";
- tela do Edital: cada disciplina mostra `10 questões · peso 2`, casando o nome da disciplina
  com a linha do quadro por comparação frouxa (sem acento, sem caixa, com `includes` nos dois
  sentidos) — o nome passa por canonicalização ao entrar no app e nem sempre bate caractere a
  caractere com o que o edital escreveu.

## Verificação

120 testes passando, lint sem erros (16 warnings, todos pré-existentes, conferido com stash),
build limpo. Os 32 testes de `src/lib/edital.test.js` cobrem os avisos, o parser de data, a
impressão e o casamento de disciplina com o quadro.

**Verificado depois (21/09/2026):** a saída da IA foi aprovada pelo dono em produção — ver a
seção "Verificado em produção" acima. O que estava provado até ali era o texto que chega ao
modelo, o formato exigido dele e o caminho do dado da resposta até a tela.
