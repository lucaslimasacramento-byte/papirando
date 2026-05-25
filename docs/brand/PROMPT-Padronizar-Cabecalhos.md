# Prompt · Padronizar cabeçalhos de página (pl-page-head)

Cole no Claude Code (ou IA equivalente com acesso ao codebase `papirando`).

**Anexos para mandar junto:**
- `handoff/Padrao Cabecalho de Pagina.html` — spec visual (abrir no browser pra ver as 4 variantes)
- `handoff/screenshots/10-Padrao-cabecalho.png` — screenshot do spec
- Os 2 screenshots do usuário marcando ❌ Edital e ❌ Histórico vs ✅ Meus cursos e ✅ Biblioteca

---

## Prompt

> Padronizar **cabeçalhos de página** em todo o produto Papirando. Hoje algumas páginas (Dashboard, Meus cursos, Biblioteca) seguem o padrão correto — título grande em itálico direto sobre o papel —, mas várias outras envolvem o título numa caixa `<section className="pl-card-paper">`, criando um banner que quebra a linguagem editorial. **Eliminar todas as caixas em cabeçalhos de página.**
>
> **Duas mudanças, aplicadas juntas:**
>
> ### Mudança 1 · Adicionar a classe canônica `.pl-page` no `src/index.css`
>
> ```css
> .pl-page {
>   width: 100%;
>   max-width: 1680px;
>   margin: 0 auto;
>   padding: 22px 32px 40px;
>   display: flex;
>   flex-direction: column;
>   gap: 24px;
> }
> @media (max-width: 720px) {
>   .pl-page { padding: 16px 18px 32px; }
> }
> ```
>
> ### Mudança 2 · Substituir o wrapper raiz de toda página pela `.pl-page`
>
> Em todas as páginas em `src/pages/`, trocar o wrapper raiz pela classe `pl-page`. Exemplos:
>
> | Página | Antes | Depois |
> |---|---|---|
> | `Historico.jsx:69` | `<div className="page-shell flex h-full min-h-0 flex-col !gap-3 !pb-6 !pt-4 animate-in fade-in duration-500 sm:!pt-5">` | `<div className="pl-page">` |
> | `MeusConcursos.jsx:14` | `<div className="pl-app pl-mc-shell">` | `<div className="pl-page">` |
> | `Aplicativos.jsx:18` | `<div className="pl-app pl-paper-bg-soft pl-app-shell">` | `<div className="pl-page">` |
> | `BemEstar.jsx:298` | `<div className="pl-app pl-paper-bg-soft pl-be-shell">` | `<div className="pl-page">` |
> | `Audiobooks.jsx:299` | `<div className="pl-app pl-paper-bg-soft pl-audio-shell">` | `<div className="pl-page">` |
> | `Conciliador.jsx:1125` | `<div className="pl-app pl-paper-bg-soft pl-conc-shell">` | `<div className="pl-page">` |
> | `ConvideGanhe.jsx:373` | `<div className="pl-app pl-paper-bg-soft pl-cg-shell">` | `<div className="pl-page">` |
> | `EditalQuestao.jsx:493` | `<div className="pl-app pl-paper-bg-soft pl-edital-shell">` | `<div className="pl-page">` |
> | `Legislacao.jsx:479` | `<div className="pl-app pl-paper-bg-soft pl-leg-shell">` | `<div className="pl-page">` |
> | `MapasMentais.jsx:579` | `<div className="pl-app pl-paper-bg-soft pl-mapa-shell">` | `<div className="pl-page">` |
> | `Materiais.jsx:788` | `<div className="pl-app pl-paper-bg-soft pl-mat-shell">` | `<div className="pl-page">` |
> | `Redacoes.jsx:629` | `<div className="pl-app pl-paper-bg-soft pl-redacao-shell">` | `<div className="pl-page">` |
> | `Planejamento.jsx:145` | `<div className="page-shell">` | `<div className="pl-page">` |
> | `Questoes.jsx:253` | `<div className="page-shell flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden !pb-2 !pt-3 animate-in fade-in duration-500 lg:gap-2.5 sm:!pt-4">` | `<div className="pl-page" style={{ overflow: 'hidden' }}>` (manter overflow se Questões precisar) |
> | `Esquadroes.jsx:2039` | `<div className="pl-app pl-paper-bg-soft pl-esq-shell">` | `<div className="pl-page">` |
>
> **Páginas que hoje NÃO têm wrapper raiz visível** (Dashboard, Planos, ConcursosDisponiveis, LembretesCalendario, Disciplinas, Edital, Estatisticas, MetasSemana, Sessoes, Flashcards, Revisoes, Simulados): adicionar `<div className="pl-page">` envolvendo todo o conteúdo retornado.
>
> ### Mudança 3 · Remover wrappers `pl-card-paper` em cabeçalhos
>
> Continua aplicando o que foi definido antes &mdash; remover `<section className="pl-card-paper" style={{ padding: 28 }}>` que envolve `<h1 className="pl-display">` em:
> Edital.jsx:232, Disciplinas.jsx:239, Estatisticas.jsx:118, MetasSemana.jsx:538, Planejamento.jsx:1184, Sessoes.jsx:148.
>
> ## Estrutura final esperada
>
> ```jsx
> <div className="pl-page">
>   <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 32, alignItems: 'end' }}>
>     <div>
>       <h1 className="pl-display" style={{ margin: 0, fontSize: 56, color: 'var(--pl-ink)' }}>
>         Título<span style={{ color: 'var(--pl-accent)' }}>.</span>
>       </h1>
>       <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 660, lineHeight: 1.5 }}>
>         Subtítulo.
>       </p>
>     </div>
>     {/* ações/stats à direita */}
>   </header>
>
>   {/* resto do conteúdo da página */}
> </div>
> ```
>
> **A estrutura padrão (b):**
> ```jsx
> <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 32, alignItems: 'end' }}>
>   <div>
>     {/* eyebrow opcional */}
>     <span className="pl-eyebrow">Eyebrow</span>
>
>     {/* título — pl-display + ponto azul */}
>     <h1 className="pl-display" style={{ margin: 0, fontSize: 56, color: 'var(--pl-ink)' }}>
>       Título<span style={{ color: 'var(--pl-accent)' }}>.</span>
>     </h1>
>
>     {/* subtítulo */}
>     <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 660, lineHeight: 1.5 }}>
>       Subtítulo em tom Papirando.
>     </p>
>   </div>
>   {/* direita: ações, stats, ou seletor — pode omitir */}
>   <div>...</div>
> </header>
> ```
>
> **Referência (já corretos, não mexer):**
> - `src/pages/Planos.jsx:612-640` — função `PlanosHeader` ("Meus cursos.")
> - `src/pages/ConcursosDisponiveis.jsx:435-450` — função `ConcursosHeader` ("Biblioteca.")
> - `src/pages/Dashboard.jsx:160-180` e `:495-505`
>
> **Arquivos a corrigir:**
>
> | Arquivo | Linha | O que fazer |
> |---|---|---|
> | `src/pages/Edital.jsx` | L232 | Remover `<section className="pl-card-paper" style={{ padding: 28 }}>` que envolve o título. Manter conteúdo, ajustar grid pra `1fr auto` (não `1fr 320px`). O seletor "Edital ativo" vai pra coluna da direita. |
> | `src/pages/Disciplinas.jsx` | L239, L545 | L239 é cabeçalho da página — remover wrapper. L545 verificar contexto (pode ser card interno legítimo, manter). |
> | `src/pages/Estatisticas.jsx` | L118 | Remover wrapper. Stats podem ir pra direita do header como `stat-tile`. |
> | `src/pages/MetasSemana.jsx` | L538 | Remover wrapper. Seletor de semana vai pra direita. L724 verificar (provável card interno). |
> | `src/pages/Planejamento.jsx` | L1184 | Remover wrapper. CTA + seletor pra direita. |
> | `src/pages/Sessoes.jsx` | L148 | Remover wrapper. L293 verificar contexto. |
> | `src/pages/Flashcards.jsx` | L69 | Auditar se está plano ou com wrapper. Padronizar. |
> | `src/pages/LembretesCalendario.jsx` | L527 | Auditar e padronizar. |
> | `src/pages/Revisoes.jsx` | L391 | Auditar — provavelmente já plano. |
> | `src/pages/Simulados.jsx` | L275 | Auditar — provavelmente já plano. |
>
> **Tokens (já existem no `src/index.css`):**
> - `.pl-display` — Fraunces italic 300, herdam de `:root`
> - `.pl-eyebrow` — caps tracked em ink-3
> - `var(--pl-ink)`, `var(--pl-ink-2)`, `var(--pl-ink-3)`
> - `var(--pl-accent)` — `#1e3a5f`
> - `.pl-btn`, `.pl-btn-primary`, `.pl-btn-ai` (com aura)
>
> **`pl-card-paper` continua válido** para cards internos do conteúdo da página (lista de disciplinas, ranking, cards de questões, empty states). A regra é APENAS: **não usar como wrapper do título da página**.
>
> **Padrões de font-size do título:**
> - `fontSize: 56` (padrão Planos/Biblioteca) — *use este por default*
> - `clamp(44px, 5vw, 78px)` (atual de várias páginas) → substituir por `56` fixo, mantém consistência
>
> **Critério de aceite:**
> 1. Visualmente: todas as páginas listadas têm o título direto sobre o paper, sem moldura
> 2. `grep -rn "pl-card-paper" src/pages/` mostra **apenas usos em cards internos** (não em wrappers de título)
> 3. Todas as páginas listadas usam `<header>` com grid `1fr auto` e `pl-display` no h1
> 4. Ponto azul (`<span style={{ color: 'var(--pl-accent)' }}>.</span>`) presente no fim de TODOS os títulos
>
> Depois de aplicar, me mostre o diff resumido (sem código completo) por arquivo modificado.

---

## Notas para o desenvolvedor humano (você)

Se quiser, posso criar um componente React `<PlPageHead>` reutilizável que encapsula essa estrutura. Vantagem: 1 mudança no componente propaga em todas as páginas. Desvantagem: refatoração maior — cada página precisa importar e adaptar.

Por ora, o prompt acima faz o trabalho **sem novo componente** — só padroniza o JSX inline. É o caminho de menor risco para garantir o efeito visual rapidamente. Depois, em segundo passe, dá pra extrair o componente.
