# Papirando — Guia de Contexto para o Claude

## ⚠️ LEIA ANTES DE QUALQUER COISA

### 1. Worklog — sempre atualizado
O arquivo [`docs/WORKLOG.md`](docs/WORKLOG.md) é o centro de controle do projeto. Contém:
- Status de pagamentos (Asaas — aguardando liberação da conta)
- **Plano tela a tela** — auditoria de produção com 50 páginas catalogadas em 8 blocos
- Registro de todas as sessões anteriores

**Toda vez que concluir uma tarefa, atualize o WORKLOG.md** — marque o status da tela e registre o que foi feito.

### 2. Modo de trabalho atual — Auditoria tela a tela

Estamos em fase de **revisão página por página** para identificar o que está pronto para produção e o que fica para depois. O fluxo de trabalho é:

1. Usuário diz qual tela quer revisar (ou a gente segue a ordem dos blocos do WORKLOG)
2. Claude abre o arquivo, analisa o estado atual e aponta:
   - O que está funcionando
   - O que está quebrado ou incompleto
   - O que precisa de ajuste antes do lançamento
3. Corrige o que for rápido na hora
4. Atualiza o status no WORKLOG.md (✅ / 🔧 / ⏳)

**Ordem sugerida dos blocos:** Bloco 1 → 2 → 3 → 4 → 5 → 6 (ver WORKLOG.md)

### 3. Pagamentos — status atual
- Plataforma: **Asaas** (substituiu Stripe)
- Edge Function `create-checkout-session` → reescrita para Asaas ✅
- Edge Function `asaas-webhook` → criada ✅
- **Aguardando:** liberação da conta Asaas para pegar API Key e fazer deploy
- Quando liberar: setar secrets no Supabase + deploy das 2 funções + conectar botão no Perfil.jsx

---

## O que é esse projeto

**Papirando** é um app de estudos pessoal com IA — para qualquer estudante (universitário, autodidata, vestibulando, concurseiro). O posicionamento é: *"O estúdio onde o seu material vira estudo de verdade."* Stack: **React + Vite + Tailwind CSS + Supabase**. Interface web SPA com autenticação, dashboard de estudo, simulados, lembretes, comunidade, IA (Gemini) integrada e muito mais.

---

## Paths importantes

| Item | Caminho |
|---|---|
| Projeto principal | `C:\Users\lucas\Desktop\App_Estudos\papirando` |
| Worktree ativo (branch de redesign) | `C:\Users\lucas\Desktop\App_Estudos\papirando\.claude\worktrees\mystifying-meitner-f6e09b` |
| CSS tokens (fonte da verdade) | `src/index.css` |
| Páginas | `src/pages/` |
| Componentes | `src/components/` |
| Dev server | `http://localhost:5176` (launch.json já configurado) |
| **Identidade visual (handoff completo)** | `docs/brand/` — ler `docs/brand/00-INDEX.md` antes de criar qualquer UI |
| Roadmap | `docs/ROADMAP.md` |
| SVGs de marca | `docs/brand/brand/` (favicon, lockups, mark, wordmarks) |

> **Sempre trabalhe no worktree**, não no projeto principal, salvo orientação explícita do usuário.

---

## Identidade visual — sistema `pl-*`

O projeto usa um sistema de design tokens editorial chamado **Papirando Editorial** (`pl-*`), definido em `:root/.pl-theme-light` e `.pl-theme-dark` no `src/index.css`. **Essa é a única identidade visual válida**. Classes antigas foram todas removidas.

### Tokens CSS principais

```css
/* Backgrounds */
--pl-bg            /* fundo geral da página (papel bege claro) */
--pl-bg-soft       /* fundo levemente mais escuro (hover, inputs) */
--pl-surface       /* branco — superfície de cards */
--pl-surface-2     /* superfície secundária */

/* Tipografia */
--pl-ink           /* cor principal do texto */
--pl-ink-2         /* texto secundário */
--pl-ink-3         /* texto terciário / eyebrow */
--pl-ink-4 / 5     /* texto muito suave / desabilitado */

/* Regras / bordas */
--pl-rule          /* borda suave (10% opacidade) */
--pl-rule-2        /* borda padrão (18%) */
--pl-rule-strong   /* borda forte (28%) */

/* Acento (azul) */
--pl-accent        /* azul primário #1d4ed8 (light) / #93b4ff (dark) */
--pl-accent-soft   /* fundo azul suave */
--pl-accent-ring   /* ring de foco */

/* Semânticas */
--pl-success / --pl-success-soft
--pl-warn / --pl-warn-soft
--pl-danger / --pl-danger-soft
--pl-highlight / --pl-highlight-soft / --pl-highlight-ink

/* Tipografia */
--pl-sans          /* Plus Jakarta Sans */
--pl-serif         /* Fraunces (italic, display) */
--pl-mono          /* JetBrains Mono */

/* Sombras */
--pl-sh-low / --pl-sh-mid / --pl-sh-high
```

### Classes de componentes (átomos CSS)

