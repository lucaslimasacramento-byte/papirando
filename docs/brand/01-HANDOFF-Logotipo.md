# Handoff · Novo logotipo Papirando

> **Para a IA do codebase:** este documento contém tudo que você precisa para substituir o logotipo antigo do Papirando pelo novo sistema de marca. Os SVGs estão inlinados — copie o conteúdo entre os marcadores e salve nos caminhos indicados. Não precisa pedir nada de volta.

---

## 1. Contexto

A identidade visual do Papirando foi finalizada. O conceito do logo é **"página com canto dobrado"** — uma folha estilizada com o canto superior direito dobrado para baixo (o gesto universal de marcador de leitura) e um **P em Fraunces itálico** dentro. A mesma família tipográfica do wordmark.

**O que existia hoje (e está fora da marca):**
- `public/favicon.svg` — um "P" roxo angular estilo template
- `public/assets/branding/papirando-logo.png` — wordmark + ícone "p" genérico em azul Tailwind
- `src/assets/branding/papirando-sidebar-logo.png` — wordmark cinza

**O que vai substituir tudo isso:** os SVGs abaixo, mais um ajuste do token `--accent` no `index.css`.

---

## 2. Tokens de cor (atualizar no CSS)

A cor de acento mudou de **`#1d4ed8`** (Indigo 700 do Tailwind, remanescente de identidade antiga) para **`#1e3a5f`** (tinta de caneta, harmoniza com a paleta editorial quente do brandbook).

### Em `src/index.css`, atualize ou adicione:

```css
:root {
  /* ────────────────────────────────────────────────────
     Brand · Papirando v1.0
     ──────────────────────────────────────────────────── */
  --paper:        #f3efe5;
  --paper-soft:   #ebe6d8;
  --paper-warm:   #fbfaf6;
  --ink:          #14110d;
  --ink-2:        #3a342c;
  --ink-3:        #847b6c;
  --ink-4:        #b6ad9c;

  /* Accent — light theme */
  --brand:        #1e3a5f;           /* tinta de caneta */
  --accent:       #1e3a5f;
  --accent-soft:  rgba(30, 58, 95, 0.08);

  /* Rules / lines */
  --line:         rgba(20, 17, 13, 0.08);
  --line-strong:  rgba(20, 17, 13, 0.16);

  /* Text aliases (caso o codebase use estes nomes) */
  --text-main:    #14110d;
  --text-soft:    #847b6c;
}

[data-theme="dark"], .dark {
  --paper:        #1a1612;
  --paper-soft:   #1f1a14;
  --paper-warm:   #1f1a14;
  --ink:          #f3efe5;
  --ink-2:        #d8d0bd;
  --ink-3:        #b6ad9c;
  --ink-4:        #847b6c;

  --brand:        #7a9bbf;           /* mesmo matiz, lifted para escuro */
  --accent:       #7a9bbf;
  --accent-soft:  rgba(122, 155, 191, 0.12);

  --line:         rgba(243, 239, 229, 0.08);
  --line-strong:  rgba(243, 239, 229, 0.16);

  --text-main:    #f3efe5;
  --text-soft:    #b6ad9c;
}
```

**Importante:** qualquer ocorrência de `#1d4ed8`, `#185fa5`, ou `#0c447c` no codebase deve ser substituída por `var(--accent)` (ou `#1e3a5f` direto se for inline). Use grep para encontrar:

```bash
grep -r "1d4ed8\|185fa5\|0c447c" src/
```

---

## 3. Arquivos a criar

### `public/favicon.svg`

Substitui o atual (o P roxo angular). **Sobrescrever.**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <title>Papirando</title>
  <path d="M 0 0 H 68 L 100 32 V 100 H 0 Z" fill="#14110d"/>
  <path d="M 68 0 L 100 32 H 68 Z" fill="#3a342c"/>
  <text x="50" y="78" font-family="Fraunces, 'Times New Roman', serif" font-style="italic" font-weight="500" font-size="80" fill="#f3efe5" text-anchor="middle" letter-spacing="-3">P</text>
