# Handoff entre conversas

## Rodada atual - finalizacao e deploy

- Criados `docs/mvp-launch-checklist.md` e `docs/vercel-deploy-runbook.md` para guiar MVP, deploy Vercel, Supabase e IA.
- `ai-server.mjs` passou a expor `POST /api/explain-question`, alinhando o backend ao cliente `src/lib/aiClient.js`.
- A validacao completa ainda deve ser feita em pasta local fora do OneDrive/Drive, conforme `docs/production-test-handoff.md`.
- Manual para o usuario: GitHub, Vercel, variaveis de ambiente, Supabase Auth/Redirect URLs, SQL/RLS remoto e hospedagem do `ai-server`.

**Propósito:** memória curta e acionável. Ao **abrir um chat novo**, a IA deve ler este arquivo **depois** de `context.md`. Ao **finalizar uma rodada**, a IA deve **atualizar este arquivo** com o bloco da última rodada e o próximo passo explícito.

*Última atualização: 2026-04-23 — **Hardening pré-produção concluído no código; validação final adiada para máquina local do usuário**. Ler também `docs/production-test-handoff.md`.*

**Pausa:** Editor com **coluna de esqueletos 4+7+7+4** (`redacaoEsqueletosMilimetricos.js`) + faixas separadoras; `REDACAO_KIT_MODELOS` reexporta os mesmos textos; admin JSON continua podendo sobrescrever `kit_json.modelos`.

---

## Instruções para quem retomar (ler primeiro)

1. **Fórum (prioridade imediata):** `src/pages/Comunidades.jsx`, `src/lib/communityApi.js`, `supabase/community.sql`; shell da aba: `App.jsx` (content scroll `comunidades`), `AppTabContent.jsx` (wrapper `flex-1 min-h-0`). **Outros:** `src/lib/vadeMecumApi.js`, `AdminLegislacao.jsx`, `Legislacao.jsx`. Mapas: `mind_map_gallery.sql`, `mindMapGalleryApi`, etc. Redações: `Redacoes.jsx`, `redacaoSiteContentApi`, `AdminConfiguracoes`.
2. **Ranking:** só dados reais (`question_answers` + `profiles`); sem preenchimento fictício.
3. **Redações:** `REDACAO_THEME_BANK` na aba **Banco de temas**; **Nova correção** = banca + editor + **?** (guias); **Dicas** = kit fixo + cards do Supabase; histórico lateral com `onDeleteRedacao`.
4. **Design system:** manter `docs/ui-guidelines.md` — `btn-primary`, tokens slate/blue, evitar faixas escuras no canvas.
5. **Validação local:** `npx eslint` nos arquivos alterados; `npm run build` se houver mudança estrutural ampla.

---

## Onde estamos agora (snapshot)

- **Ranking (Simulados):** `SimuladosRankingPanel` + `loadOfficialRankingBoard` exibem **somente** perfis reais do Supabase (sem `padRankingWithDemoRows`).
- **Redações (`redacoes`):** cabeçalho com métricas; **Nova correção** com banca, editor e contador de linhas; **Dicas** com kit (conectivos por função, frases prontas, 5 modelos em `<details>`) e seção **Conteúdo extra** para `redacao_expert_tips`.
- **Questões (`questoes`):** estado anterior (handoff 2026-04-17) mantido — filtros modal, KPIs, etc.
- **Legislação (`legislacao`):** shell/UX Vade Mecum (rodada anterior).
- **Mapas mentais:** galeria global `mind_map_gallery` (SQL + RLS); admin **Mapas mentais** na sidebar; usuários veem **Galeria Papirando** na aba Mapas, leitura com `MindMapStudio` em `readOnly`, ação **Copiar para minha biblioteca** (clone editável).
- **Legislação:** aba admin **Legislação** (`admin_legislacao`) — PDF + metadados + JSON do mapa de páginas (`updateVadeMecumReleaseMeta` em `vadeMecumApi.js`); atalho **Lançamentos (admin)** na tela Legislação para admins.
- **Edital em questão (`edital_questao`):** lógica de catálogo + edital + Planos/Concursos já ligada em `EditalQuestao.jsx` e props em `AppTabContent.jsx` / `App.jsx`. **O hero (cabeçalho) ficou ruim na percepção do time — próxima rodada = refazer só o cabeçalho.** Detalhes: [edital-questao-header.md](edital-questao-header.md).
- **Comunidade (`comunidades`):** layout mantido no **formato Reddit** (coluna esquerda + feed central), mas com **tema padrão Papirando** (claro). Página focada em **Discussões**; abas secundárias de navegação removidas. Feed abre direto com posts (sem hub) e com largura ampliada (sem coluna direita). Barra superior com busca + botão **Perguntar**, agora ligado a modal de criação/publicação de tópico. Na esquerda: removidos **Salas**, **Criar tópico** e **Diagnóstico**; mantido **Top 10**. Cards mostram avatar do autor com mais destaque. `App.jsx` reduziu padding inferior de `comunidades` (`pb-24` → `pb-2`) para eliminar corte/faixa vazia.
- **Esquadrões (`esquadroes`):** **navegação interna horizontal** (abaixo do hero) — não há mais sidebar vertical de “Área interna”; hero com **tema premium** (gradiente, faixa índigo→âmbar, badge ouro, stats com sombra); **`AppTabContent`** passa **`currentUserId`** ao `Esquadroes` (antes só `App.jsx` passava). **Persistência:** `squad_payload` + RPC `resolve_squad_invite`, merge local/remoto, `?convite=` — ver rodada anterior. **Se o usuário vir UI antiga:** outra pasta do projeto, dev server sem reiniciar ou cache do navegador; conferir se `Esquadroes.jsx` contém `Navegação do esquadrão` + `flex-row` na `<nav>`.

