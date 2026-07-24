# Papirando — Direção de Marketing

Doc **dedicado à estratégia de marketing**. Posicionamento, voz, canais, campanhas, calendário e copy vivem aqui — **não** no `docs/CONTEXT.md` (esse é produto/código).

> **Escopo:** estratégia e execução de marketing.
> **Fora de escopo (vai em outro doc):** integração técnica de canais → `docs/instagram-setup.md`, `docs/email-strategy.md`.

---

## Posicionamento

- **Frase-guia:** "O estúdio onde o seu material vira estudo de verdade."
- **Marca-mãe generalista.** Fala em *estudar*, não em *passar em concurso*. Público = estudante em geral (concurseiro + universitário + autodidata/vestibulando).
- **Diferencial:** "traga seu material, a plataforma adapta" — IA que conhece o que VOCÊ está estudando.

## Voz e tom

- Direto, inteligente, sem didatismo condescendente. Fala de igual pra igual.
- Editorial e premium: **sem emoji excessivo**, sem caps lock, sem exclamação em série.
- Escreve como pessoa culta que assume o leitor culto.

## Identidade nas peças

- Cores: acento **`#1e3a5f`** (tinta) para elementos de marca; ink **`#14110d`** para texto/logo; fundo **`#f3efe5`** (papel bege).
- Tipografia: **Fraunces** (display) + **Plus Jakarta Sans** (UI/labels).
- Logomark: página com canto dobrado + P em Fraunces italic. Não rotaciona, não distorce, não ganha gradiente.
- Divisão de trabalho: **Claude = diretor** (estratégia, copy, briefings) · **execução visual no GPT/Canva** (economia de tokens).

---

## Oferta de lançamento

- **Turma Fundadora:** 3 meses grátis do plano máximo (**Estúdio**) para quem entra na janela de lançamento.
- **Lançamento:** 2026-05-25 (segunda). Janela sugerida: 25/05 a 03/06.
- CTA principal de toda campanha de lançamento: *"Turma Fundadora — 3 meses grátis"*. Urgência sem soar promocional barato.
- **A confirmar:** data exata de fim, se exige cartão, se há cap de cadastros.

## Planos (para copy de preços)

| Plano | Preço | Papel |
|---|---|---|
| **Folha** | R$ 0 (limites duros) | Isca / lead |
| **Caderno** | R$ 49,90/mês · 39,90 anual | Alvo (maioria converte) |
| **Estúdio** | R$ 89,90/mês · 71,90 anual | Âncora |

---

## Canais

### Instagram — `@papirando.app`

Setup executado em 2026-05-25 (dia do lançamento).

- **Nome de exibição:** `Papirando.` (com ponto).
- **Bio ativa:**
  ```
  Seu material vira estudo de verdade.
  IA que conhece o que você está estudando.
  Turma Fundadora — 3 meses grátis. Link abaixo.
  ```
- **Link na bio:** `www.papirando.com` (trocar por Linktree com CTA "Entrar na Turma Fundadora" + "Ver como funciona" quando pronto).
- **Foto de perfil:** logomark P em fundo bege `#f3efe5`.
- **Destaques (só ícone, sem texto na capa — ilegível no círculo):**

  | Destaque | Ícone | Conteúdo |
  |---|---|---|
  | Como funciona | setas em ciclo | fluxo: sobe material → IA lê → gera trilha/simulados → estuda e adapta |
  | Fundadores | selo/estrela | oferta Turma Fundadora, o que inclui, como entrar, prazo |
  | Método | lâmpada | dicas de estudo evergreen (espaçamento, Pomodoro, Feynman) |
  | Planos | checklist | Folha/Caderno/Estúdio, o que cada um inclui, preços |
  | Bastidores | olho/câmera | o porquê da plataforma, história do fundador, decisões de produto |

  - Capas feitas no Canva, 1080×1920, ícone `#1e3a5f` centralizado, sem gradiente.
  - Fonte Plus Jakarta Sans exige Canva Pro (upload de fonte) ou substituto **Outfit Bold**.

- **Pilares de conteúdo:** Método 35% · Produto 25% · Prova social 20% · Bastidores 10% · Cultura 10%.
- **Hashtags:** 8–12, no primeiro comentário (nunca 30). Set base: `#papirando #estudos #concursos #vestibulandos #estudante #estudarcomia #tecnicasdeestudo #produtividade`.

> Integração técnica (Graph API, publicação automatizada, métricas) → `docs/instagram-setup.md`.

### E-mail

Estratégia e infra → `docs/email-strategy.md`. (Pendência técnica: `send-reminder-email` precisa de Resend, pg_cron/pg_net e domínio verificado.)

---

## Backlog / a definir

- Linktree com CTAs do lançamento.
- Calendário de posts da semana de lançamento (rascunho existe; formalizar aqui).
- Confirmar parâmetros da Turma Fundadora (fim, cartão, cap).
- Roteiro do Reels de demo (screen recording do fluxo sobe-PDF → simulado).

---

## Histórico

- **2026-05-25** — Setup completo do perfil de Instagram `@papirando.app` para o lançamento: nome, bio, foto, 5 destaques (ícones definidos, sem texto na capa), pilares de conteúdo, hashtags. Peças visuais executadas no Canva.