</svg>
```

> Versão otimizada para 16px: dobra mais larga (32% em vez de 28%), sem sombra, peso 500 em vez de 400. Sobrevive à compressão de pixel.

---

### `public/assets/branding/papirando-mark.svg`

Logomark isolado (ink em papel) — para uso geral.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <title>Papirando · logomark</title>
  <path d="M 3 0 H 72 L 100 28 V 96 Q 100 100 96 100 H 4 Q 0 100 0 96 V 4 Q 0 0 4 0 Z" fill="#14110d"/>
  <path d="M 72 0 L 100 28 H 72 Z" fill="rgba(20,17,13,0.45)"/>
  <text x="50" y="75" font-family="Fraunces, 'Times New Roman', serif" font-style="italic" font-weight="400" font-size="74" fill="#f3efe5" text-anchor="middle" letter-spacing="-3">P</text>
</svg>
```

---

### `public/assets/branding/papirando-mark-paper.svg`

Logomark invertido (paper em ink) — para fundos escuros sem usar o lockup completo.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <title>Papirando · logomark paper</title>
  <path d="M 3 0 H 72 L 100 28 V 96 Q 100 100 96 100 H 4 Q 0 100 0 96 V 4 Q 0 0 4 0 Z" fill="#f3efe5"/>
  <path d="M 72 0 L 100 28 H 72 Z" fill="rgba(0,0,0,0.12)"/>
  <text x="50" y="75" font-family="Fraunces, 'Times New Roman', serif" font-style="italic" font-weight="400" font-size="74" fill="#14110d" text-anchor="middle" letter-spacing="-3">P</text>
</svg>
```

---

### `public/assets/branding/papirando-logo.svg`

Lockup horizontal (mark + wordmark). **Substitui `papirando-logo.png`.**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 120" width="480" height="120">
  <title>Papirando · lockup horizontal</title>
  <g transform="translate(16, 16)">
    <g transform="scale(0.88)">
      <path d="M 3 0 H 72 L 100 28 V 96 Q 100 100 96 100 H 4 Q 0 100 0 96 V 4 Q 0 0 4 0 Z" fill="#14110d"/>
      <path d="M 72 0 L 100 28 H 72 Z" fill="rgba(20,17,13,0.45)"/>
      <text x="50" y="75" font-family="Fraunces, 'Times New Roman', serif" font-style="italic" font-weight="400" font-size="74" fill="#f3efe5" text-anchor="middle" letter-spacing="-3">P</text>
    </g>
  </g>
  <text x="124" y="80" font-family="Fraunces, 'Times New Roman', serif" font-style="italic" font-weight="300" font-size="68" fill="#14110d" letter-spacing="-3.1">Papirando<tspan fill="#1e3a5f">.</tspan></text>
</svg>
```

---

### `src/assets/branding/papirando-sidebar-logo.svg`

Lockup horizontal para fundo escuro. **Substitui `papirando-sidebar-logo.png`.**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 120" width="480" height="120">
  <title>Papirando · lockup horizontal (dark)</title>
  <g transform="translate(16, 16)">
    <g transform="scale(0.88)">
      <path d="M 3 0 H 72 L 100 28 V 96 Q 100 100 96 100 H 4 Q 0 100 0 96 V 4 Q 0 0 4 0 Z" fill="#f3efe5"/>
      <path d="M 72 0 L 100 28 H 72 Z" fill="rgba(0,0,0,0.12)"/>
      <text x="50" y="75" font-family="Fraunces, 'Times New Roman', serif" font-style="italic" font-weight="400" font-size="74" fill="#14110d" text-anchor="middle" letter-spacing="-3">P</text>
    </g>
  </g>
  <text x="124" y="80" font-family="Fraunces, 'Times New Roman', serif" font-style="italic" font-weight="300" font-size="68" fill="#f3efe5" letter-spacing="-3.1">Papirando<tspan fill="#7a9bbf">.</tspan></text>
