# Tarefas para o Codex — Correções mecânicas

> **Como usar:** cole UMA tarefa por vez no Codex. Cada tarefa é autossuficiente.
> Marque `[x]` quando concluída e validada.
>
> **Regras gerais para TODAS as tarefas (incluir no prompt do Codex):**
> - Projeto React+Vite. Use SEMPRE aspas retas ASCII `"` em JSX — aspas curvas quebram o build.
> - Arquivos são UTF-8. Textos do app são PT-BR com acentuação correta.
> - Cores: nunca hardcode hex/rgba — use `var(--pl-*)` (tokens definidos em `src/index.css`).
> - NÃO altere lógica, só o que a tarefa pede. Não "aproveite para melhorar" nada.
> - Após editar, rode `npm run build` para confirmar que nada quebrou.

---

## T1 — Limpar console.log/warn/error de desenvolvimento
- [x] **Arquivos:** `src/pages/Login.jsx`, `src/pages/Perfil.jsx`, `src/pages/ConvideGanhe.jsx`, `src/pages/Sessoes.jsx`, `src/pages/Materiais.jsx`, `src/pages/Questoes.jsx`, `src/pages/Flashcards.jsx`, `src/pages/Comunidades.jsx`
> ~~Esquadroes.jsx~~ removido da lista — saiu do app (vira produto separado), não mexer.

**Instrução:** Em cada arquivo, encontre todos os `console.log`, `console.warn` e `console.error`. Regra:
- Se está dentro de um `catch` e é o ÚNICO tratamento do erro → **mantenha** (Claude vai tratar depois), apenas padronize para `console.error` com prefixo do arquivo, ex: `console.error('[Perfil] erro ao salvar:', error)`.
- Se é log informativo/debug fora de catch (ex: logando estado, resposta de API em sucesso) → **delete a linha**.
- NÃO remova console.error de Error Boundaries (componentDidCatch).

## T2 — Esconder BemEstar no modo MVP
- [x] **CONCLUÍDA pelo Claude (2026-06-10).** `bem_estar` e `audiobooks` adicionados ao `LAUNCH_HIDDEN_TABS` em `Sidebar.jsx` E `App.jsx` (as duas constantes precisam ficar sincronizadas). Nada a fazer.

## T3 — Cores hardcoded → tokens pl-* (lote 1: Dashboard, Historico, Estatisticas)
- [x] **Arquivos:** `src/pages/Dashboard.jsx`, `src/pages/Historico.jsx`, `src/pages/Estatisticas.jsx`

**Instrução:** Substitua cores hex/rgba hardcoded por CSS vars:
- `Dashboard.jsx`: procure por `#1e3a5f` (aparece em botão de tutorial e badge "Guia inicial") → troque por `var(--pl-accent)`. Procure `#14110d` e `#f4d04e` (logo do onboarding) — esses são cores de marca do logo, PODE MANTER, apenas adicione um comentário `/* cores fixas da marca */`.
- `Historico.jsx`: localize `TYPE_PALETTE` no topo do arquivo (objeto com `#2557a7`, `#c05621`, `#305e22`, `#3730a3` em campos `stripe`/`text`). Troque: `#2557a7`→`var(--pl-accent)`, `#c05621`→`var(--pl-warn)`, `#305e22`→`var(--pl-success)`, `#3730a3`→`var(--pl-accent)`. Procure também `#305e22` usado em MiniMetric (cor de acerto >= 70%) → `var(--pl-success)`.
- `Estatisticas.jsx`: procure `#1e3a5f` em tutorialStep → `var(--pl-accent)`.

## T4 — Cores hardcoded → tokens pl-* (lote 2: Flashcards, ConcursoDetalhe, Termos, Privacidade)
- [x] **Arquivos:** `src/pages/Flashcards.jsx`, `src/pages/ConcursoDetalhe.jsx`, `src/pages/Termos.jsx`, `src/pages/Privacidade.jsx`
> ~~Esquadroes.jsx~~ removido da lista — saiu do app (vira produto separado), não mexer.

**Instrução:**
- `Flashcards.jsx`: no objeto `COLOR_STYLES` há `#f3f0ff`, `#7c3aed`, `#6d28d9` — são a paleta roxa dos decks; troque por `var(--pl-accent-soft)`, `var(--pl-accent)`, `var(--pl-accent)` respectivamente. Procure `color: '#fff'` em botões de delete → `var(--pl-surface)`.
- `ConcursoDetalhe.jsx`: procure `#1e3a8a` (fallback de imagem) → `var(--pl-accent)`.
- `Termos.jsx` e `Privacidade.jsx`: no wrapper externo há um gradiente `from-slate-900 via-[#0f172a] to-blue-900` — substitua o wrapper por fundo `var(--pl-bg)` com texto `var(--pl-ink)`, mantendo a estrutura da página.

## T5 — Corrigir typos e acentuação PT-BR
- [x] **Arquivos:** `src/pages/Dashboard.jsx`, `src/pages/Ciclos.jsx`, `src/pages/MetasSemana.jsx`, `src/pages/LembretesCalendario.jsx`, `src/pages/Questoes.jsx`, `src/pages/Planejamento.jsx`

