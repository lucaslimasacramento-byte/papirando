# Papirando — Worklog de Sessão

> **LEIA ISSO PRIMEIRO.** Este arquivo registra o que foi feito e o que vem a seguir.
> Toda vez que uma tarefa é concluída, registre aqui antes de encerrar a sessão.

---

## Status geral

| Frente | Status |
|---|---|
| Migração `pl-*` — todas as páginas (`src/pages/`) | ✅ 100% concluído |
| Migração `pl-*` — componentes (`src/components/`) | ✅ 100% concluído |
| `PageHeadPremium.jsx` removido (componente orphan) | ✅ Concluído |
| Supabase — buckets faltantes + RLS | ✅ `supabase/storage_buckets_missing.sql` criado |
| Supabase — ordem de execução dos scripts | ✅ `supabase/EXECUTION_ORDER.md` criado |
| Supabase — rascunho das 6 tabelas sem schema | ✅ `supabase/missing_tables_draft.sql` criado (validar antes de aplicar) |
| **Dark mode — toggle implementado** | ✅ Concluído (toggle no Header, persiste em localStorage) |
| **Responsividade mobile** | ✅ Concluído (grids, modais, header) |
| **Animações (`pl-ai-shimmer`, etc.)** | ✅ Concluído |
| **Estados vazios e de loading** | ✅ Concluído |
| **Tipografia de conteúdo longo** | ✅ Concluído (pl-prose criada, sem containers de prosa longa identificados nas páginas atuais) |

---

## Plano detalhado — Polish visual

### Fase 1 — Dark mode *(prioridade alta — afeta tudo)*

**Objetivo:** garantir que `.pl-theme-dark` funciona em 100% dos componentes e páginas.

**Tarefas:**
- [x] Auditar `src/App.jsx` — classe `pl-theme-dark` aplicada em `document.documentElement` via `useEffect`, persiste em `localStorage` com chave `pl-dark`
- [x] Toggle no Header — botão Moon/Sun entre notificações e perfil; props `darkMode` + `onToggleDarkMode` passadas do App
- [x] Audit completo de `src/pages/` e `src/components/` — hardcodes mapeados
- [x] Corrigidos em `src/pages/`: Ciclos (migração completa), AdminConfiguracoes (migração completa), AdminConcursos linhas 2100-3080, Dashboard, Login, MetasSemana, Redacoes, Historico, Comunidades
- [x] Corrigidos em `src/components/`: AppOverlays, SimuladosRankingPanel, AdminAudiobookCatalogEditor, Conciliador
- [x] Casos especiais preservados: TimerOverlay (dark intencional), focus mode Legislacao (#050816), player Audiobooks, bloco CompatibilityGauge do Conciliador, texto sobre pastéis de disciplina (#1e293b fixo)
- [ ] Testar visualmente no browser após login — verificar se páginas chave respondem bem ao toggle

**Arquivos-chave:**
- `src/index.css` — definição dos tokens dark
- `src/App.jsx` — lógica de toggle
- `src/components/Header.jsx` — botão de toggle

---

### Fase 2 — Responsividade mobile *(prioridade alta)*

**Objetivo:** app funcionando corretamente em telas de 375px a 768px.

**Tarefas por página (verificar e corrigir):**
- [ ] Dashboard — KPI strip (grid 4 cols → 2 cols em mobile)
- [ ] Planejamento / Ciclos — tabelas de horário (scroll horizontal ou reflow)
- [ ] Simulados — tabela de questões (scroll ou cards em mobile)
- [ ] Flashcards — deck de cards (tamanho e padding em tela pequena)
- [ ] Redacoes — painel de critérios (layout lateral → vertical)
- [ ] Esquadroes — grid de métricas (4 cols → 2 cols)
- [ ] Planos — accordion de concursos (padding e texto)
- [ ] Sidebar — comportamento em mobile (overlay, hamburguer)
- [ ] Header — layout mobile

**Critério de aceite:** nenhum scroll horizontal indesejado, texto legível, botões clicáveis (min 44px touch target).

---

### Fase 3 — Animações e micro-interações *(prioridade média)*

**Objetivo:** usar as animações definidas no CSS nos lugares corretos.

**Animações disponíveis no `src/index.css`:**
- `pl-ai-shimmer` — shimmer nos elementos de IA (tags IA, botões IA, cards IA)
- `pl-live-pulse` — pulse em indicadores "ao vivo" (timer, streak ativo)
- `pl-gabarito-reveal` — reveal animado ao mostrar gabarito em simulados/flashcards

**Tarefas:**
- [ ] Confirmar que `pl-tag-ai` e `pl-btn-ai` já aplicam `pl-ai-shimmer` via CSS (checar `src/index.css`)
- [ ] Identificar indicadores "ao vivo" que deveriam ter `pl-live-pulse` (TimerOverlay, streak no Dashboard)
- [ ] Identificar onde `pl-gabarito-reveal` deveria ser aplicado (SimuladosRankingPanel, Flashcards reveal)
- [ ] Aplicar as classes faltantes

---

### Fase 4 — Estados vazios e de loading *(prioridade média)*

**Objetivo:** toda lista/tabela/grid tem estado vazio visual consistente e skeleton de loading.

**Padrão a seguir:**
```jsx
{/* Estado vazio */}
<div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--pl-ink-3)' }}>
  <IconeRelevante size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
  <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Nada aqui ainda</p>
  <p style={{ fontSize: 13 }}>Descrição curta do que fazer para popular.</p>
</div>
```

**Páginas a revisar:**
- [ ] Flashcards — lista de baralhos vazia
- [ ] Materiais — lista de materiais vazia
- [ ] Simulados — histórico vazio
- [ ] Questoes — resultado de busca vazio
- [ ] Comunidades — feed vazio
- [ ] MapasMentais — galeria vazia
- [ ] Revisoes — fila vazia
- [ ] Redacoes — lista vazia

---

### Fase 5 — Tipografia de conteúdo longo *(prioridade baixa)*

**Objetivo:** páginas com texto corrido têm estilos de prosa adequados.

**Páginas afetadas:** Legislacao, Edital, Materiais (viewer de PDF), Audiobooks (transcrição).

**Tarefas:**
- [ ] Definir classe `pl-prose` em `src/index.css` com line-height, max-width, espaçamento de parágrafos — usando `--pl-serif` para títulos e `--pl-sans` para corpo
- [ ] Aplicar `pl-prose` nos containers de conteúdo longo de cada página

---

## Registro de sessões

### Sessão anterior (data aprox. 2026-05-26)
**O que foi feito:**
- Migração `pl-*` completa de todas as páginas (`src/pages/`) — ~32 arquivos
- Migração `pl-*` de Sidebar.jsx e Header.jsx
- Flashcards.jsx, Simulados.jsx, Questoes.jsx, Revisoes.jsx, Materiais.jsx, Audiobooks.jsx, Legislacao.jsx, Edital.jsx, Redacoes.jsx, MapasMentais.jsx, MetasSemana.jsx, Assinatura.jsx, DisciplinaDetalhe.jsx, Comunidades.jsx migrados
- Esquadroes.jsx e Planos.jsx migrados (última sessão)
- PageHeadPremium.jsx deletado (orphan)
- Supabase: storage_buckets_missing.sql, EXECUTION_ORDER.md, missing_tables_draft.sql criados

**Próximos passos:**
- Todas as 5 fases de polish concluídas ✅
- Próxima frente a definir com o usuário (ex: testes, deploy, novas features)

---

*Última atualização: 2026-05-26*
