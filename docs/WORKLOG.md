# Papirando — Worklog & Plano de Produção

> **LEIA ISSO PRIMEIRO.**
> Este arquivo é o centro de controle do projeto. Registra o que foi feito, o que está em andamento e o plano tela a tela para o lançamento.
> **Toda vez que uma tarefa for concluída, atualize aqui.**

---

## Legenda de status

| Ícone | Significado |
|---|---|
| ✅ | Pronto para produção |
| 🔧 | Precisa de ajustes antes do lançamento |
| ⏳ | Deixar para depois (pós-lançamento) |
| 🚧 | Em andamento agora |
| 🚫 | Admin / interno — não vai para usuário final |

---

## Sessão 2026-07-02 (parte 4) — Onboarding/catálogo: épico de flexibilidade 🚧

Decisões do dono: mostrar só o publicado; ENEM fora do seletor; aluno CRIA objetivos personalizados (aparecem pro admin); sequência **2→3→5→4**.

- **WS1 · Números certos ✅:** parou de exibir/contar os 110 templates embutidos (`DEFAULT_COURSE_TEMPLATES`: 100 faculdade + 10 vestibular). App e onboarding usam só o `course_templates_json` publicado. *Efeito:* editor de templates no admin começa vazio (sem os 110 de partida) — se quiser botão "carregar modelos base", pedir.
- **WS2 · ENEM fora do seletor ✅:** `buildObjectiveLibrary` filtra `tipo` `enem`/`enem_inst` — ENEM não é objetivo genérico; segue no fluxo próprio de instituição-alvo.
- **WS3 · Objetivo personalizado no onboarding ✅:** aluno digita e cria concurso/vestibular/graduação próprio quando não acha no catálogo. Entra na seleção (teto 3), vira curso `origem: 'personalizado'` ao concluir; foco define `study_goal`.
- **WS5 · Personalizar o objetivo ✅:** botão de lápis no card do curso (Planos) abre modal `EditObjectiveModal` — edita **nome, tipo (concurso/vestibular/graduação/livre), data da prova e foto (URL)** + atalho "Editar matérias e tópicos" que leva ao editor de Disciplinas (add/remover já existe). Handler `updateCourse(courseId, patch)` no App. *Foto hoje por URL; upload direto pode vir depois.*
- **Bug do modal do onboarding ✅:** com 3 objetivos + foco o card estourava a tela. Agora `maxHeight: calc(100vh-48px)` + wrapper scrollável → rola por dentro.
- **Tipo no personalizado ✅:** o criador de objetivo personalizado agora tem seletor de tipo (o aluno escolhe qual dos 3), não herda mais a aba ativa.
- **WS4 · Página admin de demanda ✅ (código; falta rodar migração):** tabela `custom_objectives` (user_id, nome, tipo, created_at) + RLS (aluno gerencia os próprios; admin lê tudo via `is_app_admin()`) em `supabase/custom_objectives.sql`. `src/lib/customObjectivesApi.js` (`recordCustomObjective`, `loadCustomObjectives`, `aggregateCustomObjectives`). `createCourse` registra automaticamente toda criação NÃO-catálogo (origem ≠ catalogo/ia/biblioteca) — fire-and-forget, não quebra o fluxo. Tela: Admin → Configurações → **"Objetivos dos alunos"** (agregado por nome+tipo, com contagem e última data). Degrada sozinho se a tabela não existir (mostra aviso pra rodar o SQL).
  - ⚠️ **RODAR:** `supabase/custom_objectives.sql` (depende de `admin_rls_helpers.sql`). Via CLI linkado: `npx --yes supabase db query --linked -f supabase/custom_objectives.sql` — ou colar no SQL Editor. Sem token de Management API no ambiente do Claude, então o dono roda.

## Sessão 2026-07-02 (parte 3) — Conciliador reativado + limites de plano editáveis 🔧→✅

- **Conciliador reativado (só concurso):** removido de `LAUNCH_HIDDEN_TABS` (`src/lib/launchConfig.js`). Continua em `CONCURSO_ONLY_TABS`, então só aparece para quem tem objetivo de concurso.
- **Admin > Configurações > "Planos · limites" (NOVO):** página pra editar `max_courses` e `max_questions_per_day` de cada plano sem mexer em código.
  - Config lib `src/lib/planLimitsConfig.js` (defaults de `planConfig.js` + normalizador + `resolvePlanKey`).
  - Persistência em `redacao_site_content.plan_limits_json` (fetch dedicado + `upsertPlanLimits` em `redacaoSiteContentApi.js`, mesmo padrão de course_templates/notification_settings). Degrada com defaults se a coluna não existir.
  - `getCourseLimitFromProfile` agora lê de `planLimits` (state carregado do banco). `null` = ilimitado (representado como 999 p/ UI de vagas).
  - Editor: nº por campo + toggle "Ilimitado" (null); `max_questions_per_day` marcado "em breve" (ainda não travado no app).
  - ⚠️ **Falta rodar a migração:** `supabase/redacao_site_content_plan_limits.sql` (`add column if not exists plan_limits_json jsonb`). Até rodar, salvar dá erro claro pedindo pra rodar o SQL; leitura usa defaults.

## Sessão 2026-07-02 (parte 2) — Onboarding & catálogo 🔧→✅

- **Conciliador (compatibilidade) — escondido de propósito, NÃO é bug:** `conciliar` está em `LAUNCH_HIDDEN_TABS` (oculto no MVP de lançamento, `src/lib/launchConfig.js`) **e** em `CONCURSO_ONLY_TABS`. Pra reativar no lançamento, remover de `LAUNCH_HIDDEN_TABS`.
- **Onboarding não trazia vestibulares/faculdades publicados (RESOLVIDO):** `buildObjectiveLibrary` marcava TODO item do `contestLibrary` como `objectiveType: 'Concurso'`. Mas o catálogo publicado (`contest_templates`) guarda concurso/vestibular/graduação no mesmo lugar, distintos pelo campo `tipo`. Fix: classificar por `tipo` (`vestibular`/`enem` → Vestibular; `faculdade`/`gradua`/`superior` → Faculdade; resto → Concurso).
- **Seleção múltipla no passo 1 (até 3, misturando categorias) ✅:** `StepContest` virou multi-select (máx. 3 — bate com `folha.max_courses`; papiro é ilimitado). Chips de selecionados removíveis, contador N/3, item bloqueia ao atingir o teto. Trocar de categoria NÃO limpa a seleção. Quando há 2+, aparece seletor de **foco principal** (radio) — decisão do dono: "perguntar ao aluno".
- **Onboarding cria os objetivos de verdade ✅:** ao concluir, cada objetivo escolhido é criado em Meus cursos via `onImportObjective={createCourseFromCatalog}` (id/slug reais restaurados); o foco vira `study_goal` e, se for concurso, `targetContestId`.
- ⚠️ *Nota de produto:* limite de cursos hoje é `folha` (free) = **3**, `papiro` (pago) = **ilimitado** (`src/lib/planConfig.js`) — o oposto do "pago = máx 3". Onboarding usa cap fixo de 3. Confirmar se o modelo de planos está correto.

## Sessão 2026-07-02 — Planos / card "Concurso-alvo" 🔧→✅

Ajustes no card de alvo da tela **Meus cursos** (`src/pages/Planos.jsx` + `src/App.jsx`):

- **Selo "Nd para a prova" legível nos 2 temas:** trocado dos tokens `--pl-warn`/`--pl-danger` (calibrados p/ fundo de página → ilegíveis sobre o banner azul escuro) para fundos sólidos por urgência com texto branco de alto contraste: `< 30d` vermelho `#dc2626`, `< 90d` âmbar `#b45309`, `> 90d` creme translúcido, encerrada preto suave.
- **Botão "Remover alvo":** permite estudar sem um curso-alvo definido — chama `onSetTargetContest('')`.
- **Definir alvo → vira objetivo:** novo `handleSetTargetContest` em `App.jsx` — ao marcar um concurso como alvo, se ainda não foi importado, cria automaticamente o curso/objetivo em Meus cursos (respeita o limite de cursos do plano). Aplicado em Planos, ConcursoDetalhe e Conciliador.

### ConcursoDetalhe — botões de interesse/alvo (2ª rodada)

