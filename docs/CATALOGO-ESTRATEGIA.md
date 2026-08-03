# Catálogo de concursos — como ele se alimenta

Decisão de 2026-08-03. Este arquivo existe para a decisão não ser rediscutida do zero
daqui a dois meses. Ver também [BRIEF-CODEX-CATALOGO.md](BRIEF-CODEX-CATALOGO.md).

## O princípio

O catálogo **nunca é alterado destrutivamente por processo automático.** Coleta nova,
correção de aluno e diff de robô produzem sempre a mesma coisa: uma **proposta de revisão**
com evidência, esperando aprovação humana. O item publicado só muda quando alguém aprova.

Corolário que economiza metade do trabalho: **a correção comunitária e o robô de
monitoramento geram o mesmo artefato.** É uma tabela e uma tela de revisão servindo os dois.
Não construir duas.

## Lista branca de fontes — vale desde já

`edital_url` só é aceito se apontar para domínio oficial: órgão, banca ou diário.
Implementado em [`scripts/validate_catalog_json.mjs`](../scripts/validate_catalog_json.mjs)
(`DOMINIOS_OFICIAIS` / `AGREGADORES`), então vale para qualquer coleta, humana ou de IA.

- **Permitido:** `gov.br`, `jus.br`, `leg.br`, `mp.br`, `def.br`, `mil.br`, `edu.br` e as
  bancas (Cebraspe, FGV, FCC, IBFC, AOCP, Vunesp, Quadrix, Idecan, Consulplan, Cesgranrio...).
- **Recusado com mensagem própria:** PCI, Estratégia, Gran, QConcursos, Folha Dirigida,
  Direção, TEC. Servem para **descobrir** que existe um edital — nunca para preencher o dado.
- Domínio legítimo faltando na lista: rodar com `EXTRA_DOMINIOS="dominio.br"` e avisar, para
  a lista crescer de forma consciente.

## Cobrir o funil inteiro, com exigência proporcional

Os 11 `status_concurso` já existiam no app (filtro, badge e peso no ranking de
[ConcursosDisponiveis](../src/pages/ConcursosDisponiveis.jsx)). O que faltava era regra de
prova para cada fase. São três perfis, e o que muda é **o que serve de evidência**:

| perfil | status | evidência (`edital_url`) | conteúdo programático |
|---|---|---|---|
| **A — com edital** | `edital_publicado`, `inscricoes_abertas`, `prova_marcada` | o edital | do edital vigente, obrigatório |
| **B — pré-edital** | `comissao_formada`, `banca_*`, `edital_iminente` (e `previsto`/`autorizado` que tenham conteúdo) | ato oficial do certame | do **edital anterior**, com `conteudo_provisorio` + `conteudo_fonte_url` |
| **C — radar** | `previsto`, `autorizado` sem conteúdo | anúncio/autorização oficial | **nenhum** — o item existe para o aluno achar e acompanhar |

O que decide entre B e C é o conteúdo, não o status: sem disciplinas é radar; com
disciplinas, tem que cumprir B por inteiro. Não há meio-termo — conteúdo raso sem fonte é
justamente o que corrompe o catálogo.

A lista branca vale nos três. Um `previsto` que só existe em post de cursinho **não entra**:
se nenhuma fonte oficial falou, o concurso não existe ainda.

## Os três estágios

### Estágio 0 — lista branca ✅ (feito)

Regra, não infraestrutura. Custo: uma hora. Captura a maior parte do ganho de qualidade
sem escrever um único coletor.

### Estágio 1 — proposta de revisão (próximo, pós-validação de telas)

Uma tabela `revisoes_rascunho` (dados propostos + o que mudou + link que comprova) e uma
tela de aprovação no admin. Alimentada por:

- **aluno** — botão "isso está errado / faltou disciplina" na tela do concurso;
- **coleta manual** — o lote que o Codex entrega;
- (depois) **robô**.

O valor aparece com zero automação: é o que transforma os ~1.200 rascunhos com conteúdo
numa fila que os usuários ajudam a esvaziar, em vez de uma fila que só o dono revisa.

### Estágio 2 — monitoramento automático (depois que o estágio 1 estiver confiável)

`fontes_monitoradas` (URL, órgão/banca, frequência, tipo) + `coletas` (snapshot, data, hash).
Robô compara a coleta nova com a versão vigente e abre proposta de revisão.

**Começar com 3 a 5 fontes HTML, não 20 a 30** — e preferir **bancas a órgãos**: FGV,
Cebraspe e FCC concentram muito edital numa estrutura de página só.

Riscos reais deste estágio, medidos e não teóricos:

- **PDF oficial nem sempre é legível.** Teste de 2026-08-03: o edital do TJSC (PDF 1,3 MB)
  voltou com texto parcialmente ilegível — sem data de prova nem valor de inscrição
  extraíveis. O TJCE, página HTML, saiu íntegro. O coletor quebra justamente onde importa.
- **Precisa de agendador** (`pg_cron`/`pg_net` ou Edge Function agendada). Mesmo bloqueio
  pendente do e-mail de lembrete — ver `project_todo_later`.
- **Hash cru dá falso positivo em série:** página oficial com banner, contador ou data de
  acesso muda de hash toda coleta. O hash tem que ser escopado ao trecho relevante, senão
  chega "nova versão" todo dia e ninguém olha mais.
- **Snapshot vai para o Storage, não para o banco.** E guardar o documento, não republicá-lo.

## Estado do catálogo (2026-08-03, pós-faxina)

- **Público:** 51 vestibulares + 1 ENEM + 99 instituições-ENEM. Concursos: zerado de
  propósito — o que havia tinha prova a menos de 60 dias.
- **Rascunhos:** ~1.204 com conteúdo, muitos com 100+ tópicos, quase todos **sem
  `edital_url`**. Não são lixo: são material bom sem fonte anexada. É a matéria-prima do
  estágio 1 — revisar sai bem mais barato que coletar de novo.

Nota: os 99 itens `tipo='enem_inst'` não aparecem como objetivo. Alimentam a lista de
instituições-alvo dentro da aba ENEM ([Objetivos.jsx](../src/pages/Objetivos.jsx) → `EnemView`).
Tirar do ar esvazia essa escolha.
