# Papirando — Contexto do produto

Documento de referência para humanos e para IA. Atualizar quando o produto ou a stack mudarem materialmente.

---

## Objetivo do produto

O **Papirando** é uma plataforma SaaS de **estudo para concursos públicos**: centraliza edital, disciplinas, materiais, questões, simulados, flashcards, sessões de estudo, planejamento, bem-estar e recursos assistidos por IA. O posicionamento é **premium**: interface calma, hierarquia clara e sensação de produto “enterprise” para o estudante, não de ferramenta amadora.

---

## Público e proposta de valor

- **Público:** candidatos a concursos que precisam de organização, acompanhamento de progresso e conteúdo estruturado.
- **Valor:** um único lugar para catálogo de concursos, trilhas por disciplina, prática (questões/simulados), memorização (flashcards/FSRS), revisão, metas, comunidade e painéis administrativos para operação do negócio.

---

## Stack técnica

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19, Vite 8 |
| Estilo | Tailwind CSS 3.4, tokens em `src/index.css` |
| Backend / dados | Supabase (Auth + Postgres + APIs geradas) |
| PDF | pdfjs-dist |
| Ícones | lucide-react |
| IA (opcional, dev) | `ai-server.mjs` — proxy local (Ollama / OpenAI / Gemini conforme env) |
| Qualidade | ESLint 9 (`npm run lint`) |

Variáveis de ambiente relevantes: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Em desenvolvimento, o Vite pode expor o Supabase via prefixo `/supabase` (ver `vite.config.js` e `src/lib/supabase.js`).

---

## Funcionalidades (visão macro)

**Estudo e conteúdo**

- Dashboard e estatísticas
- Disciplinas e detalhe por disciplina (progresso, materiais)
- Concursos disponíveis, “meus concursos”, detalhe do concurso
- Edital e navegação por edital/questão
- Questões, simulados, flashcards (incl. lógica FSRS em `src/lib/fsrs.js`)
- Mapas mentais, redações, legislação / Vade Mecum
- Audiobooks e progresso
- Materiais, revisões, ciclos, metas semanais, planejamento
- Sessões de estudo e histórico
- Bem-estar (biblioteca de conteúdo)
- Aplicativos / integrações expostas na UI

**Conta e monetização**

- Login (Supabase Auth)
- Perfil, assinatura, planos (`profiles.subscription_plan`: gratuito, tático, elite)
- Convide e ganhe (referrals)

**Comunidade e social**

- Comunidades, esquadrões (features sociais / grupos)

**Administração (operacional)**

- Painéis admin: dashboard, usuários, concursos, questões, disciplinas padrão, CRM, finanças, configurações

**IA**

- Cliente em `src/lib/aiClient.js` e fluxos específicos (ex.: edital) — depende de servidor/proxy configurado; não assumir disponível em produção sem hardening.

---

## Estado atual (snapshot)

- **App:** SPA monolítica em termos de orquestração — `App.jsx` concentra muito estado e roteamento por “view”.
- **UI:** identidade **SaaS premium** (neutro frio + azul contido); shell com sidebar escura, canvas claro, componentes utilitários em CSS (`page-head`, `section-card`, `btn-primary`/`btn-secondary`, tokens em `src/index.css`).
- **Dados:** integração ativa com Supabase; scripts SQL versionados em `supabase/*.sql` (módulos: materiais, questões, flashcards, sessões, metas, mapas mentais, comunidade, referrals, catálogo, admin, etc.).
- **Riscos conhecidos:** possível **drift** entre esquema SQL em repo e tabelas efetivamente usadas no front; `ai-server` pensado para dev — **não** expor sem autenticação e políticas de CORS adequadas.

### Padronização visual em rodadas (`.cursorrules`)

Trabalho contínuo de alinhamento ao guia `docs/ui-guidelines.md`: reduzir `font-black` e hex soltos, usar `page-shell` / `page-head` / `section-card` onde couber, testar ~1280px e mobile.

| Rodada | Escopo | Status (última atualização: **2026-04-14**) |
|--------|--------|-----------------------------------------------|
| **A** | Principal: Dashboard, Planos, Concursos, Lembretes, Disciplinas, Meus Concursos | Concluída |
| **B** | Estudos: Edital, Planejamento, Metas, Histórico, Estatísticas | Concluída |
| **C** | Prática: Sessões, Flashcards, Revisões, Questões, Simulados, Redações | Concluída |
| **D** | Biblioteca: Materiais, Audiobooks, Mapas mentais, Legislação, Edital em questão | Concluída |
| **E** | Apoio: Comunidades, Esquadrões, Conciliador, Aplicativos, Bem-estar, Convide e ganhe, Perfil | Concluída |
| **F** | Admin + Assinatura: `AdminDashboard`, `AdminUsuarios`, `AdminConcursos`, `AdminQuestoes`, `AdminDisciplinasPadrao`, `AdminCRM`, `AdminFinance`, `AdminConfiguracoes`, `Assinatura` | **Pendente — retomar aqui** |

**Último build verificado:** `npm run build` OK após a Rodada E.

### Onde continuar amanhã

1. Ler **`docs/handoff.md`** (última rodada registrada + riscos).
2. Executar **Rodada F** conforme tabela acima e `docs/ui-guidelines.md`.
3. Ao encerrar a sessão, atualizar **`docs/handoff.md`** (obrigatório por `.cursorrules`).

---

## Glossário rápido

- **Plano:** gratuito / tático / elite — refletido no perfil e no selo de assinatura no header.
- **Catálogo:** concursos e disciplinas podem vir de dados estáticos (`src/data/*`) e/ou APIs Supabase (`src/lib/*Api.js`).

---

## Manutenção deste documento

Quando adicionar um módulo grande (nova área de menu, novo domínio de dados), atualizar: **funcionalidades**, **estado atual** e, se necessário, `architecture.md` e `roadmap.md`.

Para continuidade entre chats da IA, use **`docs/handoff.md`**: lá fica o snapshot da última rodada e o próximo passo explícito (atualizar ao encerrar cada rodada — ver `.cursorrules`).