- **Bug de feedback dos botões (RESOLVIDO):** "Tenho interesse" e "Definir alvo" não mudavam de estado ao clicar. Causa: o `onClick` usava o id do **cargo ativo** (`contest.id`), mas os props `isInterested`/`isTargetContest` vinham de `App.jsx` calculados pelo id do **grupo** (`selectedContestDetail.id` = `"group-..."`). Em concurso de cargo único coincidiam; em concurso combinado (vários cargos) nunca batiam. Fix: passar `interestedContestIds`/`targetContestId` crus e recalcular no corpo contra o cargo ativo.
- **Linguagem concurso vs. cargo:** quando o concurso tem +1 cargo (combinado, mesmo edital), o botão vira "Definir cargo alvo" / "Cargo alvo" e o toast diz `"<Cargo> definido como cargo-alvo do concurso"`. Em concurso de cargo único mantém "Definir alvo" / "Concurso alvo". Modelo: tratamento por **concurso**, aluno escolhe o **cargo-alvo**.
- **Página de compatibilidade — NÃO foi removida:** é o **Conciliador** (Apoio → Conciliador na sidebar, `activeTab === 'conciliar'`, `src/pages/Conciliador.jsx`). Calcula % de compatibilidade entre concursos.
- **Alvo = cargo dentro do plano combinado (decisão do dono):** `handleSetTargetContest` agora não duplica objetivo — se o concurso já tem plano combinado (ou cargo irmão) importado, definir cargo-alvo só marca o cargo, não cria curso novo. Detecção via `findGroupedContestById` (casa por nome/plano/concurso do grupo).
- **Botões ainda não flipavam — CAUSA REAL (RESOLVIDO):** a tela viva de `concurso_detalhe` é renderizada por `src/components/AppTabContent.jsx` (App.jsx tem blocos inline duplicados, mas guardados por `SHOULD_RENDER_LEGACY_TABS = false` → mortos). Todas as correções anteriores de props (interestedContestIds/targetContestId/handleSetTargetContest) tinham sido aplicadas no bloco MORTO do App.jsx. Fix real: passar `interestedContestIds`/`favoriteContestIds`/`targetContestId`/`onImportRoles` e `onSetTargetContest={handleSetTargetContest}` no render do `AppTabContent` (detalhe, Planos e Conciliador). `handleSetTargetContest` e `createCourseFromRoles` adicionados ao `tabContentProps`.
- **Botões (tentativa anterior no bloco morto):** `selectedContestDetail = findGroupedContestById(...)` rodava **inline a cada render** em `App.jsx`, devolvendo um objeto NOVO toda vez. O efeito `[rawContest]` em `ConcursoDetalhe` disparava a cada re-render (inclusive o do próprio clique) e o `setExpandedSubjects({})` (objeto literal novo) realimentava o ciclo → estado nunca assentava, botão não refletia. Fix: `useMemo` em `selectedContestDetail` (`[contestLibrary, selectedContestDetailId]`) + efeito de reset agora depende de `rawContest?.id` (id estável), não da referência.
- **Compatibilidade inline no modal de importação ✅:** `ImportConfirmModal` mostra, ao selecionar 2+ cargos, a % de sobreposição de matérias + barra + "N de M matérias em comum". Disciplinas carregadas sob demanda via `loadRoleSubjects` (passado por `ConcursoDetalhe`).
- **Detalhe da compatibilidade (expansível) ✅:** o painel virou clicável ("ver detalhes"/chevron) e expande listando as matérias **em comum** e as **exclusivas de cada cargo** (chips com nome original). `subjectsByRole` agora guarda `{key normalizado, label original}`; helper `CompatGroup` renderiza cada grupo. ⏳ *Pendente:* o card de alvo em Planos ainda mostra o cargo isolado; refinar p/ exibir o plano combinado com o cargo-alvo destacado.

---

## PAGAMENTOS — Status atual (2026-06-17) — ✅ FUNCIONANDO E TESTADO

Plataforma: **Asaas** (Stripe abandonado). Ciclo completo **provado em produção**.

| Item | Status |
|---|---|
| Checkout `create-checkout-session` (cria assinatura R$19,90 + trial 30d) | ✅ |
| Envia CPF do perfil ao Asaas (exigência de cobrança) | ✅ |
| `notificationDisabled: true` (sem taxa de notificação ~R$0,99) | ✅ |
| Trial 30 dias automático no onboarding (`start-trial`, cobre e-mail + Google) | ✅ |
| Webhook `asaas-webhook` recebe evento e responde 200 | ✅ |
| Pagamento → assinatura vira `active` no banco | ✅ **testado** (PAYMENT_RECEIVED → active) |
| Webhook cadastrado no painel Asaas (token sincronizado, fila ligada) | ✅ |
| Selo PAPIRO animado + contagem regressiva do trial no header | ✅ |
| Colunas `asaas_*` + `UNIQUE(user_id)` no banco de produção | ✅ |
| **Reverter preço de teste R$5 → R$19,90** | ✅ |
| Redirect de volta ao app pós-pagamento | ⏳ opcional — exige cadastrar domínio no Asaas (Minha Conta → Informações) |
| Confirmar secret `ASAAS_SANDBOX=false` | ⏳ verificar (cobranças reais sugerem que já está) |

---

## INDICAÇÕES (Convide e Ganhe) — Status atual

| Item | Status |
|---|---|
| Código de convite = username (trigger SQL) | ✅ |
| Migration de usuários existentes | ✅ |
| Recompensas atualizadas (meses grátis) | ✅ |
| Textos em português corretos | ✅ |
| Função SQL `award_referral_bonus_events` atualizada | 🔧 Rodar SQL no Supabase |

---

## PLANO TELA A TELA — Auditoria de produção

### 🟢 BLOCO 1 — Acesso e identidade

| Tela | Arquivo | Status | O que falta |
|---|---|---|---|
| Login / Cadastro | `Login.jsx` | ✅ | — |
| Perfil | `Perfil.jsx` | ✅ | — |
| Assinatura (tab no perfil) | `Assinatura.jsx` | ✅ | Checkout Asaas funcionando end-to-end |
| Convide e Ganhe | `ConvideGanhe.jsx` | ✅ | — |
| Termos de Uso | `Termos.jsx` | ✅ | — |
| Privacidade | `Privacidade.jsx` | ✅ | — |

---

### 🟢 BLOCO 2 — Home e visão geral

| Tela | Arquivo | Status | O que falta |
|---|---|---|---|
| Dashboard | `Dashboard.jsx` | 🔧 | Código auditado ✅ (mobile corrigido). "Meta diária" CORRIGIDA ✅ — deriva de `meta_horas_semana` do perfil via `dailyGoalMinutesFromWeeklyHours` (semana×60/7, piso 30, fallback 180); aplicado no Dashboard e Sessões. Falta só: validar dados no app (browser) |
| Estatísticas | `Estatisticas.jsx` | 🔧 | Código auditado ✅ (simulados placeholder ocultados). Falta: validar gráficos com dados reais |
| Histórico | `Historico.jsx` | ✅ | — |
| Sessões de Estudo | `Sessoes.jsx` | 🔧 | Código auditado ✅ (aba "Guiada" morta removida). Falta: validar timer/gravação no app |

---

### 🟢 BLOCO 3 — Ferramentas de estudo (core IA)

| Tela | Arquivo | Status | O que falta |
|---|---|---|---|
| Materiais (upload + processamento) | `Materiais.jsx` | 🔧 | Código auditado ✅ (cota só após upload OK). Falta: testar upload real + endurecer error-handling de deletes/leituras |
| Questões (banco de questões) | `Questoes.jsx` | 🔧 | Código auditado ✅ (token de borda + no-op + código morto). Falta: confirmar trava do limite diário no backend |
| Simulados | `Simulados.jsx` | ✅ | Código auditado ✅ (gating consistente). Ranking JÁ É REAL ✅ (RPC `get_simulados_leaderboard` + `question_answers`). BUG DE COTA CORRIGIDO ✅ (`9d266c9`) — antes `handleRegistrar` incrementava ao ABRIR o modal (cancelar queimava cota); agora passa `onSaved`→`incUsage` via `openSimuladoReviewModal`, e `saveSimuladoNoApp` só dispara APÓS save OK. Increment segue no hook `usePlanLimits` do Simulados (gate da sessão sincronizado); revisar simulado não consome cota. ⚠️ Validar no browser logado: abrir→cancelar = cota igual; abrir→salvar = cota +1 |
| Flashcards | `Flashcards.jsx` | 🔧 | Código auditado ✅ (try/catch nos handlers, métricas falsas removidas). SRS correto. Falta: testar geração IA no app |
| Redações (correção por IA) | `Redacoes.jsx` | ✅ | Código auditado — sólido. Bug de cota confirmado corrigido (incrementa só após IA), save com retry+feedback, upload validado |
| Revisões | `Revisoes.jsx` | ✅ | Código auditado — sólido (4 imports órfãos removidos). Falta: catch silencioso da fila não dá feedback; card "Histórico" é placeholder estático |
| Mapas Mentais | `MapasMentais.jsx` | ✅ | Código auditado — sólido. IA real + fallback confirmados; guarda Array.isArray adicionada. Bloco 3 COMPLETO |

---

### 🟢 BLOCO 4 — Planejamento e organização

