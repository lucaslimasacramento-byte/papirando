# Edital em questão — checkpoint do cabeçalho (hero)

**Data:** 2026-04-18  
**Status:** pausa acordada — **o cabeçalho atual está insatisfatório**; na próxima rodada o foco é **refazer o hero** (UI/UX), mantendo a lógica de dados já ligada.

---

## O que já está implementado (não jogar fora às cegas)

- Arquivo principal: `src/pages/EditalQuestao.jsx`
  - **`HeroSection`** (~linhas 583–691): layout denso (`xl:items-center`), menos padding, KPIs em **`EditalHeroStat`** (fim do arquivo).
  - **`buildCourseOptions`**: une `cursos`, disciplinas inferidas (`bancoDisciplinas`) e **`contestLibrary`**; evita duplicar plano já existente no curso; expõe **`editalUrl`** a partir de `edital_url` (curso ou template).
  - **`selectedCoursePlan`**: quando o plano persistido/local não existe nas opções, prefere o plano ativo do app (se existir na lista).
  - Fluxo **catálogo só**: aviso âmbar, resumo orientando importação em Planos, botão principal vira **“Importar em Planos”**, atalhos **Ver concursos** / **Planos e importação** / link **Abrir edital (PDF)** quando houver URL.
  - **`EmptyState`**: mensagem e CTA distintos para catálogo; link ao PDF quando existir.

- Props no shell (manter ao refazer o layout):
  - `src/components/AppTabContent.jsx` — `EditalQuestao` recebe `contestLibrary`, `selectedCoursePlan`, `onOpenPlanos`, `onOpenConcursos`.
  - `src/App.jsx` — mesmo conjunto no bloco legado `edital_questao`.

---

## Próximo passo explícito (quando retomar)

1. **Refazer o `HeroSection`** visual e hierárquico: alinhar a um padrão do app (ex.: Legislação / Mapas — ver `docs/ui-guidelines.md` e telas de referência).
2. Reavaliar **gradiente escuro**, **densidade**, **relação título × seletor × KPIs** e possível **grid** em vez de duas colunas “solta”.
3. **Preservar** integrações: catálogo, `edital_url`, navegação para `planos` / `concursos`, sync com `selectedCoursePlan`.

---

## Validação rápida após o redesign

- Trocar curso no seletor: métricas e resumo coerentes.
- Plano só catálogo: CTA para Planos + PDF se existir.
- `npm run build` após mudanças estruturais amplas.

---

## Referência cruzada

Atualização macro do projeto: `handoff.md` (seção *Checkpoint pendente — Edital em questão*).
