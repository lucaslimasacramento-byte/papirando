# Prompt · Aplicar redesign da tela Histórico

Cole este prompt no Claude Code (ou IA equivalente) que tem acesso ao repositório `papirando`. O screenshot de referência está em `handoff/screenshots/09-Historico-redesign.png`.

---

## Prompt para colar

> A tela **Histórico** (rota `/historico`, componente provavelmente `src/pages/Historico.jsx`) precisa ser redesenhada para seguir a nova identidade visual do Papirando (brandbook v1.0).
>
> **Referência visual:** veja `handoff/screenshots/09-Historico-redesign.png` no projeto. O código HTML/CSS completo da nova tela está em `handoff/Tela Historico - redesign.html` — use-o como fonte de verdade para tipografia, espaçamento, cores e estrutura.
>
> **O que mudar (em ordem de prioridade):**
>
> 1. **Substituir o banner de gradiente azul** no topo da página por um **page header editorial em light** com fundo paper-warm (`#fbfaf6`):
>    - Borda `1px solid var(--rule-2)` e raio 8px
>    - **Textura de pauta** sutil no fundo: `repeating-linear-gradient(0deg, transparent 0 35px, rgba(20,17,13,0.035) 35px 36px)` aplicado via `::before` — simula linhas de caderno
>    - **Canto dobrado (dog-ear)** no topo direito via `::after`: triângulo 72×72px em `var(--paper-soft)` com `clip-path: polygon(100% 0, 0 0, 100% 100%)` e bordas interna esquerda + inferior em `rule-2` — vocabulário direto do logomark
>    - Tile **ink** à esquerda (64×64, raio 4) com SVG do ícone de histórico em paper. Sombra sutil `0 2px 6px rgba(20,17,13,0.08)`
>    - Eyebrow `ESTUDOS · TRILHA DO TEMPO` em **accent** `#1e3a5f` (não accent-light) com risco horizontal antes
>    - Título `Histórico.` em Fraunces Italic 300, 48px, **ink**, com o ponto em **accent**
>    - Subtítulo em Fraunces Italic 300, 17px, **ink-2**, palavra `análise` em italic 500 ink sólido
>    - Stat à direita: número grande em Fraunces Italic 300 ink + label caps tracked em ink-3
>
> 2. **Search bar** abaixo do header:
>    - Background `var(--paper-warm, #fbfaf6)`, borda `var(--rule-2)`, raio 8px
>    - Ícone search à esquerda em ink-3
>    - Placeholder `Buscar por matéria, tópico ou observação…`
>    - Atalho de teclado `⌘ /` em pill mono à direita
>
> 3. **Filtros (chips):**
>    - Label `FILTRO` em caps tracked com ícone funnel
>    - Chips: `Todos · Estudo · Questões · Simulado · Revisão`
>    - Chip ativo: bg ink, color paper, border ink
>    - Chip inativo: bg paper-warm, color ink-2, border rule-2
>    - Contador `0 / 0` em JetBrains Mono à direita
>
> 4. **Seção "Linha do tempo":**
>    - Container com bg `paper-warmer (#f7f2e6)`, borda `rule-2`, raio 8px
>    - Header da seção: eyebrow `LINHA DO TEMPO` + título `Registros por matéria` (Fraunces Italic 22px) + ícones de ação à direita (grid view, more)
>
> 5. **Estado vazio:**
>    - Tile com canto dobrado (vocabulário da marca), bordas rule-2, 80×80
>    - Ícone book aberto ou similar em ink-3
>    - Título `Nada registrado ainda.` em Fraunces Italic 26px com ponto accent
>    - Descrição editorial com tom Papirando (não SaaS): mencionar matéria/dia, evitar tom apressado
>    - CTA primário `▶ Papirar agora` em ink solid (mesmo padrão do "Papirar agora" da sidebar)
>    - Link secundário em accent com underline: "Ou explore o edital verticalizado antes de começar"
>
> **Tokens CSS a usar (já devem estar em `src/index.css` da entrega anterior — handoff `tokens.css`):**
> - `--paper` `#f3efe5`, `--paper-warm` `#fbfaf6`, `--paper-warmer` `#f7f2e6`
> - `--ink` `#14110d`, `--ink-2` `#3a342c`, `--ink-3` `#847b6c`
> - `--accent` `#1e3a5f`, `--accent-light` `#93b4ff`
> - `--rule` `rgba(20,17,13,0.08)`, `--rule-2` `rgba(20,17,13,0.16)`
> - Fontes: Fraunces (serif italic) e Plus Jakarta Sans (sans) — já carregadas via Google Fonts no projeto.
>
> **O que NÃO mudar:**
> - Lógica de filtros/busca/agrupamento (só os estilos)
> - Estrutura de dados ou queries do Supabase
> - Top bar superior (Dashboard/Questões/...) — já está correta
> - Sidebar dark — já foi atualizada
>
> **Critério de aceite:**
> - O banner azul gradiente desapareceu
> - O page header é ink solid + tipografia editorial
> - Estado vazio é editorial, não tem mais o "Nenhum registro ainda" genérico
> - Nenhuma cor `#1d4ed8`, `#185fa5`, `from-blue-*`, `from-indigo-*` ficou no arquivo
> - Funciona em dark mode (já que tudo usa tokens, deve atravessar sem ajuste extra)
>
> Depois de aplicar, me mostre um diff resumido das mudanças no `Historico.jsx` (sem o código completo, só as seções principais).

---

## Arquivos a anexar/referenciar quando colar o prompt

| Arquivo | Onde está | Por quê |
|---|---|---|
| `handoff/screenshots/09-Historico-redesign.png` | screenshot do redesign | Referência visual primária |
| `handoff/Tela Historico - redesign.html` | HTML completo do redesign | Source of truth para CSS exato, estrutura, dimensões |
| `handoff/tokens.css` | tokens CSS | Já deve estar plugado, mas confere |
| `handoff/00-INDEX.md` | índice do brandbook | Contexto geral |

> **Dica:** se a IA do codebase aceitar múltiplos anexos, mande todos os 4. Se for limitada a 1, mande só o screenshot — o prompt tem detalhe suficiente para guiar.