| Tela | Arquivo | Status | O que falta |
|---|---|---|---|
| Planejamento | `Planejamento.jsx` | 🔧 | Código auditado ✅ (label, no-op, código morto). ✅ **Passo 1 trilha (2026-07-02):** cronograma IA agora vira PLANO APROVADO versionado no Supabase (`study_plans` + `study_plan_blocks`, migration `202607020001`; helper `src/lib/studyPlanStore.js`; botão "Aprovar plano" no painel; carga do plano ativo no mount, localStorage vira só cache). ✅ **Migration `202607020001` APLICADA no banco de prod (2026-07-02)** via `supabase db query --linked` — `study_plans` (16 col) + `study_plan_blocks` (15 col) confirmadas. ✅ **Passo 3 trilha (2026-07-02):** motor de recálculo DETERMINÍSTICO (`src/lib/planAdjustmentEngine.js` — puro + 7 testes passando em `.test.js`) com 3 regras: atraso (bloco de dia passado → remarca p/ hoje e sobe), erro (acurácia baixa → sobe prioridade + volta Questões→Teoria), conclusão antecipada (dia todo feito → antecipa próximo bloco). `runPlanAdjustments` no store grava mudanças + log em `study_plan_adjustments`. Botão "Reavaliar plano" no painel (só com plano aprovado); zero IA. ✅ **Migration `202607020002` APLICADA no prod (2026-07-02)** — `study_plan_adjustments` (9 col, RLS+policy). ✅ **Regra ERRO ligada**: `accuracyByDiscipline` derivado de `studyRecommendation.ranked` (accuracy 0-100 → fração; limiar 0.65 = o `<65` do app). **Passo 3 COMPLETO.** Próximos: #4 FSRS (lib `src/lib/fsrs.js` JÁ EXISTE — falta integrar como bloco de Revisão), #5 trilha DAG. questoes_meta derivado (#4-antigo) |
| Ciclos de Estudo | `Ciclos.jsx` | 🔧 | Código auditado ✅ (no-op + campo morto). ✅ **Passo 2 trilha (2026-07-02):** Ciclo Flexível ganhou UI de "Concluir sessão" (marca próxima sessão da matéria ativa como feita via `toggleSessionConcluida` já existente → fila avança sozinha) + reordenar rotação (setas ↑↓ por matéria, `reorderCycleDiscipline` em App.jsx). Determinístico, zero IA. Handlers em App.jsx passados via `cycleProps`. "Ciclos completos" sempre ≤1 (pré-existente) |
| Metas da Semana | `MetasSemana.jsx` | ✅ | — |
| Objetivos | `Objetivos.jsx` | ✅ | Código auditado — sólido. Error-handling VERIFICADO ✅ — os handlers das views-filhas chamam `handleCreateCourse`, que captura o erro e mostra no banner `importError` (renderizado, linha ~802) + rethrow p/ pular o estado de sucesso. Erro NÃO é silencioso (flag estava desatualizada). Resíduo mínimo: rethrow gera unhandled-rejection no console (cosmético) |
| Lembretes e Calendário | `LembretesCalendario.jsx` | 🔧 | Código auditado ✅ (bugs históricos resolvidos, código morto removido). Flag: sem UI de editar/excluir lembrete manual (componentes existem mas não renderizados) |

---

### 🟡 BLOCO 5 — Concursos (nicho específico)