</svg>
```

---

### `public/assets/branding/papirando-lockup-v.svg`

Lockup vertical com tagline — para tela de login, splash, capa de deck.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="320" height="240">
  <title>Papirando · lockup vertical</title>
  <g transform="translate(110, 20)">
    <path d="M 3 0 H 72 L 100 28 V 96 Q 100 100 96 100 H 4 Q 0 100 0 96 V 4 Q 0 0 4 0 Z" fill="#14110d"/>
    <path d="M 72 0 L 100 28 H 72 Z" fill="rgba(20,17,13,0.45)"/>
    <text x="50" y="75" font-family="Fraunces, 'Times New Roman', serif" font-style="italic" font-weight="400" font-size="74" fill="#f3efe5" text-anchor="middle" letter-spacing="-3">P</text>
  </g>
  <text x="160" y="186" font-family="Fraunces, 'Times New Roman', serif" font-style="italic" font-weight="300" font-size="44" fill="#14110d" text-anchor="middle" letter-spacing="-2">Papirando<tspan fill="#1e3a5f">.</tspan></text>
  <text x="160" y="216" font-family="Plus Jakarta Sans, sans-serif" font-weight="700" font-size="9" fill="#847b6c" text-anchor="middle" letter-spacing="3.5">ESTUDE PARA CONCURSOS</text>
</svg>
```

---

### `public/assets/branding/papirando-app-icon.svg`

App icon 1024×1024 com rounded square iOS — use para gerar PWA icons via realfavicongenerator.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <title>Papirando · app icon</title>
  <rect x="0" y="0" width="1024" height="1024" rx="225" fill="#f3efe5"/>
  <g transform="translate(192, 192)">
    <path d="M 18 12 H 461 L 640 192 V 624 Q 640 640 624 640 H 28 Q 12 640 12 624 V 26 Q 12 12 28 12 Z" fill="rgba(20,17,13,0.10)" transform="translate(0, 8)"/>
    <g transform="scale(6.4)">
      <path d="M 3 0 H 72 L 100 28 V 96 Q 100 100 96 100 H 4 Q 0 100 0 96 V 4 Q 0 0 4 0 Z" fill="#14110d"/>
      <path d="M 72 0 L 100 28 H 72 Z" fill="rgba(20,17,13,0.45)"/>
      <text x="50" y="75" font-family="Fraunces, 'Times New Roman', serif" font-style="italic" font-weight="400" font-size="74" fill="#f3efe5" text-anchor="middle" letter-spacing="-3">P</text>
    </g>
  </g>
</svg>
```

---

### `public/assets/branding/papirando-wordmark.svg`

Só o wordmark — sem mark.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 60" width="360" height="60">
  <title>Papirando · wordmark</title>
  <text x="0" y="46" font-family="Fraunces, 'Times New Roman', serif" font-style="italic" font-weight="300" font-size="48" fill="#14110d" letter-spacing="-2.2">Papirando<tspan fill="#1e3a5f">.</tspan></text>
</svg>
```

---

### `public/assets/branding/papirando-wordmark-paper.svg`

Wordmark para fundo escuro.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 60" width="360" height="60">
  <title>Papirando · wordmark paper</title>
  <text x="0" y="46" font-family="Fraunces, 'Times New Roman', serif" font-style="italic" font-weight="300" font-size="48" fill="#f3efe5" letter-spacing="-2.2">Papirando<tspan fill="#7a9bbf">.</tspan></text>
</svg>
```

---

## 4. Mudanças nos componentes

### `src/components/Sidebar.jsx`

A sidebar hoje renderiza o texto "Papirando" em Poppins/Plus Jakarta e (provavelmente) referencia `papirando-sidebar-logo.png` via import. Trocar por o SVG novo.

**Antes (procurar):**
```jsx
import sidebarLogo from '../assets/branding/papirando-sidebar-logo.png';
// ...
<img src={sidebarLogo} alt="Papirando" />
// OU
<span style={{ fontFamily: 'Poppins, ...' }}>Papirando</span>
```

**Depois:**
```jsx
import sidebarLogo from '../assets/branding/papirando-sidebar-logo.svg';
// ...
<img src={sidebarLogo} alt="Papirando" style={{ height: 28, width: 'auto' }} />
```

> **Importante:** o lockup horizontal tem proporção 4:1. Defina apenas `height` no CSS e deixe `width: auto` para preservar a proporção.

### `src/pages/Login.jsx`

Trocar o logo da tela de login pelo **lockup vertical com tagline**.

**Antes (procurar):**
```jsx
<img src="/assets/branding/papirando-logo.png" alt="Papirando" />
```

**Depois:**
```jsx
<img
  src="/assets/branding/papirando-lockup-v.svg"
  alt="Papirando · Estude para concursos"
  style={{ width: 240, height: 'auto' }}
