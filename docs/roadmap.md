# Papirando — Roadmap
_Atualizado: 24/05/2026_

Planejamento vivo. Ordem = prioridade. Revisar após cada release significativo.

---

## Posicionamento vigente

> “O estúdio onde o seu material vira estudo de verdade.”

A plataforma atende **qualquer estudante** (universitário, autodidata, vestibulando, concurseiro). Funcionalidades de concurso (edital, banca, cronograma) continuam existindo como features — não como identidade da plataforma.

---

## ✅ Concluído recentemente

| Item | Detalhe |
|---|---|
| Nova página Assinatura (Folha / Caderno / Estúdio) | `7f6cef6` |
| Copy genérico no Onboarding | `417214b` |
| Login hero copy corrigido | `a04c07a` |
| Identidade visual (handoff) em `docs/brand/` | — |
| Bloco A: placeholder onboarding, headline Aplicativos, FAQ Assinatura | — |
| Bloco B: labels nav (Objetivos), Header busca, Dashboard tutorial | — |

---

## 🔥 P0 · Crítico

### 1. Reconstruir `src/pages/Perfil.jsx`
**Problema:** usa `PageHeadPremium`, gradientes `from-slate-900`, classes Tailwind de cor, planos com IDs antigos (`gratuito`/`tatico`/`premium`), barra de herói escura incompatível com `pl-*`.
**O que fazer:**
- Hero editorial `pl-paper-bg` + `pl-display` no lugar da barra escura
- Navegação interna (Visão geral / Conquistas / Segurança) com tabs `pl-*`
- Card de plano refletindo Folha / Caderno / Estúdio
- Remover `PageHeadPremium` e todos os gradientes Tailwind
- Manter lógica de avatar, CPF, segurança e conquistas intacta
**Referência visual:** `docs/brand/02-Identidade-Papirando.html`
**Esforço:** 3–4 h

### 2. Favicon e logos → SVGs da nova identidade
**Problema:** favicon é o “P” roxo angular antigo; sidebar e login podem usar PNGs desatualizados.
**O que fazer:**
- `public/favicon.svg` ← `docs/brand/brand/favicon.svg`
- `src/assets/branding/papirando-sidebar-logo.svg` ← `docs/brand/brand/papirando-lockup-h-dark.svg`
- `public/assets/branding/papirando-logo.svg` ← `docs/brand/brand/papirando-lockup-h.svg`
- Atualizar imports em `Sidebar.jsx` e `Login.jsx`
- Confirmar `<link rel=”icon”>` em `index.html`
**Referência:** `docs/brand/01-HANDOFF-Logotipo.md` §3 e §4
**Esforço:** 30 min

### 3. Token `--pl-accent` → `#1e3a5f` (azul tinta-de-caneta)
**Problema:** accent atual é `#1d4ed8` (Indigo 700 do Tailwind), conflita com a paleta editorial.
**O que fazer:**
- `src/index.css`: `--pl-accent: #1d4ed8` → `--pl-accent: #1e3a5f`
- Dark: `--pl-accent: #7a9bbf`
- Confirmar: `grep -rn “1d4ed8\|185fa5” src/`
**Referência:** `docs/brand/tokens.css`
**Esforço:** 15 min + validação

### 4. Hardening de segurança para produção
- Revisar RLS em todas as tabelas do Supabase (usuário comum vs admin)
- Checar se nenhuma `VITE_*` com valor sensível chega ao bundle
- IA em produção: autenticação, limite de uso, CORS explícito (sem proxy aberto)
- Fluxos de sessão expirada, logout e redirecionamento consistentes

---

## 🟡 P1 · Importante

### 5. `LembretesCalendario.jsx:647` — prompt de IA
- `focus: 'agenda, lembretes e rotina de estudos para concurso'` → remover “para concurso”

### 6. `Instagram.jsx:62` — contexto de caption
- `objetivo: 'atrair concurseiros...'` → `'atrair estudantes...'`
  _(confirmar com estratégia de marketing — pode ser intencional concurseiro)_

### 7. PWA Manifest
- `public/manifest.json`: ícones novos + `theme_color: #14110d` + `background_color: #f3efe5`
- Gerar `apple-touch-icon.png` 180×180 a partir de `docs/brand/brand/papirando-app-icon.svg`
- **Ref:** `docs/brand/PENDENCIAS.md` §7