---

## Checkpoint pendente — Edital em questão (cabeçalho)

- **Problema:** UX/visual do bloco superior (hero) insatisfatório; retomar com redesign completo do `HeroSection`.
- **Documento dedicado:** [`edital-questao-header.md`](edital-questao-header.md) (arquivos, o que preservar, próximo passo, validação).

---

## Última rodada registrada

**Rodada:** Esquadrões — pausa com estado consolidado (UX + correção de rota + doc)

**O que mudou**

- **`src/components/AppTabContent.jsx`** — `Esquadroes` recebe **`currentUserId`** (alinha com `App.jsx`; evita fluxo remoto incompleto pela aba principal).
- **`src/pages/Esquadroes.jsx`** — hero do esquadrão mais **premium** (gradiente, radial highlight, faixa lateral, badge ouro, título em degradê, foco com sublinhado); barra **Área interna** com fundo em gradiente suave; **`<nav>`** com **`flex-row` explícito**; **`MiniHeroStat`** com sombra/anel.
- **Percepção do usuário:** print ainda mostrava **sidebar vertical antiga**; no repo atual ela **não existe** — documentado no snapshot: checar pasta, reiniciar `npm run dev`, hard refresh.
- **`docs/handoff.md`** — este bloco e snapshot atualizados para **retomada** (“continuamos depois”).

**Como validar**

- Na pasta do repo: `npm run dev` → Esquadrões → hero novo + **abas horizontais** sob o card (não coluna à esquerda).
- `npm run build` (ok na última verificação).

**O que testar**

- Login pela shell normal (via `AppTabContent`): esquadrão remoto e convite seguem comportamento da rodada **squad_payload** (SQL aplicado no Supabase).

**Riscos / não coberto**

- Mesmos da rodada anterior: fórum interno majoritariamente local; listagem remota de todos os `Esquadrão`; sem `squad_members` no banco.

**Próximo passo**

- Retomar com o usuário: validar visual na máquina certa; depois opcional **squad_members + RLS**, fórum interno no Supabase, filtro de listagem remota.

---

## Histórico rápido — Esquadrões (rodada anterior, ainda válida)

- **`supabase/squad_payload.sql`**, **`src/lib/squadRemote.js`**, merge/persist/`?convite=` em **`Esquadroes.jsx`** + **`App.jsx`** — detalhes já descritos no snapshot e commits anteriores; aplicar SQL no Supabase se ainda não foi.

---

## Modelo para colar no fim de cada rodada

Substitua o conteúdo de **“Última rodada registrada”** acima por algo neste formato:

```markdown
**Rodada:** [A–F ou nome da entrega]

**O que mudou**
- …

**Como validar**
- …

**O que testar**
- …

**Riscos / não coberto**
- …

**Próximo passo**
- …
```

Atualize também **“Onde estamos agora”** em 2–5 bullets se o estado macro mudou.
