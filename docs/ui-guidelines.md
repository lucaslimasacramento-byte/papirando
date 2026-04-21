# Papirando — Diretrizes de UI

Referência para manter consistência visual entre telas e para a IA não introduzir “estilo genérico” ou quebras de hierarquia. O produto deve parecer **SaaS premium**, não startup descuidada.

---

## Princípios

1. **Neutro frio + um acento:** fundos claros, texto slate; azul só para ação e marca — sem arco-íris de CTAs.
2. **Peso tipográfico contido:** evitar `font-black` e títulos “gritando” em toda página; preferir `font-semibold` nos títulos de seção.
3. **Superfície antes de decoração:** cartões = borda sutil + sombra leve; evitar faixas pesadas e gradientes chamativos fora de momentos pontuais (ex.: selos de plano).
4. **Densidade informacional:** dashboards podem ser ricos, mas com respiro (`gap`, `padding` consistentes com `page-shell`).

---

## Identidade visual

- **Personalidade:** confiável, focada, “ferramenta de trabalho” para estudo — não infantil, não gamer.
- **Sidebar:** tema **escuro** (slate/azul profundo) — **única** área “hero escura” fixa; contraste com o canvas claro; texto sempre legível (`text-slate-50` na raiz do aside para não herdar cor errada).
- **Área principal:** valores em `:root` — `--bg-app` (fundo do app) e `--bg-canvas` (moldura do conteúdo); não introduzir faixas `slate-900`/`950` largas no meio do canvas claro (ver mapa abaixo).

---

## Cores (tokens)

Definidas em `:root` em `src/index.css`. Preferir **variáveis CSS** (`var(--…)`) ou classes Tailwind equivalentes — evitar hex soltos que não existam nesta tabela.

### Tabela de tokens (`:root`)

| Token | Valor (referência) | Uso |
|--------|-------------------|-----|
| `--bg-app` | `#e6ebf2` | Fundo do body / shell externo |
| `--bg-canvas` | `#edf2f8` | Moldura clara do conteúdo principal (`.app-main-canvas`) |
| `--surface` | `#ffffff` | Cartões, modais, listas sobre o canvas |
| `--surface-elevated` | `#ffffff` | Mesmo tom; reservado para hierarquia futura |
| `--text-primary` | `#0f172a` | Títulos, texto principal (Tailwind: `text-slate-900`) |
| `--text-secondary` | `#475569` | Subtítulos, corpo secundário (`text-slate-600`) |
| `--text-muted` | `#64748b` | Metadados, placeholders fortes (`text-slate-500`) |
| `--accent` | `#1d4ed8` | Cor de marca / CTA (equiv. `blue-700`) |
| `--accent-hover` | `#1e40af` | Hover do acento (`blue-800`) |
| `--accent-muted` | rgba azul 8% | Fundos de destaque muito leve |
| `--accent-ring` | rgba azul 22% | Anéis de foco |
| `--border-subtle` | slate ~6% | Bordas discretas (cartões) |
| `--border-default` | slate ~9% | Bordas um pouco mais visíveis |
| `--success` | `#059669` | Conclusão / positivo (`emerald-600` em Tailwind) |
| `--shadow-xs` … `--shadow-md` | — | Elevação; preferir tokens a sombras inventadas |

### Mapa prático: cada cor para cada coisa (canvas claro)

Use isto ao desenhar **headers de página**, **barras de filtro**, **botões** e **chips**.

| O quê | Como aplicar |
|--------|----------------|
| Título da página (H1/H2 do bloco) | `.page-title` ou `text-slate-900` + `font-semibold` |
| Subtítulo / descrição | `.page-subtitle` ou `text-slate-500` / `text-slate-600` |
| Rótulo em caps (ex.: “Filtrar”, “Radar ativo”) | `text-slate-500` ou `text-slate-400`, `text-[10px]`–`text-xs`, `uppercase`, `tracking-*` |
| Superfície de cartão / seção | `.section-card` ou `bg-white` + borda `border-slate-200` / `var(--border-subtle)` |
| **Barra de filtros + ações** colada ao `page-head` | Fundo **`.soft-accent`** + `border-t border-slate-200`; texto e chips no tema **claro** (nunca texto branco sobre faixa escura aqui) |
| Chip / pílula de filtro **ativo** | `border-blue-200 bg-blue-50 text-blue-700` |
| Chip / pílula **inativo** | `border-slate-200 bg-white text-slate-600`; hover: `hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-700` |
| **CTA primário** (ação principal da tela: ex. “Registrar estudo”, “+ Novo lembrete”) | **`.btn-primary`** sempre que o padrão de marca for o azul sólido: fundo **`--accent`** (`#1d4ed8` / `blue-700`), texto **branco** (`#fff`), `hover:bg-blue-800`. Pode ficar no `page-head` branco **ou** na barra **`.soft-accent`** — é o mesmo componente visual. |
| **CTA secundário** na mesma linha (ex.: “Abrir calendário”, “Nova disciplina”) | `.btn-secondary` — `bg-white`, `border-slate-200`, `text-slate-700` |
| Link ou ênfase inline | `text-blue-700` / `hover:text-blue-800` |
| Estado de sucesso | `text-emerald-600`, bordas `emerald-*`, ou `--success` |
| Estado destrutivo / excluir | `text-red-600`, `border-red-200`, `bg-red-50` (hover do botão: `red-600`) |
| **Overlay de modal** | `bg-slate-950/55` + `backdrop-blur-sm` (não usar como barra de ferramentas) |
| **Sidebar** | Exceção: fundo **escuro** dedicado (não replicar no conteúdo) |