### 8. Open Graph image
- `public/og-image.png` 1200×630 — lockup vertical sobre fundo `#f3efe5`
- Meta tags `og:image`, `og:title`, `og:description` em `index.html`
- **Ref:** `docs/brand/01-HANDOFF-Logotipo.md` §7

### 9. Integridade de dados
- Auditar `supabase/*.sql` vs `src/lib/*Api.js` (colunas, tabelas obsoletas)
- Testes manuais nos fluxos críticos: login → sessão → flashcard → questão

---

## 🟢 P2 · Médio prazo

### 10. Dark mode — tokens completos
- Plugar bloco `[data-theme=”dark”]` de `docs/brand/tokens.css` no `src/index.css`
- Testar em todas as páginas reconstruídas

### 11. `SubscriptionPlanSeal.jsx` — IDs de plano
- Atualizar de `tatico`/`premium` para `caderno`/`estudio`
- Garantir selo “Turma Fundadora” coberto

### 12. Hex literals antigos — varredura final
```
grep -rn “1d4ed8\|185fa5\|0c447c\|bg-blue-\|text-blue-\|bg-indigo-\|text-indigo-” src/
```
Substituir por `var(--pl-accent)` onde forem cores de marca (não status semântico).

### 13. Polish visual por página
Páginas com migração estrutural mínima — precisam de revisão fina:
- `Estatisticas.jsx` — tipografia de gráficos e KPIs
- `Planejamento.jsx` — estados vazios e cards de ciclo
- `Flashcards.jsx` — flip card e espaçamento
- `Simulados.jsx` — header e timer
- `Sessoes.jsx` — linha do tempo
- `Aplicativos.jsx` — avaliar migração do CSS scoped para `pl-*`

### 14. Cabeçalhos com `pl-card-paper` — remoção final
Páginas que ainda podem ter o wrapper de cabeçalho incorreto:
- Edital, Disciplinas, Estatísticas, Metas, Planejamento, Sessões, Flashcards, Lembretes, Revisões, Simulados
- **Ref:** `docs/brand/PROMPT-Padronizar-Cabecalhos.md`

---

## 🔵 P3 · Longo prazo

### 15. Integração de pagamento real
- `onSelectPlan` hoje só chama prop — integrar Stripe ou Pagar.me
- Webhook Supabase para atualizar `plano` após confirmação de pagamento
- Recibo por email (Resend + domínio verificado)

### 16. Onboarding — tornar objetivo opcional de forma explícita
- Adicionar opção “Ainda não sei meu objetivo” com fluxo de discovery
- Rever fluxo de seleção de “concurso” para aceitar qualquer objetivo (vestibular, graduação, livre)

### 17. Observabilidade
- Logs de erro no client (Sentry ou similar)
- Métricas de uso da API Supabase
- Feature flags para módulos experimentais

### 18. Performance
- Code-splitting por rota (páginas admin e PDF pesado)
- `font-display: swap` nas Google Fonts para evitar FOUT

---

## Referências de identidade visual

Toda IA que tocar neste projeto deve consultar `docs/brand/` antes de criar UI.

| Arquivo | Conteúdo |
|---|---|
| `docs/brand/00-INDEX.md` | Índice geral — começar aqui |
| `docs/brand/01-HANDOFF-Logotipo.md` | SVGs inlinados + tokens + checklist |
| `docs/brand/02-Identidade-Papirando.html` | Documento visual mestre (abrir no browser) |
| `docs/brand/03-Brandbook.html` | Paleta, tipografia, voz de marca |
| `docs/brand/08-Botoes-IA.md` | CSS + JSX dos botões de IA |
| `docs/brand/PENDENCIAS.md` | TODOs P0→P3 da identidade |
| `docs/brand/tokens.css` | Tokens CSS prontos para plugar |
| `docs/brand/brand/` | 9 SVGs finais (mark, lockups, favicon, app-icon) |

---

## Checklist “pronto para produção”

- [ ] RLS validado para todos os fluxos
- [ ] `npm run build` sem erros bloqueantes
- [ ] Variáveis de ambiente documentadas e injetadas no host
- [ ] Fluxo de assinatura testado ponta a ponta
- [ ] Plano de rollback e backup
- [ ] IA atrás de auth com limites de uso
- [ ] Favicon e logos atualizados
- [ ] Token `--pl-accent` correto (`#1e3a5f`)
