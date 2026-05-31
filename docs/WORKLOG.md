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
