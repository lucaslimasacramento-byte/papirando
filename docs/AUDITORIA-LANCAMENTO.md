# Auditoria de Lançamento — Plano de Trabalho

> Gerado em 2026-06-10 por auditoria automatizada completa (7 agentes, 30+ telas + infraestrutura).
> **Como funciona a divisão:**
> - 🤖 **CLAUDE** — correções complexas (lógica, integração, fluxo). Feitas aqui nas sessões.
> - ⚡ **CODEX** — correções mecânicas. Instruções prontas em [`CODEX-TASKS.md`](CODEX-TASKS.md).
> - 👤 **LUCAS** — validação manual. Checklist em [`CHECKLIST-VALIDACAO.md`](CHECKLIST-VALIDACAO.md).

---

## Resumo executivo

**O app está em bom estado estrutural.** Nenhuma tela tem build quebrado, as rotas todas resolvem, o design system `pl-*` está aplicado, e as telas pós-MVP estão escondidas (com 1 exceção). Os problemas se concentram em 3 categorias:

1. **Falhas silenciosas** — várias telas engolem erros do Supabase/IA com `console.warn` e o usuário nunca fica sabendo (Lembretes, ConvideGanhe, Metas, Perfil).
2. **IA sem timeout/feedback** — gerações longas (Flashcards, Redações, Mapas) podem congelar a UX sem aviso.
3. **Acabamento** — cores hardcoded que quebram dark mode, typos de acentuação, console.log de dev.

**Falsos alarmes descartados na verificação:** `.env`/`.env.local` NÃO estão no git (estão corretamente ignorados); `ai-server.mjs` tem 91 KB e é só para dev (produção usa o gateway `api/ai.js` na Vercel); o webhook Asaas já trata os eventos no formato UPPERCASE oficial.

---

## 🤖 Fila do CLAUDE (correções complexas, em ordem de prioridade)

### Prioridade 1 — Bloqueia lançamento
| # | Tela/Área | Problema | Status |
|---|---|---|---|
| C1 | `Perfil.jsx` + gates globais | Nomenclatura de planos legada (`tatico`/`elite`) — **CONCLUÍDO 2026-06-10.** Bugs reais corrigidos: `isElitePlan` nunca era true para assinante Papiro (App.jsx); limite de cursos do Papiro caía no free (3); selo do Header mostrava "Gratuito" para Papiro. Código morto removido do Perfil; planConfig e AdminAssinaturas atualizados para 2 tiers. | ✅ |
| C2 | `LembretesCalendario.jsx` | **CONCLUÍDO 2026-06-11.** Bug pior encontrado: a página E o App.jsx salvavam no Supabase — **cada lembrete novo inseria 2 linhas no banco**. Persistência centralizada no App.jsx, com erro visível (toast) em salvar e excluir. Nota: builders do PostgREST resolvem com `{error}` (não lançam) — os `.catch(console.warn)` antigos nunca capturavam nada. | ✅ |
| C3 | `Flashcards.jsx` | **CONCLUÍDO 2026-06-11.** Timeout já existia (55s no aiClient — alarme parcialmente falso); mensagem de timeout generalizada (era específica de PDF). Deck órfão corrigido: IA chamada ANTES de criar o deck; inserção com `allSettled` + contagem parcial; deck recém-criado é removido se nenhum card salvar. | ✅ |
| C4 | `Redacoes.jsx` | **CONCLUÍDO 2026-06-11.** Bug pior encontrado: limite mensal do Folha era incrementado ANTES da IA — falha da IA queimava a única correção do mês. Agora incrementa só após sucesso. Save do parecer ganhou 1 retry automático + logs com prefixo. | ✅ |
| C5 | `MetasSemana.jsx` | **CONCLUÍDO 2026-06-11.** Delete agora checa `{error}` do PostgREST; em falha, a meta NÃO some da tela e um toast avisa. Antes ela sumia da UI e reaparecia no F5. | ✅ |

