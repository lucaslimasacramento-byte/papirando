# Handoff Papirando · v2 final

Pacote completo da identidade visual + sistema de UI do Papirando, pronto para implementação no codebase. Tudo o que fechamos nesta sessão está aqui.

Data: 24 de maio, 2026
Versão: 2.0

---

## 🗺 O que tem aqui

### 📐 Identidade Visual
| Arquivo | Conteúdo |
|---|---|
| **`01-HANDOFF-Logotipo.md`** | Instruções práticas + SVGs inlinados + tokens · COMECE AQUI |
| `02-Identidade-Papirando.html` | Documento mestre visual da identidade · abra no browser |
| `03-Brandbook.html` | Brandbook fundacional (paleta, tipografia, voz) |
| `04-Logotipo-exploracao.html` | Racional do conceito "página dobrada" |
| `05-Identidade-Visual.html` · `06-Login-Redesign.html` · `07-Plataforma.html` | Referência de identidade aplicada |
| `brand/` | 9 SVGs finais (mark, lockups, favicon, app-icon, wordmarks) |
| `tokens.css` | Tokens prontos pra colar no `src/index.css` |
| `identidade.css` | CSS auxiliar do documento mestre |

### 🤖 Botões de IA
| Arquivo | Conteúdo |
|---|---|
| **`08-Botoes-IA.md`** | CSS + JSX prontos · `<AIButton>` component · aura pulsante para premium |

### 📰 Padrão de cabeçalho de página
| Arquivo | Conteúdo |
|---|---|
| `Padrao Cabecalho de Pagina.html` | Spec visual: 4 variantes + ❌ vs ✅ + container `.pl-page` |
| **`PROMPT-Padronizar-Cabecalhos.md`** | Prompt pronto para o Claude Code aplicar em todas as páginas |

### 🕰 Tela Histórico (referência)
| Arquivo | Conteúdo |
|---|---|
| `Tela Historico - redesign.html` | HTML completo do redesign · use como source-of-truth de CSS |
| `PROMPT-Tela-Historico.md` | Prompt para o Claude Code aplicar |

### 📸 Screenshots de referência
| Arquivo | Mostra |
|---|---|
| `screenshots/01-08` | Documento mestre da identidade · 8 seções |
| `screenshots/09-Historico-redesign.png` | Tela Histórico redesenhada |
| `screenshots/10-Padrao-cabecalho.png` | Spec de cabeçalho |

### 📝 Backlog
| Arquivo | Conteúdo |
|---|---|
| `PENDENCIAS.md` | TODOs priorizados (P0 → P3) para plugar no codebase |

---

## 🎯 Decisões fechadas (não rediscutir)

1. **Logomark:** página com canto superior direito dobrado + P em Fraunces Italic 400.
2. **Wordmark:** `Papirando.` (P maiúsculo, ponto azul) em Fraunces Italic 300, letter-spacing `-0.045em`.
3. **Accent color:**
   - Light: **`#1e3a5f`** (tinta de caneta)
   - Dark: **`#7a9bbf`** (mesmo matiz, lifted)
4. **Tagline opcional:** "Estude para concursos" em Plus Jakarta 700 caps tracked 0.36em.
5. **Sem ".app" no wordmark** (domínio é técnico, não pertence à marca).
6. **Botões de IA:** ink solid + sparkle `#93b4ff` + BETA em Fraunces italic.
7. **"Importar com IA" (premium):** aura pulsante (`btn-ai-aura`) — halo `#93b4ff` respirando, 2.4s/ciclo.
8. **Cabeçalho de página:** sem `pl-card-paper` ao redor, sem wrapper. Estrutura `<header>` grid `1fr auto`.
9. **Container da página:** classe canônica `.pl-page` (max 1680px, padding 32px) substitui `page-shell`, `pl-mc-shell`, `pl-be-shell`, etc.

---

## ⚡ Próximos passos sugeridos (ordem)

### Fase 1 · Identidade visual (P0)
1. Substituir favicon
2. Atualizar `--accent` para `#1e3a5f` no CSS global
3. Trocar lockup da sidebar e do login pelos SVGs novos

### Fase 2 · Sistema (P1)
4. Adicionar classes `.btn-ai`, `.btn-ai-aura` no CSS global
5. Adicionar classe `.pl-page` no CSS global
6. Substituir wrappers raiz das páginas listadas pela `.pl-page`

### Fase 3 · Cabeçalhos (P2)
7. Remover `pl-card-paper` em cabeçalhos de Edital, Disciplinas, Estatísticas, Metas, Planejamento, Sessões
8. Auditar Flashcards, Lembretes, Revisões, Simulados

### Fase 4 · Polimento (P3)
9. PWA manifest + apple-touch-icon
10. Open Graph image
11. Dark mode tokens

---

## 💡 Como usar este pacote

### Se você quer entender o sistema
Abra `02-Identidade-Papirando.html` e `Padrao Cabecalho de Pagina.html` no browser. Tudo é interativo.

### Se você quer aplicar no codebase
Pegue os arquivos `PROMPT-*.md` e cole o conteúdo (entre as setas `>`) no Claude Code, anexando o screenshot ou HTML correspondente. Os prompts são auto-suficientes.

### Se você quer plugar um asset isolado
Vá em `brand/` e copie o SVG direto. Os caminhos finais no projeto estão em `01-HANDOFF-Logotipo.md` § 3.

---

## 🧭 Princípios não-negociáveis

- **Um único acento** — azul tinta-de-caneta. Status semânticos são outra coisa.
- **Paleta editorial quente** — paper `#f3efe5`, ink `#14110d`. Nunca branco puro.
- **Fraunces para editorial, Jakarta para UI.**
- **O mark não rotaciona, não distorce, não ganha gradiente, não troca cor.**
- **Cabeçalhos de página não usam caixa.** Direto no papel.
- **Container da página é `.pl-page`.** Todas as páginas começam no mesmo X.
