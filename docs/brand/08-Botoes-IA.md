# Botões de IA · Papirando

Sistema definitivo para marcar features de IA no produto. Decisões já tomadas (não rediscutir):

| Aspecto | Escolha |
|---|---|
| Estilo base | **Ink solid + sparkle azul claro** (sem gradiente purple/blue) |
| Tipografia do botão | Plus Jakarta Sans 600 |
| BETA tag | Fraunces italic 400 em accent-light (não tag amarelo neon) |
| Efeito especial (apenas `Importar com IA`) | **Aura pulsante** &mdash; halo `accent-light` que respira atrás do botão |
| Cor de acento | `#1e3a5f` (light) / `#7a9bbf` (dark) |
| Cor do sparkle/aura | `#93b4ff` (accent-light, fixa nos dois temas) |

---

## 1. Snippet CSS pronto para colar

Adicione em `src/index.css` (ou crie `src/styles/ai-buttons.css` e importe):

```css
/* ═══════════════════════════════════════════════════════════
   Botões de IA · Papirando v1.0
   ═══════════════════════════════════════════════════════════ */

/* Base · todos os botões de IA (Começar tutorial, Sugerir, etc) */
.btn-ai {
  background: var(--ink, #14110d);
  color: var(--paper, #f3efe5);
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: -0.005em;
  padding: 9px 16px;
  border-radius: 6px;
  border: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: background 0.15s, transform 0.04s;
}
.btn-ai:hover  { background: #1f1a14; }
.btn-ai:active { transform: translateY(1px); }
.btn-ai:disabled { opacity: 0.5; cursor: not-allowed; }

/* sparkle icon (children svg or .icon) ganha cor de acento */
.btn-ai > svg,
.btn-ai > .icon {
  color: #93b4ff;
  flex-shrink: 0;
}

/* BETA suffix · use <span class="beta">beta</span> */
.btn-ai .beta {
  font-family: 'Fraunces', 'Times New Roman', serif;
  font-style: italic;
  font-weight: 400;
  font-size: 11px;
  color: #93b4ff;
  letter-spacing: -0.01em;
  margin-left: 4px;
}

/* Quando o botão é "ghost" (sobre fundo escuro, ex: sidebar dark mode),
   inverte: paper bg + ink text + accent (não accent-light) */
.btn-ai.is-on-dark {
  background: var(--paper, #f3efe5);
  color: var(--ink, #14110d);
}
.btn-ai.is-on-dark > svg,
.btn-ai.is-on-dark > .icon { color: var(--accent, #1e3a5f); }
.btn-ai.is-on-dark .beta   { color: var(--accent, #1e3a5f); }


/* ═══════════════════════════════════════════════════════════
   Modificador · Aura pulsante
   Apenas para "Importar com IA" e features premium equivalentes.
   Halo azul claro que respira atrás do botão.
   ═══════════════════════════════════════════════════════════ */

.btn-ai-aura {
  position: relative;
  display: inline-block;
  isolation: isolate;     /* CRÍTICO — mantém o ::before atrás do botão sem
                             vazar pra trás do body */
  line-height: 0;         /* impede que o wrapper crie extra-height */
}
.btn-ai-aura::before {
  content: '';
  position: absolute;
  inset: -14px;
  border-radius: 22px;
  background: radial-gradient(
    ellipse at center,
    rgba(147, 180, 255, 0.85) 0%,
    rgba(147, 180, 255, 0.40) 40%,
    rgba(147, 180, 255, 0.00) 75%
  );
  z-index: -1;
  filter: blur(12px);
  animation: papirando-aura-pulse 2.4s cubic-bezier(.4, 0, .2, 1) infinite;
  pointer-events: none;
}
@keyframes papirando-aura-pulse {
  0%, 100% { opacity: 0.50; transform: scale(0.85); }
  50%      { opacity: 1.00; transform: scale(1.18); }
}

/* Borda interna sutil reforça o brilho */
.btn-ai-aura .btn-ai {
  box-shadow:
    inset 0 0 0 1px rgba(147, 180, 255, 0.35),
    0 0 0 1px rgba(147, 180, 255, 0.15);
}

/* Respeita prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .btn-ai-aura::before {
    animation: none;
    opacity: 0.7;
  }
}
```

---

## 2. Como usar · React/JSX

### Botão IA padrão (Começar tutorial, Sugerir plano, etc)

```jsx
import { Sparkles } from 'lucide-react';

<button className="btn-ai">
  <Sparkles size={14} />
  Começar tutorial
</button>
```

### Botão IA premium (Importar com IA, Conciliador, qualquer feature flagship)

Envolve com `.btn-ai-aura` para ganhar o halo pulsante.

```jsx
<span className="btn-ai-aura">
  <button className="btn-ai">
    <Sparkles size={14} />
    Importar com IA
    <span className="beta">beta</span>
  </button>
</span>
```

### Em fundo escuro (sidebar dark, página dark mode)

Adicione `is-on-dark` no botão. O wrapper `btn-ai-aura` continua igual — o halo azul-claro funciona sobre os dois temas.

