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
| Dashboard | `Dashboard.jsx` | 🔧 | Código auditado ✅ (mobile corrigido). Falta: "Meta diária" usa 180min fixo (não a meta real) + validar dados no app |
| Estatísticas | `Estatisticas.jsx` | 🔧 | Código auditado ✅ (simulados placeholder ocultados). Falta: validar gráficos com dados reais |
| Histórico | `Historico.jsx` | ✅ | — |
| Sessões de Estudo | `Sessoes.jsx` | 🔧 | Código auditado ✅ (aba "Guiada" morta removida). Falta: validar timer/gravação no app |

---

### 🟢 BLOCO 3 — Ferramentas de estudo (core IA)

| Tela | Arquivo | Status | O que falta |
|---|---|---|---|
| Materiais (upload + processamento) | `Materiais.jsx` | 🔧 | Código auditado ✅ (cota só após upload OK). Falta: testar upload real + endurecer error-handling de deletes/leituras |
| Questões (banco de questões) | `Questoes.jsx` | 🔧 | Código auditado ✅ (token de borda + no-op + código morto). Falta: confirmar trava do limite diário no backend |
| Simulados | `Simulados.jsx` | 🔧 | Código auditado ✅ (gating consistente, placeholders). Falta: mover incremento de cota p/ o save do modal; ranking fake |
| Flashcards | `Flashcards.jsx` | 🔧 | Código auditado ✅ (try/catch nos handlers, métricas falsas removidas). SRS correto. Falta: testar geração IA no app |
| Redações (correção por IA) | `Redacoes.jsx` | ✅ | Código auditado — sólido. Bug de cota confirmado corrigido (incrementa só após IA), save com retry+feedback, upload validado |
| Revisões | `Revisoes.jsx` | ✅ | Código auditado — sólido (4 imports órfãos removidos). Falta: catch silencioso da fila não dá feedback; card "Histórico" é placeholder estático |
| Mapas Mentais | `MapasMentais.jsx` | ✅ | Código auditado — sólido. IA real + fallback confirmados; guarda Array.isArray adicionada. Bloco 3 COMPLETO |

---

### 🟢 BLOCO 4 — Planejamento e organização

| Tela | Arquivo | Status | O que falta |
|---|---|---|---|
| Planejamento | `Planejamento.jsx` | 🔧 | Código auditado ✅ (label, no-op, código morto). Flag: "Gerar com IA" não persiste/não vira plano (#1); questoes_meta derivado (#4) |
| Ciclos de Estudo | `Ciclos.jsx` | 🔧 | Código auditado ✅ (no-op + campo morto). Flag: modo de edição decorativo, marcar-concluída sem UI, "Ciclos completos" sempre ≤1 |
| Metas da Semana | `MetasSemana.jsx` | ✅ | — |
| Objetivos | `Objetivos.jsx` | ✅ | Código auditado — sólido. Flag: 4 handlers async sem catch (falha silenciosa ao estourar limite de cursos) → entra no passe de error-handling |
| Lembretes e Calendário | `LembretesCalendario.jsx` | 🔧 | Código auditado ✅ (bugs históricos resolvidos, código morto removido). Flag: sem UI de editar/excluir lembrete manual (componentes existem mas não renderizados) |

---

### 🟡 BLOCO 5 — Concursos (nicho específico)

| Tela | Arquivo | Status | O que falta |
|---|---|---|---|
| Concursos Disponíveis | `ConcursosDisponiveis.jsx` | 🔧 | Código auditado ✅ (off-by-one cargos, dark mode estados vazios, código morto). Flag: import/add sem catch |
| ~~Meus Concursos~~ | ~~`MeusConcursos.jsx`~~ | ✅ | REMOVIDO — página morta (não renderizada); coberto por Objetivos |
| Detalhe do Concurso | `ConcursoDetalhe.jsx` | 🔧 | Código auditado ✅ (fuso dias-para-prova, import morto). Flag: cores hardcoded no hero (polish) |
| Edital | `Edital.jsx` | 🔧 | ⏳ PRÓXIMA — Validar análise por IA |
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

1. ✅ ~~Pagamentos~~ — **concluído** (Asaas funcionando end-to-end, ver seção PAGAMENTOS)
2. **Passar pelo Bloco 2** (Dashboard + Estatísticas) — validar dados reais
3. **Passar pelo Bloco 3** (ferramentas IA) — testar cada feature com Gemini
4. (opcional) Cadastrar domínio no Asaas → reativa redirect pós-pagamento
5. (pré-lançamento) Confirmar `ASAAS_SANDBOX=false`

---

## Registro de sessões

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

**🔖 ONDE PARAMOS (atualizado 2026-06-18):** Blocos 2, 3 e 4 **COMPLETOS**. Próximo: **Bloco 5 — Concursos** (Concursos Disponíveis, Meus Concursos, Concurso Detalhe, Edital, Questão de Edital, Legislação, Planos de Concurso; Disciplinas e Detalhe de Disciplina já ✅). Depois Bloco 6 (Comunidade).

**Pendências transversais acumuladas (passe dedicado depois):**
- Endurecer `{error}` em deletes/leituras silenciosas (Materiais; handlers do Objetivos e ConcursosDisponiveis sem catch → falha silenciosa no limite de cursos).
- **Fuso na contagem "dias para a prova":** normalizar `today` para meia-noite (`setHours(0,0,0,0)`) onde calcula diffDays. Corrigido em ConcursoDetalhe; ainda existe em `App.jsx` (~2107, alimenta Dashboard/Objetivos). Aplicar lá também.
- Features pela metade flagged: cronograma "Gerar com IA" não persiste (Planejamento); modo de edição de Ciclo decorativo + marcar-concluída sem UI (Ciclos); editar/excluir lembrete manual sem UI (Lembretes); incremento de cota no save do modal de Simulado; ranking fake (Simulados).

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

*Última atualização: 2026-06-18 — auditoria Blocos 2, 3 e 4 COMPLETOS; próximo Bloco 5*
