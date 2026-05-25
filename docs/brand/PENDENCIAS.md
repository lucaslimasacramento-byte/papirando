# Pendências · implementação da nova identidade

Lista priorizada. Faça na ordem — cada item é independente, mas os primeiros têm maior impacto/menor risco.

---

## 🔥 P0 · Imediato (zero risco, impacto máximo)

### 1. Trocar o favicon
- **Arquivo:** `public/favicon.svg`
- **Fonte:** `brand/favicon.svg`
- **Ação:** sobrescrever
- **Validação:** abrir o app, ver o P em página dobrada na aba do navegador
- **Esforço:** 1 min

### 2. Atualizar token `--accent` no CSS global
- **Arquivo:** `src/index.css`
- **Ação:** trocar todos os valores azul antigos para `#1e3a5f`
- **Comando:** `grep -rn "1d4ed8\|185fa5\|0c447c" src/`
- **Validação:** botões primários, links, e pontos finais usam o novo azul tinta
- **Esforço:** 5-10 min

---

## 🟡 P1 · Curto prazo (substitui ativos de marca antigos)

### 3. Sidebar — substituir PNG por SVG
- **Arquivos a criar:** `src/assets/branding/papirando-sidebar-logo.svg`
- **Arquivos a deletar:** `src/assets/branding/papirando-sidebar-logo.png`
- **Componente a editar:** `src/components/Sidebar.jsx`
- **Mudança:** atualizar import + adicionar `style={{ height: 28, width: 'auto' }}` na tag `<img>`
- **Validação:** sidebar mostra mark + wordmark sobre fundo ink
- **Esforço:** 10 min

### 4. Login — substituir PNG por lockup vertical
- **Arquivos a criar:** `public/assets/branding/papirando-lockup-v.svg`
- **Componente a editar:** `src/pages/Login.jsx`
- **Mudança:** trocar `<img src="...papirando-logo.png">` por `<img src="/assets/branding/papirando-lockup-v.svg" style={{ width: 240, height: 'auto' }}>`
- **Validação:** login mostra mark + wordmark + tagline centralizada
- **Esforço:** 5 min

### 5. Logo principal — substituir PNG por SVG
- **Arquivos a criar:** `public/assets/branding/papirando-logo.svg`
- **Arquivos a deletar:** `public/assets/branding/papirando-logo.png`
- **Componentes que podem usar:** `Header.jsx`, qualquer email template, `MeusConcursos.jsx`, etc.
- **Ação:** buscar todas as referências a `papirando-logo.png` e trocar
- **Comando:** `grep -rn "papirando-logo" src/`
- **Esforço:** 10-15 min (depende do quanto está espalhado)

---

## 🟢 P2 · Médio prazo (polimento e PWA)

### 6. Adicionar tokens dark mode no CSS
- **Arquivo:** `src/index.css`
- **Ação:** adicionar bloco `[data-theme="dark"]` com `--accent: #7a9bbf` e demais tokens listados em `tokens.css`
- **Validação:** alternar para dark e ver o azul lifted no lugar do tinta
- **Esforço:** 15 min

### 7. PWA manifest
- **Arquivo:** `public/manifest.json` (criar se não existir)
- **Adicionar:** ícones apontando para `papirando-app-icon.svg` + theme_color `#14110d` + background_color `#f3efe5`
- **Bonus:** gerar PNGs 192/512 via realfavicongenerator.net
- **Esforço:** 20 min

### 8. Open Graph image
- **Arquivo a criar:** `public/og-image.png` (1200×630)
- **Conteúdo:** lockup vertical centralizado sobre `#f3efe5`
- **Adicionar no `index.html`:** meta tags `og:image`, `og:title`, `og:description`
- **Esforço:** 15 min

### 9. Apple touch icon
- **Arquivo a criar:** `public/apple-touch-icon.png` (180×180)
- **Fonte:** exportar `papirando-app-icon.svg` em 180px
- **Adicionar no `index.html`:** `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
- **Esforço:** 5 min

---

## 🔵 P3 · Longo prazo (consistência interna)

### 10. Mapear e atualizar componentes que ainda usam azul antigo
Componentes prováveis com hex literals:
- `src/components/SubscriptionPlanSeal.jsx`
- `src/components/CheckoutResultBanner.jsx`
- `src/pages/Planos.jsx`
- `src/pages/Estatisticas.jsx`
- `src/components/AdminPageHeader.jsx`
- `src/components/PageHeadPremium.jsx`

**Ação:** trocar hex literais por `var(--accent)`. Componentes que usam Tailwind classes (`bg-blue-700`, `text-indigo-600`) precisam de mudança no `tailwind.config.js` para mapear para o novo token.

### 11. Atualizar `src/lib/contestAreaTheme.js`
Provavelmente usa cores antigas para os temas por área. Confirmar e harmonizar.

### 12. Material de marketing
Páginas estáticas, email templates, social media — qualquer lugar que renderize logo antigo.

---

## 📝 Notas de implementação

### Sobre fontes
O projeto já carrega Fraunces e Plus Jakarta Sans via Google Fonts (vi no `index.css`). Os SVGs renderizam corretamente. Se houver flash de fonte fallback antes do carregamento, considerar `font-display: swap` no `@import`.

### Sobre dark mode
O projeto pode não ter dark mode ainda implementado. Os tokens estão prontos no `tokens.css` — quando for implementar, basta plugar.

### Sobre SVG vs PNG
SVGs escalam infinitamente e são menores que PNGs em ícones simples. **Manter sempre que possível.** PNGs ainda são necessários para: Apple touch icon (180px), Open Graph (precisa raster por compatibilidade), e maskable Android (alguns launchers exigem).

### Sobre kerning
O wordmark "Papirando." usa `letter-spacing: -0.045em` em Fraunces Italic 300. Esse kerning negativo é parte do desenho — não remover. Se o navegador não tiver Fraunces carregada, o fallback é Times New Roman italic, que renderiza com kerning diferente mas aceitável.
