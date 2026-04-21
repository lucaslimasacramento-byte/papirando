# Handoff entre conversas

**Propósito:** memória curta e acionável. Ao **abrir um chat novo**, a IA deve ler este arquivo **depois** de `context.md`. Ao **finalizar uma rodada**, a IA deve **atualizar este arquivo** com o bloco da última rodada e o próximo passo explícito.

*Última atualização: 2026-04-21 — **Deploy SQL**: bundle RLS admin + `registration_antifraud` via `supabase/deploy_registration_and_admin_rls.ps1`. **RLS admin** em [`docs/supabase-admin-rls.md`](supabase-admin-rls.md). Itens anteriores: Esquadrões; **Edital em questão** — `docs/edital-questao-header.md`.*

**Pausa (redações):** Editor com **coluna de esqueletos 4+7+7+4** (`redacaoEsqueletosMilimetricos.js`) + faixas separadoras; `REDACAO_KIT_MODELOS` reexporta os mesmos textos; admin JSON continua podendo sobrescrever `kit_json.modelos`.

---

## Instruções para quem retomar (ler primeiro)

1. **RLS admin (Supabase):** aplicar e validar conforme [`docs/supabase-admin-rls.md`](supabase-admin-rls.md) — `admin_rls_helpers.sql`, `profiles_admin_rls.sql`, depois políticas atualizadas nas tabelas admin.
2. **Fórum (prioridade imediata):** `src/pages/Comunidades.jsx`, `src/lib/communityApi.js`, `supabase/community.sql`; shell da aba: `App.jsx` (content scroll `comunidades`), `AppTabContent.jsx` (wrapper `flex-1 min-h-0`). **Outros:** `src/lib/vadeMecumApi.js`, `AdminLegislacao.jsx`, `Legislacao.jsx`. Mapas: `mind_map_gallery.sql`, `mindMapGalleryApi`, etc. Redações: `Redacoes.jsx`, `redacaoSiteContentApi`, `AdminConfiguracoes`.
3. **Ranking:** só dados reais (`question_answers` + `profiles`); sem preenchimento fictício.
4. **Redações:** `REDACAO_THEME_BANK` na aba **Banco de temas**; **Nova correção** = banca + editor + **?** (guias); **Dicas** = kit fixo + cards do Supabase; histórico lateral com `onDeleteRedacao`.
5. **Design system:** manter `docs/ui-guidelines.md` — `btn-primary`, tokens slate/blue, evitar faixas escuras no canvas.
6. **Validação local:** `npx eslint` nos arquivos alterados; `npm run build` se houver mudança estrutural ampla.

---

## Onde estamos agora (snapshot)

- **Vercel:** `npm run vercel:preview` / `npm run vercel:prod`; env `VITE_SUPABASE_*` no dashboard; Auth URLs no Supabase — ver `docs/architecture.md` → *Deploy na Vercel*.
- **Deploy SQL (repo):** `npm run db:bundle:admin-registration` gera o bundle; com projeto ligado (`npm run supabase:link`), `npm run db:deploy:admin-registration` aplica no remoto via CLI. **`npm run db:deploy:admin-rls-phase-c`** aplica em sequência os SQL da Fase C (lista em `scripts/deploy-admin-rls-phase-c.mjs`). Alternativa: `supabase/deploy_registration_and_admin_rls.ps1` (flag `-Deploy`). Ver `docs/architecture.md` → *CLI e deploy remoto*.
- **Admin / RLS (repo):** criados `supabase/admin_rls_helpers.sql` (`is_app_admin` / `is_profile_admin`) e `supabase/profiles_admin_rls.sql`; políticas que usavam JWT com e-mail fixo passaram a `public.is_app_admin()` nos SQL listados em [`supabase-admin-rls.md`](supabase-admin-rls.md). **Pendente no host:** correr scripts no Supabase e testar painel admin ponta a ponta.
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

**Rodada:** Bundle de deploy — RLS admin (`is_app_admin`) + cadastro/antifraude (`registration_antifraud`)

**O que mudou**

- **`supabase/deploy_registration_and_admin_rls.ps1`** — gera `deploy_registration_and_admin_rls.bundle.sql` na ordem: `admin_rls_helpers.sql` → `profiles_admin_rls.sql` → `registration_antifraud.sql`.
- **`.gitignore`** — ignora `supabase/*.bundle.sql` (artefato local; fonte continua nos três `.sql`).
- Comentário de referência no topo de **`supabase/registration_antifraud.sql`** apontando para o script.

**Como validar**

1. Na pasta `supabase/`: `.\deploy_registration_and_admin_rls.ps1`
2. Abrir o ficheiro gerado `deploy_registration_and_admin_rls.bundle.sql`, copiar tudo, colar no **SQL Editor** do Supabase e executar.
3. Se o projeto nunca recebeu a Fase C completa: reaplicar os scripts listados em [`supabase-admin-rls.md`](supabase-admin-rls.md) (políticas nas outras tabelas).

**O que testar**

- Utilizador **admin** (`profiles.role = 'admin'`): `AdminUsuarios` lista e atualiza perfis; operações admin nas áreas já migradas para `is_app_admin()`.
- **Cadastro:** confirmação de e-mail atualiza `profiles.email_verificado` e `status_cadastro`; CPF inválido rejeitado no servidor; RPCs `registration_email_exists` / `registration_cpf_exists` só com **service_role** (Edge Function), não com anon.

**Riscos / não coberto**

- O bundle **não** substitui a reaplicação de todos os `supabase/*.sql` citados em `supabase-admin-rls.md` se o remoto ainda tiver políticas antigas por JWT fixo.
- Não foi possível executar o SQL no projeto Supabase remoto a partir deste ambiente (credenciais / acesso ao teu painel).

**Próximo passo**

- Correr o bundle no Supabase e, se necessário, completar a lista de scripts da Fase C em `supabase-admin-rls.md`; validar fórum e restantes prioridades do handoff.

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