```jsx
<span className="btn-ai-aura">
  <button className="btn-ai is-on-dark">
    <Sparkles size={14} />
    Importar com IA
    <span className="beta">beta</span>
  </button>
</span>
```

---

## 3. Componente reutilizável (sugestão)

Para evitar repetir o padrão, crie `src/components/AIButton.jsx`:

```jsx
import { Sparkles } from 'lucide-react';

/**
 * @param {object} props
 * @param {boolean} [props.aura]      — adiciona halo pulsante (use só em features premium)
 * @param {boolean} [props.onDark]    — botão sobre fundo escuro
 * @param {boolean} [props.beta]      — adiciona suffix "beta"
 * @param {string}  [props.icon]      — override do ícone (default: Sparkles)
 * @param {React.ReactNode} props.children
 */
export default function AIButton({
  aura = false,
  onDark = false,
  beta = false,
  icon,
  children,
  ...rest
}) {
  const IconComp = icon ?? <Sparkles size={14} />;

  const button = (
    <button className={`btn-ai${onDark ? ' is-on-dark' : ''}`} {...rest}>
      {IconComp}
      {children}
      {beta && <span className="beta">beta</span>}
    </button>
  );

  if (aura) {
    return <span className="btn-ai-aura">{button}</span>;
  }
  return button;
}
```

**Uso:**

```jsx
// Começar tutorial
<AIButton onClick={startTutorial}>Começar tutorial</AIButton>

// Importar com IA (premium)
<AIButton aura beta onClick={importWithAI}>Importar com IA</AIButton>

// Sobre dark
<AIButton aura beta onDark onClick={importWithAI}>Importar com IA</AIButton>
```

---

## 4. Onde substituir no codebase

Buscar e substituir todos os botões que hoje usam o gradiente roxo/azul:

```bash
grep -rn "from-purple\|from-indigo\|bg-gradient.*blue\|bg-violet\|gradient(135deg.*#6\|gradient.*indigo" src/
```

Locais prováveis (pelos screenshots do usuário):
- Banner "Vamos configurar seu Papirando em 3 passos" (Dashboard hero ou onboarding)
- Botão "Importar com IA" (provavelmente em algum admin de questões ou edital)
- Botão "Começar tutorial" no guia inicial
- Qualquer chip/tag "BETA" amarelo neon

Para cada caso:
1. **Trocar** a tag/className pelo padrão `btn-ai` (+ `btn-ai-aura` se premium)
2. **Remover** o gradiente inline ou as classes Tailwind de gradiente
3. **Manter** o ícone Sparkles (Lucide) ou equivalente — só o estilo do botão muda

---

## 5. Regras de quando usar Aura

A `btn-ai-aura` é o tratamento mais loud — use com parcimônia para preservar o impacto:

✅ **Usar em:**
- "Importar com IA" (toda variante)
- "Gerar com IA" para conteúdo complexo (cronograma, edital, simulado)
- Feature flagship em destaque numa página/onboarding
- Banner com 1 CTA principal de IA

❌ **Não usar em:**
- Botões IA secundários ou em listas
- Botões IA repetidos na mesma tela (mais de 1 instância)
- Botões pequenos (icon-only, menos de 32px de altura)
- Estados disabled

Regra geral: se há **mais de um botão IA na tela**, use `btn-ai-aura` apenas no de maior prioridade. Os outros ficam `btn-ai` baseline.

---

## 6. Checklist de aceite

- [ ] Buscar e remover todos os gradientes purple/indigo/blue cool no codebase
- [ ] Substituir botões IA pelo `btn-ai` baseline
- [ ] Aplicar `btn-ai-aura` apenas em "Importar com IA" e equivalentes premium
- [ ] BETA tag renderizada em Fraunces italic, não como pill amarelo
- [ ] Sparkles icon em `#93b4ff` (não branco/cinza)
- [ ] Testar com `prefers-reduced-motion: reduce` (animação deve parar)
- [ ] Confirmar visualmente sobre fundo paper E sobre fundo ink (dark mode)
- [ ] Nenhuma referência a `from-purple-500`, `bg-violet-*`, `gradient` que envolva azul-violeta restou no `src/`

---

## 7. Notas técnicas

### `isolation: isolate` é obrigatório
Sem ele, o `::before` com `z-index: -1` vai parar atrás do `<body>` (invisível). O `isolate` cria um stacking context local, mantendo o pseudo-elemento confinado ao escopo do `.btn-ai-aura`.

### `line-height: 0` no wrapper
Spans inline-block ganham altura extra do line-height herdado. Anular evita um gap de 4-6px no layout.

### Performance
O `filter: blur(12px)` é computado pela GPU mas é caro se houver dezenas de instâncias visíveis simultaneamente. Como o uso é restrito a 1-2 botões premium por tela, é aceitável.

### Dark mode
A cor do halo (`rgba(147, 180, 255, ...)`) é fixa porque funciona sobre ambos os fundos (paper warm e ink escuro). Não trocar para `accent-dark` no dark mode.