/>
```

### `src/components/Header.jsx`

Se o Header renderiza o logo do produto (em telas mobile, geralmente), usar o lockup horizontal:

```jsx
<img
  src="/assets/branding/papirando-logo.svg"
  alt="Papirando"
  style={{ height: 24, width: 'auto' }}
/>
```

### `index.html` (raiz)

Confirmar que o favicon está apontando para o SVG novo:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

---

## 5. Limpeza · arquivos antigos para remover

Depois de confirmar que tudo funciona, remover:

- `public/assets/branding/papirando-logo.png` (substituído por `.svg`)
- `src/assets/branding/papirando-sidebar-logo.png` (substituído por `.svg`)

**Não remover** ainda se houver imports espalhados — primeiro fazer find/replace dos imports, depois deletar os PNGs.

---

## 6. Manifest PWA (opcional, recomendado)

Se houver `public/manifest.json`, atualizar os ícones:

```json
{
  "name": "Papirando",
  "short_name": "Papirando",
  "icons": [
    { "src": "/assets/branding/papirando-app-icon.svg", "sizes": "any", "type": "image/svg+xml" }
  ],
  "theme_color": "#14110d",
  "background_color": "#f3efe5"
}
```

Para PNGs reais 192/512/maskable (alguns Androids ainda exigem raster), gerar a partir do `papirando-app-icon.svg` usando https://realfavicongenerator.net ou imagemagick:

```bash
convert -background none -resize 192x192 papirando-app-icon.svg icon-192.png
convert -background none -resize 512x512 papirando-app-icon.svg icon-512.png
```

---

## 7. Open Graph (recomendado)

Para compartilhamentos em WhatsApp / LinkedIn / Twitter, criar uma OG image 1200×630. Pode reaproveitar o lockup vertical centralizado sobre fundo `#f3efe5`. Salvar em `public/og-image.png` e referenciar:

```html
<meta property="og:image" content="https://papirando.app/og-image.png" />
<meta property="og:title" content="Papirando" />
<meta property="og:description" content="Estude para concursos públicos com ferramenta séria." />
```

---

## 8. Checklist de aceite

- [ ] `public/favicon.svg` substituído — abrir o site e ver o novo P na aba do navegador
- [ ] `papirando-sidebar-logo.svg` criado e Sidebar.jsx atualizado — sidebar mostra mark + wordmark cream
- [ ] `papirando-logo.svg` criado — Login mostra lockup vertical centralizado
- [ ] `--accent` no `index.css` atualizado para `#1e3a5f`
- [ ] Dark mode usa `--accent: #7a9bbf` (mesmo matiz, lifted)
- [ ] `grep -r "1d4ed8\|185fa5\|0c447c" src/` retorna vazio (cores antigas removidas)
- [ ] PNGs antigos (`papirando-logo.png`, `papirando-sidebar-logo.png`) deletados
- [ ] Manifest e OG image atualizados (opcional mas recomendado)

---

## 9. Referência rápida · tokens

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--paper` | `#f3efe5` | `#1a1612` | Background base |
| `--paper-warm` | `#fbfaf6` | `#1f1a14` | Surface (cards) |
| `--ink` | `#14110d` | `#f3efe5` | Texto principal |
| `--ink-2` | `#3a342c` | `#d8d0bd` | Texto secundário |
| `--ink-3` | `#847b6c` | `#b6ad9c` | Texto muted |
| `--accent` | `#1e3a5f` | `#7a9bbf` | Acento / ponto azul |
| `--line` | `ink @ 8%` | `paper @ 8%` | Bordas |

**Tipografia:** Fraunces Italic (editorial — títulos, números, wordmark) + Plus Jakarta Sans (UI — botões, labels, corpo). Já estão carregadas via Google Fonts no projeto.

---

## 10. Em caso de dúvida

A documentação completa da marca está em `Identidade Papirando.html` (com exemplos visuais de tudo: anatomia do mark, construção geométrica, espaço livre, lockups, sistema de cor, favicon, app icon, aplicações em sidebar/login/social/email, comparativo light vs dark, e o que NÃO fazer).

Em caso de ambiguidade, **siga a regra do brandbook**: paleta editorial quente (papel cream + tinta ink), um único acento (azul tinta-de-caneta), Fraunces para tudo editorial, Jakarta para tudo de UI. Nada de gradientes, nada de cores fora da paleta, nada de rotacionar ou distorcer o mark.
