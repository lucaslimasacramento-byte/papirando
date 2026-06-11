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

## PAGAMENTOS — Status atual (2026-05-30)

| Item | Status |
|---|---|
| Produto "Papirando Papiro" criado no Stripe | ✅ |
| Preço mensal R$19,90 (`price_1Tcxk2DVbtxivpXmRjpQYTr5`) | ✅ |
| Preço anual R$159,90 (`price_1TcxlpDVbtxivpXmAXdi753f`) | ✅ |
| Price IDs salvos no Supabase Secrets | ✅ |
| Edge Function `create-checkout-session` atualizada (plano `papiro` + trial 30d) | ✅ |
| `STRIPE_SECRET_KEY` no Supabase Secrets | ⏳ Aguardando SMS do Stripe |
| Deploy da Edge Function | ⏳ Depende da secret key |
| Botão de checkout conectado no Perfil.jsx | ⏳ Depende do deploy |
| PIX ativado no Stripe Dashboard | 🔧 Fazer em Settings → Payment methods |

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
| Assinatura (tab no perfil) | `Assinatura.jsx` | 🔧 | Deploy Asaas (API Key pendente) |
| Convide e Ganhe | `ConvideGanhe.jsx` | ✅ | — |
| Termos de Uso | `Termos.jsx` | ✅ | — |
| Privacidade | `Privacidade.jsx` | ✅ | — |

---

### 🟢 BLOCO 2 — Home e visão geral

| Tela | Arquivo | Status | O que falta |
|---|---|---|---|
| Dashboard | `Dashboard.jsx` | 🔧 | Validar dados reais (KPIs, streaks, resumo IA) |
| Estatísticas | `Estatisticas.jsx` | 🔧 | Validar gráficos com dados reais |
| Histórico | `Historico.jsx` | ✅ | — |
| Sessões de Estudo | `Sessoes.jsx` | 🔧 | Validar timer e gravação de sessão |

---

### 🟢 BLOCO 3 — Ferramentas de estudo (core IA)

| Tela | Arquivo | Status | O que falta |
|---|---|---|---|
| Materiais (upload + processamento) | `Materiais.jsx` | 🔧 | Testar upload real + geração IA |
| Questões (geração por IA) | `Questoes.jsx` | 🔧 | Testar geração com Gemini, limites free/papiro |
| Simulados | `Simulados.jsx` | 🔧 | Testar fluxo completo + correção |
| Flashcards | `Flashcards.jsx` | 🔧 | Testar geração IA + repetição espaçada |
| Redações (correção por IA) | `Redacoes.jsx` | 🔧 | Testar correção com Gemini, limites free/papiro |
| Revisões | `Revisoes.jsx` | 🔧 | Validar fila de revisão e algoritmo |
| Mapas Mentais | `MapasMentais.jsx` | 🔧 | Testar geração IA + salvar |

---

### 🟢 BLOCO 4 — Planejamento e organização

| Tela | Arquivo | Status | O que falta |
|---|---|---|---|
| Planejamento | `Planejamento.jsx` | 🔧 | Validar cronograma gerado |
| Ciclos de Estudo | `Ciclos.jsx` | 🔧 | Validar ciclos e timer Pomodoro |
| Metas da Semana | `MetasSemana.jsx` | ✅ | — |
| Objetivos | `Objetivos.jsx` | 🔧 | Validar criação e progresso |
| Lembretes e Calendário | `LembretesCalendario.jsx` | 🔧 | Validar criação e notificações |

---

### 🟡 BLOCO 5 — Concursos (nicho específico)

| Tela | Arquivo | Status | O que falta |
|---|---|---|---|
| Concursos Disponíveis | `ConcursosDisponiveis.jsx` | 🔧 | Validar catálogo e filtros |
| Meus Concursos | `MeusConcursos.jsx` | 🔧 | Validar inscrição e acompanhamento |
| Detalhe do Concurso | `ConcursoDetalhe.jsx` | 🔧 | Validar dados e cronograma |
| Edital | `Edital.jsx` | 🔧 | Validar análise por IA |
| Questão de Edital | `EditalQuestao.jsx` | 🔧 | Validar fluxo |
| Disciplinas | `Disciplinas.jsx` | ✅ | — |
| Detalhe de Disciplina | `DisciplinaDetalhe.jsx` | ✅ | — |
| Legislação | `Legislacao.jsx` | 🔧 | Validar busca e leitura |
| Planos de Concurso | `Planos.jsx` | 🔧 | Validar geração de plano |

---

### 🟡 BLOCO 6 — Comunidade e social

| Tela | Arquivo | Status | O que falta |
|---|---|---|---|
| Comunidades | `Comunidades.jsx` | 🔧 | Validar feed, posts e moderação |
| Esquadrões | `Esquadroes.jsx` | 🔧 | Validar criação e membros |

---

### 🔴 BLOCO 7 — Pós-lançamento (não bloqueia MVP)

| Tela | Arquivo | Status | Motivo |
|---|---|---|---|
| Audiobooks | `Audiobooks.jsx` | ⏳ | Conteúdo ainda não populado |
| Bem-Estar | `BemEstar.jsx` | ⏳ | Feature secundária |
| Conciliador | `Conciliador.jsx` | ⏳ | Feature complexa, pós-MVP |
| Instagram | `Instagram.jsx` | ⏳ | Integração opcional |
| Aplicativos | `Aplicativos.jsx` | ⏳ | Diretório pós-MVP |

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

## BACKLOG PÓS-LANÇAMENTO

| Item | Descrição |
|---|---|
| 📱 Verificação de celular por SMS | Twilio ou Z-API — validar número antes de salvar no perfil |
| 📧 Template de e-mail personalizado | Supabase → Authentication → Email Templates → Reset Password |

---

## PRÓXIMOS PASSOS IMEDIATOS

1. **Conseguir STRIPE_SECRET_KEY** (aguardando SMS) → deploy da Edge Function → checkout funcionando
2. **Conectar botão de checkout no Perfil.jsx** (onSelectPlan → startStripeCheckout)
3. **Ativar PIX no Stripe** (Settings → Payment methods → Pix)
4. **Passar pelo Bloco 2** (Dashboard + Estatísticas) — validar dados reais
5. **Passar pelo Bloco 3** (ferramentas IA) — testar cada feature com Gemini

---

## Registro de sessões

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

*Última atualização: 2026-05-30*