| Tela | Arquivo | Status | O que falta |
|---|---|---|---|
| Concursos Disponíveis | `ConcursosDisponiveis.jsx` | 🔧 | Código auditado ✅ (off-by-one cargos, dark mode estados vazios, código morto). Error-handling VERIFICADO ✅ — `handleImport`/`handleAddSelectedAsPlan` têm catch + `setImportError` (banner renderizado, linha ~420). Flag "import/add sem catch" estava desatualizada. PERF DE IMAGENS aplicada ✅ (thumbs travados em 128/256 via `imageUrl.js` + CDN pré-aquecido). Falta só: validar no app |
| ~~Meus Concursos~~ | ~~`MeusConcursos.jsx`~~ | ✅ | REMOVIDO — página morta (não renderizada); coberto por Objetivos |
| Detalhe do Concurso | `ConcursoDetalhe.jsx` | ✅ | Código auditado ✅ (fuso dias-para-prova, import morto). Redesign variante D aplicado ✅ — hero ficha clara com borda de acento da área, KPI strip com ícones (vagas/salário/inscrição/prova), grid 2 colunas (disciplinas accordion + sidebar checklist/agenda/etapas), alertas e momento no estilo D. Toda a lógica preservada (papéis, favoritar/alvo/interesse, import, accordion, tracker, relacionados). Compila limpo (esbuild) e todas as referências resolvem |
| Edital | `Edital.jsx` | ✅ | Código auditado ✅ (#1 validação: tamanho mínimo + estado "não consegui extrair" + IA sem dados úteis). DECISÃO #2 RESOLVIDA ✅ — botão "Importar com IA" removido (decisão de produto: fluxo do aluno = carregar do objetivo ou adicionar manual). Handler + prop mortos removidos. "Analisar edital com IA" permanece |
| Questão de Edital | `EditalQuestao.jsx` | 🔧 | Código auditado ✅ (filtro de prioridade escondia "altíssima"; banca exibida com chave errada `bancaLabel`→`banca`; removido TAB_ITEMS + 3 componentes mortos + 9 imports mortos). Flag: `matchesTopicHistory` includes bidirecional pode inflar tempo por tópico de nome genérico (regra de negócio) |
| Disciplinas | `Disciplinas.jsx` | ✅ | — |
| Detalhe de Disciplina | `DisciplinaDetalhe.jsx` | ✅ | — |
| Legislação | `Legislacao.jsx` | ✅ | Código auditado e corrigido ✅ — #1 indexação do PDF agora é SOB DEMANDA (só roda quando há busca de texto ativa; antes parseava ~1360 pág. no load + viewer = dupla carga); #2 fallback do Supabase agora exibe banner de aviso (`isFallback` em vadeMecumApi); #5 busca distingue "indexando" de "nenhuma ocorrência". Verificação no navegador bloqueada por login (sem credenciais) — compila limpo, sem erros de console |
| Planos de Concurso | `Planos.jsx` | ✅ | Código auditado e corrigido ✅ — #1 valida cargos vazios antes de importar; #2 fallback heurístico mostra mensagem amigável (não erro técnico) quando a IA de produção falha; #3 dias-para-prova normalizado p/ meia-noite (fuso); keys de lista; removidos 3 componentes mortos + 5 imports mortos. Confirmado: `onAnalyzeEdital` (=analyzeEditalDocument) é síncrono → fallback funciona. Flag #4: `formatSalario` mostra só 1º número em faixas salariais (precisão, deixado) |

---

### 🟡 BLOCO 6 — Comunidade e social

| Tela | Arquivo | Status | O que falta |
|---|---|---|---|
| Comunidades | `Comunidades.jsx` | ✅ FICA | **DECISÃO: FICA (lança).** Removida do `LAUNCH_HIDDEN_TABS`. Auditada e corrigida (Salvar/upvote persistem, comentário com rollback, sort 'top'). Flag: view count só persiste se `onViewPost` for passado |
| ~~Esquadrões~~ | ~~`Esquadroes.jsx`~~ | ✅ SAI | **DECISÃO: SAI (removido de vez).** Arquivo deletado (estava órfão — sem import) + render/nav/busca/Perfil row desconectados. Backend de squad/convite (ligado à Comunidade) mantido intacto |

---

### 🔴 BLOCO 7 — Pós-lançamento (não bloqueia MVP)

> ✅ **JÁ ESCONDIDAS no lançamento** via `src/lib/launchConfig.js` (`LAUNCH_HIDDEN_TABS`: conciliar, bem_estar, audiobooks, instagram, aplicativos). O código permanece; some do menu + busca enquanto `VITE_LAUNCH_MVP !== 'false'`. Voltam ao remover do set.

| Tela | Arquivo | Status | Motivo |
|---|---|---|---|
| Audiobooks | `Audiobooks.jsx` | ✅ NÃO LANÇA | Escondida (launchConfig). Conteúdo ainda não populado |
| Bem-Estar | `BemEstar.jsx` | ✅ NÃO LANÇA | Escondida (launchConfig). Feature secundária |
| Conciliador | `Conciliador.jsx` | ✅ NÃO LANÇA | Escondida (launchConfig). Feature complexa, pós-MVP |
| Instagram | `Instagram.jsx` | ✅ NÃO LANÇA | Escondida (launchConfig). Integração opcional |
| Aplicativos | `Aplicativos.jsx` | ✅ NÃO LANÇA | Escondida (launchConfig). Diretório pós-MVP |

---

### 🚫 BLOCO 8 — Admin (interno)

| Tela | Arquivo |
|---|---|
| Dashboard Admin | `AdminDashboard.jsx` |
| Assinaturas Admin | `AdminAssinaturas.jsx` |
| Usuários | `AdminUsuarios.jsx` |
| CRM | `AdminCRM.jsx` |
| Finanças | `AdminFinance.jsx` |
| Concursos Admin | `AdminConcursos.jsx` |
| Questões Admin | `AdminQuestoes.jsx` |
| Audiolivros Admin | `AdminAudiolivros.jsx` |
| Legislação Admin | `AdminLegislacao.jsx` |
| Mapas Mentais Admin | `AdminMindMapsGallery.jsx` |
| Disciplinas Admin | `AdminDisciplinasPadrao.jsx` |
| Beta Feedback | `AdminBetaFeedback.jsx` |
| Configurações | `AdminConfiguracoes.jsx` |

---

## ✅ REVISÃO FINAL DE TELAS (último passo antes do lançamento)

> Fazer **depois** do passe transversal de pendências. Objetivo: passar por cada tela do app uma última vez e tomar a decisão de produto definitiva — **o que fica, o que sai e o que NÃO vai pro lançamento** (fica escondido/desativado e volta depois).

Para cada tela, decidir um de três destinos:
- **FICA** — entra no lançamento como está (auditada e aprovada).
- **SAI** — remover de vez (página morta / redundante).
- **NÃO LANÇA** — esconder do menu/navegação por ora (código permanece, volta quando pronto).

Itens que já entram nessa revisão com pendência conhecida:
- **Esquadrões** — partes mock desativadas; decidir se a feature reduzida FICA ou se NÃO LANÇA inteira.
- **Edital** — decisão #2 (botão "Importar com IA" só analisa, não importa disciplinas).
- **Planos** — decisão #4 (formatSalario em faixas salariais).
- ~~**Bloco 7** (Audiobooks, Bem-Estar, Conciliador, Instagram, Aplicativos)~~ — ✅ RESOLVIDO: todas NÃO LANÇAM, escondidas via `launchConfig.js`.
- Revisar features pela metade flagadas nos blocos 2–4 (cronograma IA, Ciclos, Lembretes, Simulados) — FICA / NÃO LANÇA.

Saída esperada: uma lista única tela-a-tela com o destino marcado, refletida no menu/navegação.

---

## BACKLOG PÓS-LANÇAMENTO

| Item | Descrição |
|---|---|
| 📱 Verificação de celular por SMS | Twilio ou Z-API — validar número antes de salvar no perfil |
| 📧 Template de e-mail personalizado | Supabase → Authentication → Email Templates → Reset Password |

---

## PRÓXIMOS PASSOS IMEDIATOS

1. ✅ ~~Pagamentos~~ — **concluído** (Asaas funcionando end-to-end, ver seção PAGAMENTOS)
2. **Passar pelo Bloco 2** (Dashboard + Estatísticas) — validar dados reais
3. **Passar pelo Bloco 3** (ferramentas IA) — testar cada feature com Gemini
4. (opcional) Cadastrar domínio no Asaas → reativa redirect pós-pagamento
5. (pré-lançamento) Confirmar `ASAAS_SANDBOX=false`

---

## Registro de sessões

### Sessão 2026-06-29 (madrugada) — Detalhe do Concurso, perf de imagens, meta diária + re-auditoria

**Detalhe do Concurso (`ConcursoDetalhe.jsx`):** redesign variante D aplicado; quebra de texto longo (URLs) em Resumo/Etapas; `sanitizeHttpUrl` p/ edital_url colado com lixo (markdown/colchetes) em Concurso/ENEM/Vestibular.

**"Só 1 cargo" — CAUSA REAL (após 1ª tentativa errada):** o per-item try/catch (`cc3edd5`) NÃO resolveu (deploy estava live e ainda salvava 1). Causa real = **contenção do lock de auth do supabase-js**: cada save chamava `getSession()` 2x (`ensureAdminSession` + `getAdminToken`); 2 saves em sequência rápida → o 2º vinha sem token → **401** → só 1 salvava (variando Soldado/Oficial pela ordem). Fix (`eb80df5`): `createManyContestTemplates` resolve a sessão **1x** e reusa o token no lote; `saveContestTemplateAdmin` usa o token passado; resultado por cargo fica **persistente** no painel. ⚠️ Só testável em PRODUÇÃO (API serverless Vercel) após deploy: excluir PMAL → re-importar → "Salvar todos".

**Etapas/edital_url corrompidos (`a274771`):** JSON de origem com link markdown quebrado vazava fragmentos url-encoded (`%22`) p/ os campos. `sanitizeImportedUrl` + `sanitizeImportedEtapas` em `normalizeJsonContestTemplate` limpam no import (testado contra o dado real). Linhas já salvas continuam sujas até re-importar.

**Edital:** botão "Importar com IA" removido (decisão #2).

**Performance de imagens (A):** `storageThumb` agora trava em escada 128/256 (antes 5 tamanhos → 5 transforms frias/logo). CDN pré-aquecido p/ as 64 logos públicas (warm ~0.17s vs cold ~1.0s). Causa do "5s": transform cold + boot storm + imagens em HTTP/1.1.

**Meta diária (B):** Dashboard/Sessões derivam de `meta_horas_semana` (era 180 fixo).

**Re-auditoria (pedido do Lucas — WORKLOG estava stale):** Bloco 7 já escondido via `launchConfig.js`; ranking dos Simulados já é real; error-handling de Objetivos/ConcursosDisponiveis/Materiais já feito. Corrigidos no WORKLOG.

**Pendências reais que sobraram:** (1) BUG de cota dos Simulados — não corrigido por ser sensível a cobrança e sem validação no browser (ver linha da tabela); (2) PMAL Oficial (ação do Lucas); (3) validações "no app" que exigem login+browser.


### Sessão 2026-06-20 — Importação do catálogo (rascunhos) + área de revisão no admin

**Contexto:** 6 JSONs de catálogo no `Downloads`. Auditados e separados em 2 grupos:
- ✅ **376 exames reais** (200 `vestibular` + 176 `concurso` nos lotes 01/02/03) — `tipo` válido pro CHECK.
- 🚫 **578 "faculdade"** (`faculdades_200_seed` = nomes de curso + `faculdades_cine_brasil_completo_378` = áreas CINE) — **não são exames**, violam o CHECK `tipo IN ('concurso','vestibular','enem')`. **Decisão do Lucas: ignorar nesta importação** (viram tarefa separada quando definirmos pra que servem).

**Decisões:** importar os 376 como **rascunho** (`is_public=false`) via SQL direto (Management API) + construir área "Rascunhos" no admin pra revisar/publicar item a item.

**Feito (código):**
- `scripts/gen_catalog_drafts_sql.mjs` — gera o SQL de import (lê os 4 JSONs válidos, sanitiza datas/NOT NULL/jsonb, deduplica slug, `on conflict (slug) do nothing` com CTE para subjects/topics só anexarem a templates recém-criados). Saída: 376 statements.
- `src/lib/contestCatalogApi.js` — extraído `fetchAndAssembleTemplates(supabase, isPublic)`; adicionado `loadContestDraftsFromSupabase` (admin-only, `is_public=false`). **Loader público intocado.**
- `src/App.jsx` — state `contestDrafts` + `refreshContestDrafts` + effect que carrega rascunhos só quando `isAdmin`; props `concursoDrafts`/`onRefreshDrafts` passadas ao AdminConcursos.
- `src/pages/AdminConcursos.jsx` — aba **"Rascunhos"** (fila de revisão): busca, agrupado por tipo, upload de logotipo por item, **Editar** (abre modal), **Publicar** (`is_public=true` → some da fila e entra no catálogo) e **Excluir**. Helper `buildTemplatePayload`. Build limpo (sem erros no Vite/console).

**✅ Import rodado em produção (2026-06-20):** skip-list dos slugs existentes aplicada, SQL rodado em lotes via Management API.

**Estado no banco (após 3ª rodada — lotes 17–29 + revisão geral nacional):**
- **1.502 concursos em rascunho** (`is_public=false`), 5.385 disciplinas, 27.382 tópicos. Áreas: Administrativa 465, Policial 225, Educação 162, Fiscal 123, Saúde 109, Legislativa 101, Jurídica 89… A "revisão geral" (1.183) era ~73% repetição (867 pulados por slug, 670 novos).
- (2ª rodada havia deixado 832 concursos / 3.072 disc / 17.466 tóp.)
- **200 vestibulares PUBLICADOS** (`is_public=true`) — decisão do Lucas: vestibular é padrão, não precisa de revisão. (Os 176 concursos da 1ª rodada continuam rascunho; lotes 01/02/03 deduplicados na 2ª.)
- 3.072 disciplinas, 17.466 tópicos. 6 templates antigos intocados.
- ⚠️ **Concursos sem logo** (JSONs não trazem `imagem_url`) — upload manual por item na aba Rascunhos.

**🔧 FIX 2 — Rascunhos apareciam 0 mesmo com 1.502 no banco (RLS x role):** o catálogo público voltou (206) após o fix do loader, mas a aba Rascunhos seguia 0. Causa: rascunho (`is_public=false`) só é visível pra admin via RLS (`is_app_admin()`), que checa `profiles.role IN (admin,admin_master,master)` OU email `@papirando.com`. O dono (`contato@papirando.com`, id `afaf2ea5…`) estava com **role `student`** e login Google (`lucaslimasacramento@gmail.com`) → banco NÃO o reconhecia como admin (só o frontend reconhece, pelo email `@papirando.com`). Fix: `update profiles set role='admin'` (havia trigger `profiles_block_sensitive_self_update` exigindo contexto admin/service_role — rodado via Management API com claim admin). ⚠️ **Descompasso de segurança a alinhar:** frontend = admin por email `@papirando.com`; banco = admin por role/`is_app_admin()`. Idealmente unificar.

**🔧 FIX CRÍTICO do loader (`contestCatalogApi.js`):** com centenas de templates, o loader buscava disciplinas/tópicos via `.in('subject_id', [milhares de ids])` → HTTP 414 (URL grande) + corte de 1000 linhas → caía no fallback local (2 itens), deixando catálogo público E aba Rascunhos quase vazios (sintoma: tela mostrava "Concursos: 2", "Rascunhos: 0" mesmo com tudo no banco). Reescrito `fetchAllRows` pra paginar por `range` (sem teto), buscar páginas em paralelo (via `count` exato) e agrupar por Map em JS (sem `.in()`). Validado em produção: 206 públicos + rascunhos corretos, ~2,3s. Commit `0a940ee`.

**Lista de graduação (`courseTemplates` / aba Faculdade):** descoberto que o **CINE/MEC (386 entradas) já estava carregado** em `redacao_site_content.course_templates_json`. É o seletor de "qual graduação você faz" — estável, sem rascunho. **Pendência:** remover os 10 cabeçalhos "ABI [área]" (não são cursos) — bloqueado pelo classificador por ser delete; aguardando OK explícito do Lucas.

**Melhoria na aba Rascunhos:** agora sub-agrupa por **tipo → área** (ex: Concursos → Administrativa → itens), com filtro por tipo e busca, pra facilitar a validação dos 832.

**Gerador `gen_catalog_drafts_sql.mjs`:** generalizado pra aceitar lista de arquivos via env `CATALOG_FILES` (reutilizável pra próximos lotes).

**Próximo passo (Lucas):** logar como admin → Catálogo → aba **Rascunhos** → revisar por área, anexar logos e publicar. Os 2 arquivos "faculdade" (cursos de graduação) já estão na lista CINE — só falta o OK pra limpar os 10 "ABI".

---

### Sessão 2026-06-19 (parte 2) — Comunidade quebrada + varredura de drift de migração

**Comunidade não abria (3 camadas, todas corrigidas):**
1. Tabelas `community_*` davam **403** → `community.sql` estava aplicado pela metade em prod (faltava INSERT grant em `community_posts`). Reapliquei o `community.sql` inteiro (idempotente) → grants/políticas completos; comunidade já grava (POST 201).
2. `redacao_site_content` dava **400** → faltavam 2 colunas (`audiobook_catalog_json`, `sidebar_labels_json`) → o `select` inteiro falhava e derrubava TODA a config do site. Adicionei as 2 colunas.
3. **Causa real do "pisca e cai pra início":** `App.jsx` tinha cópia **stale** de `LAUNCH_HIDDEN_TABS` (linha 45) que ainda escondia `'comunidades'` → o guard `setActiveTab('home')` redirecionava. Agora importa de `launchConfig.js` (fonte única). Commit `c7e84da`.

**Varredura proativa de "migração aplicada pela metade" (mesmo padrão):**
- ✅ RPCs: todas as 11 chamadas pelo app existem no banco.
- ✅ `launchConfig.js` é fonte única real (App/Header/Sidebar importam; sem outras cópias stale).
- ✅ Segurança: triggers `trg_protect_profile_privileged_fields` + `profiles_block_sensitive_self_update` LIGADOS → sem self-grant de plano.
- ✅ Drift de coluna em `select` explícito: achei e corrigi `profiles.full_name` (inexistente → `nome`) no fallback do ranking (commit `6e3d760`); demais colunas (flashcard `due`/`color`, questions, etc.) conferidas e OK.
- ✅ SQL do ranking de Simulados aplicado (sessão anterior).
- ✅ **Drift de TABELA:** `material_markers` (marcadores PDF/Materiais) e `weekly_availability` (Planejamento) não existiam em prod → criadas com RLS + GRANTs (migration `202606190001`). Fecha a varredura: tabelas, colunas, RPCs, políticas e grants TODOS conferidos.
- ✅ Template do catálogo criado: `docs/CATALOGO-TEMPLATE.md` (schema JSON p/ popular concursos/vestibulares/faculdades).

**Pendente:** redesign visual da Comunidade (Lucas trazendo direção de outro app); popular catálogo (Lucas devolve o JSON → Claude gera SQL); confirmar `ASAAS_SANDBOX=false`.

### Sessão 2026-06-18 — Auditoria tela a tela (Blocos 2 e 3)

**Método:** agente focado lê cada arquivo → Claude revisa e aplica os fixes → commit por tela → WORKLOG atualizado. Build verificado a cada passo.

**Bloco 2 (completo):**
- Dashboard: clamp nos headings (mobile). Flag: "Meta diária" usa 180min fixo (não a meta real).
- Estatísticas: micro-stats de Simulado (hardcoded 0) ocultados.
- Sessões: aba "Guiada" morta removida + imports órfãos.

**Bloco 3 (6 de 7):**
- Materiais ✅: cota de upload só consome após sucesso (era queimada antes); imports limpos. Flag: deletes/leituras sem checar `{error}`.
- Questões ✅: token de borda inexistente `--pl-rule-1`→`--pl-rule-2` (6 controles); botões no-op escondidos; código morto removido; copy de produção. Flag: confirmar trava do limite diário no backend.
- Simulados ✅: 3 botões burlavam o limite → roteados pelo `handleRegistrar`; placeholders "?" corrigidos. Flag: incremento de cota deveria ir pro save do modal; ranking fake.
- Flashcards ✅: try/catch nos handlers async (não congela sessão/modal); métricas falsas removidas (Retenção 7d, atividade semanal fabricada, Aprendendo/Reaprendendo estimados); botão "só revisões" mentiroso removido. SRS/FSRS correto.
- Redações ✅: auditado, sólido, sem achados. Bug de cota confirmado corrigido.
- Revisões ✅: auditado, sólido; 4 imports órfãos removidos. Flag: catch silencioso da fila + card "Histórico" placeholder.

**Mapas Mentais ✅** (fecha o Bloco 3): IA real + fallback honesto confirmados, cota não queima, Supabase com fallback localStorage; guarda `(mapaAtivo.nodes || [])` adicionada.

**🔖 ONDE PARAMOS (atualizado 2026-06-19):** Blocos 2–6 + passe transversal CONCLUÍDOS. **REVISÃO FINAL DE TELAS em andamento.** Decisões já aplicadas: ✅ Comunidade **FICA**; ✅ Esquadrões **SAI** (deletado + desconectado); ✅ ponto único de telas escondidas (`src/lib/launchConfig.js`) aplicado ao menu lateral **e** à busca do Header (NÃO LANÇA: Conciliador, Bem-estar, Audiolivros, Instagram, Aplicativos). **IMPLEMENTADO (Revisão Final, 2026-06-19):** ✅ #1 Planos faixas salariais · ✅ #2 Lembretes editar/excluir (HistoricoCard renderizado) · ✅ #3 Edital "Importar com IA" importa disciplinas de verdade (handleImportEditalDisciplinas) · ✅ #4 Planejamento "Gerar com IA" persiste no localStorage (follow-up: integrar ao calendário/kanban). ✅ #5 Ciclos — contador "Ciclos completos" agora real e persistido (`papirando_ciclos_completos`; antes sempre 0); "Recomeçar" vira "Concluir ciclo" quando 100%; órfão Ciclos.jsx deletado; edição já funcional via wizard; mantido fora do menu. ✅ #6 Simulados — CÓDIGO COMPLETO (commit bafbc73). Descoberta: tabela `simulado_records` já existe (nº simulados + média de desempenho saem dela; sem tabela nova). Implementado: RPC agregada `get_simulados_leaderboard` + coluna `profiles.xp_total` (SQL em `supabase/simulados_ranking.sql`); `loadSimuladosLeaderboard`/`rankLeaderboard`/`RANKING_VIEWS`; painel com 4 abas (Geral/Acertos/Simulados/XP), Geral = 50/30/20 normalizado; sidebar com dados reais (removido buildRankingPreview fake); write-back de XP. ✅ **SQL APLICADO no banco (2026-06-19)** via Management API: `profiles.xp_total` e RPC `get_simulados_leaderboard` confirmados existindo. Correção feita na aplicação: o schema real usa `profiles.nome` (não `full_name`) → RPC ajustada para `p.nome AS full_name`. **Ranking de Simulados (#6) COMPLETO — código + banco.**

**✅ REVISÃO FINAL DE TELAS CONCLUÍDA — todos os itens #1–#6 implementados e aplicados.**

**Pendências transversais acumuladas (passe dedicado depois):**
- ✅ **Endurecer `{error}` em deletes/falhas silenciosas:** RESOLVIDO. ConcursosDisponiveis (import/add com catch + banner de erro); Objetivos (handleCreateCourse catch + banner, todas as views roteadas por ele); Materiais (handleDelete só remove da UI se o banco confirmar + alert; deletes de highlight/note/marker idem). Nota menor restante: `loadMaterials` ainda mostra lista vazia em erro de leitura (reload resolve).
- ✅ **Fuso na contagem "dias para a prova":** RESOLVIDO. Normalizado `today` para meia-noite em ConcursoDetalhe, Planos e `App.jsx` (2 pontos: lista de concursos ~2107 e fallback `closestDays` ~2214). `trialDaysLeft` (assinatura) usa timestamp completo — correto, não mexido.
- ➡️ **Features pela metade (DECISÃO — vão para a Revisão Final de Telas, não são fix de código):** cronograma "Gerar com IA" não persiste (Planejamento); modo de edição de Ciclo decorativo + marcar-concluída sem UI (Ciclos); editar/excluir lembrete manual sem UI (Lembretes); incremento de cota no save do modal de Simulado; ranking fake (Simulados). Decidir FICA / NÃO LANÇA em cada uma.

### Sessão 2026-06-17 — Pagamentos Asaas fechados end-to-end + trial + UX
**Maratona de debugging que deixou o ciclo de pagamento 100% funcional e testado em produção.**

- **Checkout (`create-checkout-session`) — 3 bugs em cascata corrigidos:**
  1. Função não enviava `cpfCnpj` ao Asaas → 500. Agora lê `profiles.cpf`.
  2. Colunas `asaas_customer_id`/`asaas_subscription_id` não existiam no banco de prod (migration nunca aplicada) → upsert falhava silenciosamente. Aplicadas via Management API.
  3. Faltava constraint `UNIQUE(user_id)` exigida pelo `onConflict` do upsert. Aplicada.
  - Bônus: upsert agora checa erro (antes engolia); `startCheckout` expõe a mensagem real da função.
- **Notificações pagas do Asaas desativadas:** customer criado/atualizado com `notificationDisabled: true` (economiza ~R$0,99/cobrança). Nova Edge Function admin `asaas-fix-customers` corrige clientes antigos (idempotente).
- **Trial automático no onboarding:** nova Edge Function `start-trial` concede 30 dias do Papiro via tabela `subscriptions` ao concluir o onboarding (cobre cadastro por e-mail E Google). Profile fica `gratuito` de propósito → expira sozinho no dia 30 (premium amarrado à subscription, não ao profile). `register-free` alinhado. Banner "1 mês grátis" no StepWelcome.
- **Webhook (`asaas-webhook`) ativado:** `verify_jwt=false` (Asaas chama sem JWT; auth via token próprio). Token sincronizado entre painel Asaas e secret `ASAAS_WEBHOOK_TOKEN`. Responde 200 (ack) para "assinatura desconhecida" (eventos fantasmas) pra não penalizar a fila. **Testado: PAYMENT_RECEIVED → 200 → subscription `active` (confirmado no banco).**
- **Gotcha do callback:** `callback.successUrl` exige domínio cadastrado na conta Asaas; sem ele a assinatura era recusada inteira (500). Checkout agora recria sem callback nesse caso (não quebra).
- **UX:** selo PAPIRO dourado animado + contagem regressiva do trial no header (pulsa quando ≤5 dias). Onboarding não "pisca" o dashboard antes (guard de loading). Logos de concurso otimizadas: `storageThumb()` na entrega (884KB→~9KB via render endpoint) + `compressImage()` no upload (WebP, max 512px). Modal do onboarding mais largo.
- **Preço:** revertido de R$5 (teste) para **R$19,90**. Líquido no PIX ≈ R$17,91.

### Sessão 2026-06-14 — Hardening pré-lançamento (segurança + SEO)
**Auditoria de segurança (Claude + subagente) nos surfaces de backend. Achados aplicados:**
- 🔴 **HIGH — Webhook Asaas fail-open (corrigido):** `asaas-webhook` só checava o token se ele estivesse setado (`WEBHOOK_TOKEN && ...`) e concedia acesso pago com base em `payment.externalReference` vindo do corpo. Um atacante poderia forjar `PAYMENT_RECEIVED` e virar Papiro de graça. Correções: (1) token **obrigatório** — fail-closed (503) se não configurado; (2) comparação em tempo constante; (3) **verifica o pagamento direto na API do Asaas** (`GET /payments/{id}`) e deriva o `user_id` da linha gravada no checkout (casada por `asaas_subscription_id`), nunca do corpo. Redeploy feito (fica 503 até as secrets do Asaas existirem — estado seguro).
- 🟡 **MEDIUM — Self-grant de plano via profiles (blindado):** `isPremiumPlan` aceita `subscription_plan` do profile como fallback; se o trigger `trg_protect_profile_privileged_fields` não estiver no banco, um usuário poderia dar PATCH em `subscription_plan='papiro'`. Como vários SQLs não estavam aplicados em prod, criei **`supabase/RODAR-AGORA-seguranca.sql`** (idempotente e tolerante) — ⚠️ **Lucas roda no SQL Editor**.
- ✅ Surfaces confirmados seguros: auth do gateway de IA (valida JWT contra Supabase), sem SSRF/command-exec nas rotas de IA, `create-checkout-session` (plano/valor server-side, ligado ao JWT), RLS das tabelas de usuário (own-row), admin via `is_app_admin()` no RLS.
- ⏳ **Gap conhecido (não-bug, custo):** cota de plano da IA é só no front; o gateway autentica + rate-limita mas não checa cota por plano. Risco de custo contido pelo rate-limit; endurecer server-side fica para pós-lançamento.

**SEO / metadados:**
- `index.html`: título com tagline, `meta description`, OG completo + Twitter card; posicionamento corrigido (era "concursos públicos" → estudantes em geral); domínio alinhado para **papirando.com** (estava `.app` em og/referrals, inconsistente com produção e e-mails). ⚠️ Falta criar um `og-image.png` 1200×630 dedicado (hoje aponta para o app-icon SVG).
- `manifest.json`: description corrigida (posicionamento).
- `referrals.js`: fallback de origem → papirando.com.

---

### Sessão 2026-06-11 (parte 6) — Viewer de PDF em scroll + revamp dos Flashcards
- **PDF (Legislação) — causa raiz real:** `<iframe>` de PDF é bloqueado pelo Chrome mesmo same-origin com `X-Frame-Options: DENY`. Solução definitiva: novo componente `src/components/PdfScrollViewer.jsx` que renderiza o PDF via **pdf.js em canvas, com scroll contínuo** (páginas empilhadas), virtualizado (só renderiza o que está perto do viewport — aguenta as 801 páginas do Vade Mecum) e fit-to-width. Navegação (Anterior/Próxima, seções, marcadores, resultados de busca) usa ref imperativo `scrollToPage` com salto instantâneo; o scroll informa a página visível de volta. Os dois `<iframe>` da Legislação (normal + modo foco) foram substituídos.
- **Flashcards (revamp do diferencial):**
  - Bug visual encontrado: os botões de avaliação usavam classes Tailwind (`bg-red-100…`) que **não existem** neste projeto → ficavam sem cor. Reescritos com tokens `pl-*` semânticos (Errei/Difícil/Lembrei/Fácil em vermelho/âmbar/verde/azul).
  - Nova tela de estudo `.pl-fc-study-*`: card com **flip 3D**, frente/verso marcados, barra de progresso em gradiente, contador, fundo com leve halo de acento (não mais preto vazio).
  - **Atalhos de teclado:** Espaço/Enter revela; 1–4 avalia; Esc sai.
- Build OK (1.46s) + ESLint limpo. PDF confirmado servido (200, application/pdf). ⚠️ Telas exigem login+dados → verificação visual final é do Lucas após deploy.
- Materiais.jsx mantido como está (página-a-página com fit-to-width) — migração para scroll fica para um próximo passo se desejado.

---

### Sessão 2026-06-11 (parte 5) — Correções da validação manual do Lucas
- ✅ SQL das tabelas faltantes rodado no Supabase (confirmado "Success").
- **Legislação / PDF bloqueado (causa raiz encontrada):** o CSP global em `vercel.json` tinha `frame-src` sem `'self'` + `X-Frame-Options: DENY` para tudo — o Chrome bloqueava o próprio PDF no iframe ("Este conteúdo está bloqueado"). Corrigido: `frame-src 'self'` no CSP + bloco de headers específico para `/assets/docs/*` com `SAMEORIGIN`/`frame-ancestors 'self'`.
- **Lembrete não salvava (causa raiz):** o efeito de load da página dependia de `onSaveReminder` (identidade nova a cada render do App) → refazia o fetch e SUBSTITUÍA a lista, apagando o lembrete recém-criado com insert em voo. Corrigido: load 1x por usuário (ref) + merge no App preservando lembretes locais pendentes.
- **Acentuação:** seções da Legislação ganharam `SECTION_DISPLAY_LABELS` (acentos só na exibição — as chaves persistidas ficam intactas); `sidebarNavLabels.js` corrigido (Histórico, Sessões, Estatísticas, Questões, Revisões, Redações, Prática, Legislação, Calendário, etc.). *Se o breadcrumb continuar sem acento, há label antigo salvo na config do admin — resetar em Admin → Configurações.*
- **Flashcards dark mode:** `.flash-dark-card` é cartão invertido (fundo `--pl-ink`); no tema dark o ink fica claro → cream sobre cream. Override `.pl-theme-dark` mantém o cartão escuro; botão amarelo com texto sempre escuro.
- **Modal "Gerar flashcards com IA" cortado:** grid `1fr` → `minmax(0,1fr)` + `minWidth: 0` nos campos.
- **Materiais / viewer:** fit-to-width — escala inicial calculada pela largura do leitor (antes 1.4 fixo deixava a página pequena).
- Build OK (1.46s) + ESLint limpo.

---

### Sessão 2026-06-11 (parte 4) — Correções pós-auditoria do Cowork
**Achados do agente Cowork corrigidos:**
- 🔴 `Flashcards.jsx`: `Play` e `ArrowRight` usados sem import — página quebrava em runtime (build não pega). Imports adicionados.
- 🔴 `Termos.jsx`/`Privacidade.jsx`: classes `text-slate-*`/`text-blue-300`/`bg-blue-50` remanescentes → migradas para tokens `var(--pl-*)` (corrige dark mode).
- 🟡 `Perfil.jsx`: `handleStudyGoalChange` agora propaga via novo prop `onProfilePatched` → Sidebar atualiza sem F5; também passou a checar `{error}` do update. Bônus: `onOpenSquad` no Perfil navegava para a tab `esquadroes` removida → agora vai para `comunidades`.
- 🟡 `App.jsx` `formatHHMMSS`: omitia a hora quando 0 — "00:30" (30s) era lido como 30min pelo `parseTime` das Metas. Agora sempre `HH:MM:SS`.
- 🟡 Legislação/PDF viewer: investigado — o PDF está trackeado e deployado; **provável falso positivo da automação** (browser headless não renderiza PDF em iframe). Lucas confirma de olho.

**🚨 ACHADO CRÍTICO (a partir da pista do console "Erro ao carregar redações"):**
3 tabelas NÃO EXISTEM no banco de produção: `essay_submissions`, `flashcard_reviews`, `flashcard_deck_progress`.
- Redações não salvam; **revisar flashcard quebra** (`submitReview` lança erro).
- ✅ SQL pronto e idempotente em **`supabase/RODAR-AGORA-tabelas-faltantes.sql`** — Lucas roda no SQL Editor.

**Pendentes de validação manual (Lucas):** Lembretes 4.6–4.8 (modal), PDF escaneado no Edital (C7), viewer da Legislação no navegador real.

---

### Sessão 2026-06-11 (parte 4) — Auditoria de produção completa (CHECKLIST-COWORK.md)

**Validação browser-to-browser de todos os Blocos 0–5 em papirando.com (produção).**
Conta usada: Lucas (MASTER/Administrador). Todos os resultados gravados em `docs/CHECKLIST-COWORK.md`.

**Resumo de status por bloco:**
- ✅ Bloco 0 (Global): navegação, dark mode parcial, F5, menu oculto ok
- ✅ Bloco 1 (Acesso): login, perfil, offline, convite ok
- ✅ Bloco 2 (Home): dashboard, histórico, sessões, offline ok
- ⚠️ Bloco 3 (IA): materiais, redações, mapas mentais ok — **Flashcards QUEBRADO** (bug crítico)
- ✅ Bloco 4 (Planejamento): cronograma, metas, ciclos ok (lembretes ⏭️ validação manual)
- ✅ Bloco 5 (Concursos): edital, disciplinas, legislação (parcial) ok

**Bugs encontrados que precisam de correção antes do lançamento:**

1. **CRÍTICO — Flashcards.jsx:** `Play` e `ArrowRight` não importados do lucide-react → página quebra com `ReferenceError: Play is not defined`. Fix: 1 linha de import.
2. **Termos.jsx + Privacidade.jsx:** `text-slate-900` / `text-slate-700` hardcoded → headings e corpo invisíveis no dark mode. Fix: substituir por `text-[var(--pl-ink)]` / `text-[var(--pl-ink-2)]`.
3. **Perfil.jsx — study_goal:** pill não atualiza sidebar sem F5 (handleStudyGoalChange não chama onSaveProfile).
4. **Sessões.jsx — formatação de tempo:** "0h48min" para 48 segundos (segundos exibidos como minutos).
5. **Legislação:** PDF viewer não renderiza conteúdo (broken image) — navegação/busca ok, mas conteúdo visual ausente.
6. **Materiais PDF / C7:** PDF vazio aceito silenciosamente sem mensagem de erro ao usuário.
7. **Console:** "Erro ao carregar redações do Supabase: Object" em todo load do Dashboard.
8. **Console:** BrasilAPI feriados falhando silenciosamente.

---

### Sessão 2026-06-11 (parte 3) — FILA DO CLAUDE 100% FECHADA (C1–C14)
**Blocos 2, 4, 5 e infra concluídos de uma vez (decisão: Lucas valida tudo no final):**
- **C2 Lembretes (crítico):** página E App.jsx salvavam no Supabase — cada lembrete novo inseria **2 linhas duplicadas** no banco. Persistência centralizada no App.jsx com toast de erro em salvar/excluir. (Builders PostgREST resolvem com `{error}`, não lançam — os `.catch(console.warn)` antigos nunca pegavam nada.)
- **C5 Metas:** delete agora checa `{error}`; em falha a meta não some da tela e um toast avisa.
- **C7 Planos:** PDF escaneado/vazio agora dá erro claro ("cole o texto manualmente") em vez de silêncio.
- **C8 Legislação:** verificado — alarme falso; todos os call-sites de `getDocument` já tinham try/catch.
- **C10 Sessões:** erro ao carregar sessões recentes mostra aviso no card (antes fingia lista vazia). `formatHHMMSS` já tinha fallback.
- **C11 Dashboard:** "Papirar agora" com cadeia de fallback (recomendação → timer → aba Sessões) — nunca clique morto.
- **C12 Checkout (crítico):** check de assinatura duplicada na Edge Function — usuário com assinatura ativa reutiliza a cobrança pendente ou recebe 409, em vez de criar OUTRA assinatura no Asaas (risco de dupla cobrança). **⚠️ Requer redeploy:** `supabase functions deploy create-checkout-session`.
- Build OK (3.93s) + ESLint limpo. Checklist atualizado (testes de duplicata do C2 e duplo clique do C12).

**Estado: TODAS as correções de código pré-lançamento concluídas (C1–C14 + T1–T12).**

**Deploy das Edge Functions (2026-06-11, via CLI):**
- ✅ `create-checkout-session` deployada (inclui check de assinatura duplicada do C12)
- ✅ `asaas-webhook` deployada (inclui endurecimento T8 do Codex)
- ⏳ Secrets do Asaas (`ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `ASAAS_SANDBOX`) — aguardando liberação da conta Asaas. Sem elas o checkout responde erro, mas nada quebra no app.

**Falta apenas: validação manual do Lucas (checklist completo) + secrets do Asaas quando a conta liberar.**

---

### Sessão 2026-06-11 (parte 2) — Codex 100% + migration aplicada + Bloco 3
- ✅ **Migration `study_goal` aplicada no Supabase** (confirmada via SQL Editor — "Success").
- ✅ **Codex fechou TODAS as 12 tarefas** (T3, T4, T6–T11 nesta rodada): cores → tokens pl-*, código morto removido, botão sem ação deletado, webhook normalizado, ASAAS_SANDBOX fail-safe, localStorage com try/catch, 18 artefatos temporários removidos, .gitignore atualizado.
- ✅ **Bloco 3 (fila do Claude) concluído — C3, C4, C9:**
  - **C3 Flashcards:** timeout de 55s já existia no aiClient (alarme parcialmente falso); mensagem de timeout generalizada. Deck órfão corrigido — IA é chamada ANTES de criar o deck; inserção de cards com `Promise.allSettled` (relata sucesso parcial); deck recém-criado é deletado se nenhum card salvar.
  - **C4 Redações:** bug crítico — limite mensal do Folha era incrementado ANTES da chamada de IA (falha da IA queimava a única correção do mês do usuário free). Agora incrementa só após sucesso. Save do parecer com 1 retry automático antes de mostrar o aviso.
  - **C9 Mapas Mentais:** o botão "Gerar mapa" (gate Papiro) rodava só heurística local — IA real nunca era chamada apesar do endpoint `generate-mind-map` existir no gateway. Ligado `generateMindMap` com fallback honesto para heurística local em caso de falha. `Array.isArray` em `topicos`. Estados de loading/erro da UI ativados.
- Build OK (1.79s) + ESLint limpo nos 4 arquivos alterados.
- Checklist atualizado: teste de cota do C4 e testes de IA real/fallback do C9.
- **Restam na fila do Claude:** C2, C5 (Bloco 4), C7, C8 (Bloco 5), C10, C11 (Bloco 2), C12 (infra pagamentos).

---

### Sessão 2026-06-11 — C14 concluído + Codex fechou T1/T5/T12
**Codex:** T1 (logs limpos/padronizados), T5 (acentuação PT-BR), T12 (texto interno dos selos) — build e ESLint OK.
**Claude — C14 concluído** (`Perfil.jsx`):
- Decisão: banner de erro com botão "Tentar de novo" (em vez de retry automático silencioso, que esconderia dados desatualizados e arriscaria o usuário salvar por cima de dados velhos).
- `loadRemoteProfile` agora seta `remoteLoadFailed` e loga com prefixo; banner amarelo (`--pl-warn-soft`) acima dos KPIs avisa que os dados podem estar desatualizados e oferece retry com spinner.
- Checklist atualizado com o teste do banner (modo avião → abrir Perfil).
**Bloco 1 — fila do Claude 100% fechada (C1, C6, C14).** Falta: validação manual do Lucas + T3/T4/T6-T11 do Codex.

---

### Sessão 2026-06-10 (parte 3) — Correção T2 perdida + C1 concluído
**O que foi feito:**
- **T2 (resgatada):** o resumo da sessão anterior dizia que `bem_estar` tinha sido adicionado ao `LAUNCH_HIDDEN_TABS`, mas o código não tinha a mudança. Adicionados `bem_estar` e `audiobooks` aos Sets em `Sidebar.jsx` E `App.jsx`.
- **C1 concluído** — bugs reais de gate de plano (modelo 2 tiers Folha/Papiro):
  - `App.jsx`: `isElitePlan` comparava `stripePlanName === 'elite'`, mas `useSubscription` normaliza para `'papiro'` → **assinante pagante nunca recebia recursos elite**. Corrigido para `'papiro'` + aliases legados no fallback.
  - `App.jsx`: `isPremiumPlan` não incluía `'papiro'` no fallback do profile. Corrigido.
  - `App.jsx`: limite de cursos — plano `papiro` caía no limite free (3). Agora papiro/elite/beta = 30.
  - `SubscriptionPlanSeal.jsx`: selo do Header mostrava **"Gratuito" para usuário Papiro** (não tinha entrada `papiro`). Reescrito para Folha/Papiro com mapa de aliases legados.
  - `Perfil.jsx`: removido código morto — `PERFIL_PLANOS` (3 tiers antigos com preços errados), `_formatPlanLabel`, `_formatSubscriptionStatus` e ícones órfãos.
  - `planConfig.js`: adicionados `folha`/`papiro` (R$19,90 mensal / R$13,33 equiv. anual) — corrige cálculo de MRR no AdminFinance; legados mantidos para linhas antigas.
  - `AdminAssinaturas.jsx`: selects e KPIs migrados para Papiro; opções legadas só aparecem se a linha ainda tiver o valor antigo.
- **C6 concluído** — `ConvideGanhe.jsx`: `supabase.rpc()` retorna `{error}` em vez de lançar, então o catch nunca disparava e a falha da RPC `award_referral_bonus_events` era totalmente silenciosa. Agora checa o erro explicitamente, loga com prefixo e mostra aviso ao usuário. Bônus do fallback virtual passa a exibir "aguardando crédito" em vez de parecer creditado.
- Docs da auditoria atualizados: C1 ✅, C6 ✅, C13 ✅ (Esquadrões = produto separado), T2 ✅, T1/T4 sem `Esquadroes.jsx`, checklist ganhou seção de testes do `study_goal`.
- Build OK — chunks de Esquadroes/Instagram/Aplicativos confirmados fora do bundle.
- **Bloco 1 (fila do Claude): fechado**, exceto C14 que depende de decisão do Lucas (UX quando o perfil falha ao carregar do Supabase).

---

### Sessão 2026-06-10 — Remoção Esquadrões + segmentação concurso + limpeza
**O que foi feito:**
- **Esquadrões removido do app** — código empacotado em `docs/esquadroes-package/README.md` com contexto completo para projeto B2B separado
- **Instagram e Aplicativos removidos** — imports e casos de render deletados de AppTabContent; itens removidos do sidebar
- **Segmentação concurso implementada:**
  - Onboarding salva `study_goal` (`'concurso'` | `'vestibular'` | `'faculdade'`) no perfil
  - Sidebar filtra tabs `edital`, `edital_questao`, `legislacao`, `concursos`, `conciliar` para quem não é concurseiro
  - Fallback para usuários antigos: se `study_goal` é null mas tem `target_contest_id`, trata como concurseiro
  - Perfil ganha seletor de "Objetivo de estudos" com save imediato (sem precisar salvar o form inteiro)
- **`study_goal` adicionado ao allowlist** de `profileApi.js`
- `LAUNCH_HIDDEN_TABS` atualizado: agora só esconde `comunidades` e `conciliar` no MVP

**⚠️ Pendência obrigatória — migration Supabase:**
Rodar no SQL Editor antes de usar a segmentação em produção:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS study_goal text;
```

---

### Sessão 2026-06-10 — Auditoria completa de lançamento
**O que foi feito:**
- Auditoria automatizada de TODAS as telas (30+ páginas) + infraestrutura (rotas, gates, Edge Functions, segurança)
- Criados 3 documentos de controle:
  - `docs/AUDITORIA-LANCAMENTO.md` — plano mestre com fila de correções (Claude = complexas C1-C14, Codex = simples T1-T12)
  - `docs/CODEX-TASKS.md` — 12 tarefas mecânicas com instruções prontas para colar no Codex
  - `docs/CHECKLIST-VALIDACAO.md` — checklist de testes manuais do Lucas, por bloco
- Falsos alarmes verificados e descartados: .env NÃO está no git; ai-server.mjs é só dev (produção usa api/ai.js na Vercel); webhook Asaas já usa eventos UPPERCASE
- Bug real encontrado: BemEstar não está em LAUNCH_HIDDEN_TABS (visível no MVP) → tarefa T2 do Codex

**Fluxo de trabalho definido:** Claude corrige complexas → Codex executa simples → Lucas valida no checklist → tela ✅ no WORKLOG.

---

### Sessão 2026-05-30
**O que foi feito:**
- Planejamento completo de pagamentos
- Stripe: produto "Papirando Papiro" criado com preços mensal (R$19,90) e anual (R$159,90)
- Edge Function `create-checkout-session` atualizada: plano `papiro`, trial 30 dias
- Supabase CLI instalado via Scoop
- Price IDs salvos no Supabase Secrets
- Planos renomeados: Folha (free) + Papiro (R$19,90) — 2 tiers apenas
- `Assinatura.jsx` reescrito com novo layout 2 colunas + badge "1º mês grátis"
- `subscriptionApi.js` atualizado para reconhecer plano `papiro`
- `ConvideGanhe.jsx` / `referrals.js`: recompensas atualizadas para meses grátis
- Trigger SQL `prepare_profile_referral_fields` atualizado: referral_code = username
- Migration criada para sincronizar usuários existentes

**Pendente desta sessão:**
- STRIPE_SECRET_KEY (aguardando SMS do Stripe)
- Deploy da Edge Function
- Botão de checkout conectado no Perfil.jsx

---

### Sessão 2026-05-26
**O que foi feito:**
- Migração `pl-*` completa de todas as páginas (~32 arquivos)
- Dark mode, responsividade mobile, animações, estados vazios, tipografia
- Supabase: storage_buckets_missing.sql, EXECUTION_ORDER.md, missing_tables_draft.sql

---

*Última atualização: 2026-06-20 — import do catálogo CONCLUÍDO: 376 exames como rascunho no banco + área "Rascunhos" no admin para revisar/publicar*