| Classe | Uso |
|---|---|
| `pl-paper-bg` | Wrapper externo de página — fundo bege com linhas sutis |
| `pl-display` | Heading editorial — Fraunces italic 300, letter-spacing negativo |
| `pl-eyebrow` | Label uppercase 11px, ink-3, tracking 0.24em |
| `pl-num` | Números/stats — Fraunces italic tabular-nums |
| `pl-card` | Card padrão — surface + borda rule-2 + border-radius 6px |
| `pl-card-ai` | Card IA — borda gradiente azul/índigo |
| `pl-card-paper` | Card com fundo bege (bg-soft) |
| `pl-card-elev` | Card com sombra low |
| `pl-tag` | Badge/pill neutro |
| `pl-tag-ai` | Badge IA com shimmer animado |
| `pl-tag-accent` | Badge azul |
| `pl-tag-warn` | Badge âmbar |
| `pl-tag-danger` | Badge vermelho |
| `pl-tag-success` | Badge verde |
| `pl-tag-highlight` | Badge amarelo |
| `pl-btn` | Botão base |
| `pl-btn-primary` | Botão primário — fundo ink, texto bg |
| `pl-btn-ghost` | Botão fantasma — transparente |
| `pl-btn-link` | Botão link — underline |
| `pl-btn-ai` | Botão IA — gradiente azul com shimmer |
| `pl-btn-sm` / `pl-btn-lg` | Variantes de tamanho |
| `pl-input` | Campo de formulário |
| `pl-progress` | Barra de progresso (container) |
| `pl-progress-bar` ou `.fill` | Fill da barra — usar `style={{ width: 'X%' }}` |
| `pl-rule` / `pl-rule-soft` | Dividers horizontais |
| `pl-mark` + `pl-mark-tile` + `pl-mark-fold` + `pl-mark-p` | Logo tile com canto dobrado |
| `pl-ai-accent` | Texto com gradiente azul/índigo |

### Padrão de hero editorial (toda página nova segue isso)

```jsx
<div className="pl-paper-bg" style={{ padding: '28px 28px 48px' }}>
  <div style={{ marginBottom: 32 }}>
    <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Categoria</p>
    <h1 className="pl-display" style={{ marginBottom: 12 }}>Título da página.</h1>
    <p style={{ fontSize: 14, color: 'var(--pl-ink-2)', maxWidth: 520 }}>
      Subtítulo descritivo.
    </p>
  </div>
  {/* KPI strip opcional */}
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
    {kpis.map(k => (
      <div key={k.label} className="pl-card" style={{ padding: '12px 16px' }}>
        <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{k.label}</p>
        <p className="pl-num" style={{ fontSize: 22, color: 'var(--pl-ink)' }}>{k.value}</p>
      </div>
    ))}
  </div>
  {/* Conteúdo da página */}
</div>
```

---

## O que já foi feito

### ✅ Redesign completo de todas as páginas (`src/pages/`)

Todas as ~32 páginas foram migradas para o sistema `pl-*`. **Zero ocorrências** das classes antigas:
- `page-shell` → `pl-paper-bg`
- `section-card` → `pl-card`
- `surface-card` / `kpi-card` → `pl-card`
- `PageHeadPremium` (componente) → hero editorial inline
- `btn-primary` / `btn-secondary` → `pl-btn pl-btn-primary` / `pl-btn pl-btn-ghost`
- `page-title` → `pl-display`

### ✅ Componentes de layout

- `src/components/Sidebar.jsx` — redesenhado com `pl-*`
- `src/components/Header.jsx` — redesenhado com `pl-*`

---

## Próximos trabalhos (backlog de identidade visual)

O redesign de **estrutura/layout** está completo. O que ainda precisa de atenção:

### 1. Refinamento visual fino (ajustes página a página)
Algumas páginas receberam só a migração estrutural mínima. Cada uma pode precisar de polish:
- Espaçamentos internos de cards
- Tipografia de tabelas e listas
- Estados vazios e de loading
- Responsividade mobile

### 2. Componentes compartilhados que ainda usam estilos antigos
Verificar se há componentes em `src/components/` (além de Sidebar e Header) com classes antigas:
```
grep -r "section-card\|surface-card\|page-shell\|btn-primary\|page-title" src/components/
```

### 3. Dark mode
Os tokens `pl-theme-dark` estão definidos no CSS mas a alternância de tema pode não estar 100% implementada em todos os componentes.

### 4. Tipografia de conteúdo longo
Páginas com texto corrido (Legislação, Materiais, Audiobooks) podem precisar de estilos de prosa adequados.

### 5. Animações e micro-interações
O CSS já define `pl-ai-shimmer`, `pl-live-pulse`, `pl-gabarito-reveal`. Garantir que são usados corretamente.

---

## Regras técnicas obrigatórias

1. **Aspas em JSX**: sempre aspas retas ASCII `"`. Nunca aspas curvas `"` `"` — o Vite/OXC rejeita com `[PARSE_ERROR] Invalid Character`.

2. **Read antes de Edit/Write**: sempre ler um arquivo antes de editá-lo na mesma sessão.

3. **Inline styles para valores dinâmicos**: usar `style={{ ... }}` para valores que dependem de variáveis, CSS vars ou cálculos. Classes Tailwind para layout estático.

4. **CSS vars sempre com `var()`**: ex: `color: 'var(--pl-ink)'`, nunca hardcode de cores.

5. **Não usar `PageHeadPremium`**: esse componente foi aposentado. Substituir por hero editorial inline.

6. **`pl-progress-bar`**: a classe do CSS usa `.fill` mas nos JSXs usamos `pl-progress-bar`. Confirmar no `src/index.css` qual está definido e manter consistência. Se necessário, adicionar `.pl-progress-bar` como alias de `.fill` no CSS.

---

## IA no projeto

- Provider: **Gemini** (via `VITE_GEMINI_API_KEY` em `.env.local`)
- Providers alternativos configurados: OpenRouter, Groq, HuggingFace
- Arquivo de configuração: `.env.local` (não commitar)
- Servidor AI local: `ai-server.mjs` (porta 8787)

---

## Como rodar

```bash
# No worktree:
cd "C:\Users\lucas\Desktop\App_Estudos\papirando\.claude\worktrees\mystifying-meitner-f6e09b"
npm run dev
# → http://localhost:5176
```

Ou usar o launch.json já configurado em `.claude/launch.json` (server "Frontend (Vite)").