### Prioridade 2 — Importante, não bloqueia
| # | Tela/Área | Problema | Status |
|---|---|---|---|
| C6 | `ConvideGanhe.jsx` | RPC `award_referral_bonus_events` — **CONCLUÍDO 2026-06-10.** `supabase.rpc` retorna `{error}` (não lança) e o erro era 100% engolido. Agora checa o erro, loga e avisa o usuário. Bônus virtual (fallback local) agora aparece como "aguardando crédito" em vez de fingir que foi creditado. | ✅ |
| C7 | `Planos.jsx` | **CONCLUÍDO 2026-06-11.** PDF escaneado (só imagem) extraía "com sucesso" vazio e nada acontecia na tela. Agora: texto < 40 chars → erro claro pedindo colar o texto. (Edital.jsx não faz extração de PDF — fora do escopo.) | ✅ |
| C8 | `Legislacao.jsx` | **VERIFICADO — alarme falso.** Todos os 4 call-sites de `getDocument` (Legislacao, Materiais, Planos, AdminConcursos) já estão em try/catch com feedback ao usuário. | ✅ |
| C9 | `MapasMentais.jsx` | **CONCLUÍDO 2026-06-11.** Confirmado: o botão "Gerar mapa" (gate Papiro) rodava só heurística local — a IA real nunca era chamada. Agora usa `generateMindMap` do gateway (endpoint já existia em `api/_ai.js`), com fallback honesto para a heurística local se a IA falhar ("criei uma estrutura básica…"). `Array.isArray` adicionado em `topicos`. Estados `aiMapLoading`/`aiMapError` ligados (a UI já existia). | ✅ |
| C10 | `Sessoes.jsx` | **CONCLUÍDO 2026-06-11.** `formatHHMMSS` já tinha fallback nos pontos de uso (alarme parcial). Erro ao carregar sessões recentes agora mostra aviso no card em vez de fingir lista vazia. | ✅ |
| C11 | `Dashboard.jsx` | **CONCLUÍDO 2026-06-11.** "Papirar agora" com cadeia de fallback: recomendação → timer → aba Sessões. Clique nunca é no-op silencioso. | ✅ |
| C12 | Edge Function `create-checkout-session` | **CONCLUÍDO 2026-06-11.** Check de assinatura duplicada: usuário com assinatura active/trialing reutiliza a URL da cobrança pendente (ou recebe 409) em vez de criar OUTRA assinatura no Asaas — eliminava risco de dupla cobrança. O check também mata o vetor de abuso do rate-limit em memória. ⚠️ Requer redeploy da função. | ✅ |

### Prioridade 3 — Decisão de produto (conversar antes)
| # | Tela/Área | Questão | Status |
|---|---|---|---|
| C13 | `Esquadroes.jsx` | ~~Fórum sem moderação~~ **RESOLVIDO (2026-06-10):** Esquadrões vira produto B2B separado. Removido do app (Sidebar, AppTabContent, App.jsx). Contexto preservado em `docs/esquadroes-package/README.md`. | ✅ |
| C14 | `Perfil.jsx` | **CONCLUÍDO 2026-06-11.** Decisão: banner de erro com botão "Tentar de novo" (retry silencioso esconderia dados desatualizados e arriscaria salvar por cima). Banner avisa que os dados podem estar desatualizados e desencoraja salvar até recarregar. | ✅ |

### Decisões estratégicas (sessão 2026-06-10)
- **Esquadrões** → produto B2B separado (plataforma digital para cursinhos presenciais). Removido do menu e das rotas; arquivos `Esquadroes.jsx`/`squadRemote.js` mantidos como referência.
- **Instagram e Aplicativos** → removidos do menu/rotas definitivamente.
- **Concursos (Edital, Legislação, Concursos, Conciliador)** → só aparecem para concurseiros via `CONCURSO_ONLY_TABS` no Sidebar + campo `study_goal` no perfil (definido no onboarding e editável por pills no Perfil).
- **Comunidades** → segue escondida até ter massa crítica de usuários.
- ⚠️ **MIGRATION PENDENTE no Supabase:** `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS study_goal text;` — sem isso o save do objetivo de estudos falha/é descartado silenciosamente.

---

## ⚡ Fila do CODEX

Instruções detalhadas em [`CODEX-TASKS.md`](CODEX-TASKS.md). Resumo: 12 tarefas mecânicas — limpeza de console.log, cores hardcoded → `var(--pl-*)`, typos de acentuação, esconder BemEstar no MVP, código morto, lixo de dev, endurecimento simples do webhook.

---

## 👤 Validação do LUCAS

Checklist completo em [`CHECKLIST-VALIDACAO.md`](CHECKLIST-VALIDACAO.md). Regra de ouro: **valide cada tela DEPOIS que Claude+Codex fecharem as tarefas dela**, marcando ✅/❌ no próprio checklist.