**Botão primário (referência visual):** preenchimento `#1d4ed8` (`--accent` / Tailwind `bg-blue-700`), **texto e ícones brancos**; cantos `rounded-lg` (ver `.btn-primary` em `index.css`).

**Planos (selo no header):** gratuito (neutro), tático (gradiente azul), elite (âmbar/dourado) — ver `SubscriptionPlanSeal.jsx`; animações: `seal-plan-gratuito`, `seal-plan-tatico`, `seal-plan-elite` em `index.css`.

---

## Tipografia

- **Família:** Plus Jakarta Sans (Google Fonts), com fallback `Segoe UI`, `system-ui`, sans-serif.
- **Corpo:** tamanhos `text-sm` / `text-base` com `leading-relaxed` em blocos longos.
- **Títulos de página:** classes `.page-title` / `.page-subtitle` ou equivalente (`text-lg`/`text-xl` + `font-semibold` + `tracking-tight`).
- **Títulos compactos:** `.compact-title` / `.compact-copy` para blocos densos.

Evitar empilhar muitos tamanhos diferentes na mesma viewport; máximo **3 níveis** claros (página → seção → rótulo).

---

## Layout

- **Largura máxima do conteúdo:** `max-w-[1320px]` (`.page-shell`, `.app-main-shell`). Há regras de utilitário em `index.css` que normalizam `max-w-*` legados dentro de `main` para **1320px** e padding horizontal responsivo.
- **Espaçamento vertical:** `.page-shell` usa `gap-5` / `lg:gap-6`, `pb-12`, padding lateral `px-4` → `lg:px-6`.
- **Cabeçalho de página:** `.page-head` — bloco único no topo com título, subtítulo e slot de ações (flex responsivo).
- **Shell:** `.app-shell` + `.app-main-canvas` envolvem o conteúdo principal.

---

## Componentes padrão

### Cartões

- **Padrão:** `.surface-card` ou `.section-card` (borda + sombra leve).
- **Destaque:** `.surface-card-elevated` quando precisar de mais hierarquia.
- **KPI / métrica pequena:** `.kpi-card` (sombra desligada, borda sutil).

### Botões

- **Primário:** `.btn-primary` — azul sólido (`blue-700` / `--accent`), **texto e ícone brancos**, `rounded-lg`, sombra leve; hover `blue-800`. Único padrão para CTAs principais (ex.: “Registrar estudo”, “+ Novo lembrete”), **incluindo** sobre `.soft-accent` quando quiser o mesmo destaque da captura de referência.
- **Secundário:** `.btn-secondary` (branco, borda slate).
- **Estados de foco:** usar `focus-visible` padrão do `index.css` (ring azul suave).

### Badges

- **Neutro:** `.neutral-badge` / `.premium-badge`.
- **Marca / destaque leve:** `.brand-badge`.

### Painéis com tom de “destaque suave”

- `.soft-accent` — gradiente azul **muito** contido; a **ação principal** da faixa usa o mesmo **`.btn-primary`** que no restante do app (azul + branco).

### Tabelas e listas densas

- Fundo branco/superfície, cabeçalho com `text-slate-500`, `text-xs font-semibold uppercase` ou equivalente só quando fizer sentido (não padronizar uppercase em toda lista).
- Bordas `border-slate-100` / `divide-y` com cor alinhada a `--border-subtle`.
- Em mobile: priorizar **scroll horizontal** ou **cards empilhados** em vez de tabelas largas quebradas.

### Dashboard

- Primeira dobra: `.page-head` + KPIs em grid (`grid` + `.kpi-card` ou `.section-card`).
- Blocos subsequentes: `.section-card` com título `font-semibold` e ação alinhada à direita no mesmo row quando possível.
- Gráficos e números: preferir **uma** cor de destaque (azul ou success), não múltiplas séries coloridas sem legenda.

---

## Sidebar e navegação

- Itens ativos: contraste alto no tema escuro; ícones alinhados e label com `truncate` / `min-w-0` onde necessário.
- **Nav:** estrutura em coluna (`flex-col`); não colocar filhos do nav em fluxo horizontal por engano.
- Mobile: drawer/overlays devem respeitar o mesmo tokens de superfície e botões.

---

## Acessibilidade e detalhes

- Contraste mínimo WCAG para texto primário sobre superfície.
- `focus-visible` em controles interativos; não remover outline sem substituto.
- `::selection` já usa tom de acento suave — manter consistência.

---

## Anti-padrões (não fazer)

- Cores hex aleatórias por tela que não mapeiam aos tokens.
- **Faixas horizontais largas** (`slate-900`, `slate-950`, navy `#18365C`, etc.) **no miolo do canvas claro** para toolbar de filtro ou ações — quebra a paleta; usar **`.soft-accent`** + chips claros (ver mapa acima). A sidebar escura **não** é modelo para o conteúdo.
- `font-black` em títulos longos ou em massa.
- Gradientes agressivos fora dos selos de plano / hero muito justificado.
- Larguras máximas diferentes de 1320px sem atualizar as utilities globais em `index.css`.