**Instrução:** Corrija APENAS texto visível ao usuário (strings em JSX/labels). NÃO altere nomes de variáveis, ids, keys ou rotas:
- `Dashboard.jsx`: "Precisao" → "Precisão"; "Estatisticas" (label de botão/link) → "Estatísticas".
- `Ciclos.jsx`: "Organizacao" → "Organização"; "Horarios" → "Horários".
- `MetasSemana.jsx` e `LembretesCalendario.jsx`: procure a string corrompida "Quest?es" → "Questões".
- `LembretesCalendario.jsx`: procure "&amp;" dentro de string JSX (título "Lembretes &amp; calendário") → troque por "&" simples (em JSX, `&` literal funciona em texto).
- `Questoes.jsx`: procure "questoes" sem acento em mensagens visíveis → "questões".
- `Planejamento.jsx`: revise mensagens "Nao foi possivel..." → "Não foi possível..." (só em strings visíveis).
- Faça uma varredura extra em cada um destes arquivos por palavras sem acento óbvias em labels: "Nao", "voce", "possivel", "Configuracao", "Revisao" e corrija.

## T6 — Remover código morto
- [x] **Arquivo:** `src/pages/ConvideGanhe.jsx`

**Instrução:** Localize o componente `StatCardDark` (definido mas nunca usado no JSX). Confirme com busca que `StatCardDark` não aparece em nenhum outro lugar do projeto, então delete a definição inteira.

## T7 — Botão sem ação em Estatísticas
- [x] **Arquivo:** `src/pages/Estatisticas.jsx`

**Instrução:** Localize o botão com texto "Matérias padronizadas" (classe `pl-btn-ghost`, sem onClick). Ele não faz nada. **Delete o botão** (decisão: feature não existe no MVP). Se ele estiver dentro de um container flex com outros botões, confira que o layout continua ok.

## T8 — Endurecer webhook Asaas (normalização de evento)
- [x] **Arquivo:** `supabase/functions/asaas-webhook/index.ts`

**Instrução:** Na linha `const event = String(body.event ?? '');` adicione normalização: `const event = String(body.event ?? '').toUpperCase().trim();`. Não mude mais nada.

## T9 — Fallback seguro do ASAAS_SANDBOX
- [x] **Arquivo:** `supabase/functions/create-checkout-session/index.ts`

**Instrução:** Localize onde `ASAAS_SANDBOX` é lido via `Deno.env.get`. Hoje, se a env var não estiver setada, o código pode cair em produção acidentalmente. Inverta a lógica para "seguro por padrão": se a variável NÃO estiver definida explicitamente como `'false'`, use sandbox. Ou seja: `const isSandbox = Deno.env.get('ASAAS_SANDBOX') !== 'false';`. Adicione um comentário: `// produção exige ASAAS_SANDBOX=false explícito`.

## T10 — try/catch em localStorage
- [x] **Arquivo:** `src/pages/EditalQuestao.jsx`

**Instrução:** Localize chamadas diretas a `localStorage.setItem(...)` sem try/catch. Envolva cada uma em `try { ... } catch { /* storage cheio ou bloqueado — ignora */ }`. Não altere a lógica.

## T11 — Limpar lixo de desenvolvimento da raiz
- [x] **Arquivos:** raiz do projeto + `.gitignore`

**Instrução:**
1. Delete da raiz: `tmp_pcba_oficial.pdf`, `tmp_pcba_oficial.txt`, `tmp_pcba_text.txt`, `inicio-5176.png`, `materiais-empty-preview.png`, `materiais-empty.png`, `materiais-pdfs-preview.png`, a pasta `.tmp-previews/` e qualquer `.tmp-vite-*.log`.
2. Adicione ao `.gitignore` (se ainda não estiverem): `tmp_*`, `*.tmp`, `.tmp-previews/`, `.tmp-vite-*.log`, `*-preview.png`.
3. NÃO delete `scripts/replace_security_tab.py` sem confirmar com o Lucas — apenas pergunte.

## T12 — Texto interno visível no Perfil
- [x] **Arquivo:** `src/pages/Perfil.jsx`

**Instrução:** Procure a string "Admin > Configurações > Selos" (instrução interna que está aparecendo para o usuário). Avalie o contexto: se for um texto de ajuda/placeholder vazado, substitua por um texto adequado ao usuário final (ex: "Os selos são concedidos pela equipe Papirando.") ou remova o trecho. Não altere a lógica ao redor.

---

## Registro de conclusão

| Tarefa | Concluída em | Validada por Lucas |
|---|---|---|
| T1 | 2026-06-11 | |
| T2 | | |
| T3 | 2026-06-11 | |
| T4 | 2026-06-11 | |
| T5 | 2026-06-11 | |
| T6 | 2026-06-11 | |
| T7 | 2026-06-11 | |
| T8 | 2026-06-11 | |
| T9 | 2026-06-11 | |
| T10 | 2026-06-11 | |
| T11 | 2026-06-11 | |
| T12 | 2026-06-11 | |