---

## Fluxo de trabalho por rodada

```
1. CLAUDE corrige itens da fila (1 bloco por sessão)
2. CODEX executa as tarefas do bloco em CODEX-TASKS.md
3. LUCAS valida o bloco no CHECKLIST-VALIDACAO.md
4. Tela ✅ no WORKLOG.md → próximo bloco
```

**Ordem dos blocos:** Bloco 1 (Acesso) → Bloco 3 (IA core — coração do produto) → Bloco 2 (Home) → Bloco 4 (Planejamento) → Bloco 5 (Concursos — só visível para concurseiros). ~~Bloco 6 Esquadrões~~ resolvido: virou produto separado.

---

## Achados por bloco (detalhe)

### Bloco 1 — Acesso e identidade
- **Login.jsx** — OK. Só limpeza de console.warn (Codex).
- **Perfil.jsx** — Atenção. Nomenclatura de planos legada (C1), falta feedback de erro (C14), cores hardcoded e texto interno visível (Codex).
- **Assinatura.jsx** — OK. Mapa de aliases de planos legados mantido por compatibilidade — revisar junto com C1.
- **ConvideGanhe.jsx** — Atenção. RPC silenciosa (C6), código morto `StatCardDark` (Codex).
- **Termos/Privacidade.jsx** — OK. Gradiente hardcoded (Codex).

### Bloco 2 — Home e visão geral
- **Dashboard.jsx** — OK. quickAction undefined (C11), cores e typos (Codex).
- **Estatisticas.jsx** — OK. Botão "Matérias padronizadas" sem onClick (Codex remove ou Claude liga — decidir).
- **Historico.jsx** — Atenção. `TYPE_PALETTE` com hex hardcoded quebra dark mode (Codex).
- **Sessoes.jsx** — Atenção. formatHHMMSS sem fallback (C10).

### Bloco 3 — Ferramentas IA (core)
- **Materiais.jsx** — OK. Mensagem de erro de upload genérica (melhoria pós-MVP).
- **Questoes.jsx** — OK. Verificar import de `buildNotebookQuestions` (C-rápida na próxima sessão), typo (Codex).
- **Simulados.jsx** — OK. Sem achados.
- **Flashcards.jsx** — Atenção. IA sem timeout + deck órfão (C3), cores hardcoded (Codex).
- **Redacoes.jsx** — Atenção. Fluxo IA+save (C4).
- **Revisoes.jsx** — OK. Sem achados críticos.
- **MapasMentais.jsx** — Atenção. Validação frágil + gate premium (C9).

### Bloco 4 — Planejamento
- **Planejamento.jsx** — OK. Typos (Codex).
- **Ciclos.jsx** — OK. Acentos (Codex).
- **MetasSemana.jsx** — Atenção. Delete sem catch (C5), "Quest?es" corrompido (Codex).
- **Objetivos.jsx** — OK. Sem achados.
- **LembretesCalendario.jsx** — Crítico. Persistência silenciosa (C2), `&amp;` literal e typos (Codex).

### Bloco 5 — Concursos
- Todas as 9 telas em estado OK/aceitável. Pontos: extractPdfText (C7), pdfjs (C8), cores hardcoded (Codex).

### Bloco 6/7 — Social e pós-MVP
- **Comunidades.jsx** — OK, com moderação admin completa. Escondida no MVP até massa crítica.
- **Esquadroes.jsx** — removido do app (produto B2B separado). Arquivo mantido como referência.
- **Instagram.jsx / Aplicativos.jsx** — removidos do menu/rotas definitivamente.
- **Telas pós-MVP** — `LAUNCH_HIDDEN_TABS` atualizado (2026-06-10): `comunidades`, `conciliar`, `bem_estar`, `audiobooks`. ✅

### Infraestrutura
- Rotas: todas as tabs têm componente lazy correspondente. OK.
- Gates free/pago: `planLimits.js` + `PremiumGate.jsx` consistentes no front; RLS valida no back. OK.
- Pagamentos: Edge Functions escritas; webhook funcional; melhorias C12.
- IA produção: gateway `api/ai.js` (Vercel) com OpenRouter — `ai-server.mjs` é só dev. OK.
- Lixo de dev na raiz (não trackeado, mas polui): Codex limpa + .gitignore.
