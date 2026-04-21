# Papirando — Roadmap de Produto

> Última atualização: Abril 2026
> Estratégia: Plataforma premium de **organização e gestão de estudos** para concurseiros brasileiros.
> Posicionamento: Não competimos em conteúdo (videoaulas) — dominamos a camada de **método, organização e IA** que todos os concorrentes negligenciam.

---

## Visão do Produto

O aluno entra com um edital. Sai com um plano. Estuda, revisa, e mede tudo dentro do Papirando.

```
Conteúdo (PDF) → Leitura → Flashcard → Questão → Simulado → Revisão → Aprovação
```

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) |
| AI Server | Node.js — Gemini 2.0 Flash + Claude Haiku + Ollama (dev) |
| PDF | pdfjs-dist (já instalado) |
| Deploy | Vercel (frontend) + servidor node (ai-server) |

---

## Estratégia de IA

### Providers por camada

| Provider | Uso | Custo por operação |
|---|---|---|
| **Gemini 2.0 Flash** | Volume: flashcards, resumos, análise de edital | ~R$ 0,002 |
| **Claude Haiku** | Raciocínio: redação, tutor, diagnóstico de performance | ~R$ 0,03 |
| **Ollama local** | Desenvolvimento e testes | Gratuito |

### Endpoints a implementar no AI Server

| Endpoint | Provider | Funcionalidade |
|---|---|---|
| `POST /api/analyze-edital` | Gemini Flash | PDF do edital → disciplinas + tópicos estruturados |
| `POST /api/generate-flashcards` | Gemini Flash | Trecho selecionado no PDF → flashcards gerados |
| `POST /api/summarize-topic` | Gemini Flash | PDF/texto → resumo estruturado de 1 página |
| `POST /api/explain-question` | Claude Haiku | Questão errada → explicação pedagógica |
| `POST /api/analyze-essay` | Claude Haiku | Redação → nota + feedback por critério |
| `POST /api/study-diagnosis` | Claude Haiku | Histórico de erros → diagnóstico + recomendação |
| `POST /api/adaptive-schedule` | Claude Haiku | Desempenho + tempo disponível → cronograma ajustado |

### Custo mensal estimado por escala

| Fase | Usuários ativos | Custo IA/mês | Receita estimada |
|---|---|---|---|
| Beta | 100 | R$ 10–30 | R$ 2.000 |
| Lançamento | 500 | R$ 50–150 | R$ 10.000 |
| Tração | 2.000 | R$ 200–600 | R$ 40.000 |
| Escala | 10.000 | R$ 800–2.500 | R$ 200.000 |

---

## Modelo de Negócio

### Free (grátis)
- 3 disciplinas, 30 flashcards, timer básico de sessão
- 5 gerações de IA por mês
- Comunidade (somente leitura)

### Pro — R$ 19,90/mês
- Disciplinas e flashcards ilimitados
- Biblioteca de PDFs de conteúdo completa
- 100 gerações de IA por mês
- Comunidades + Esquadrões
- Estatísticas e histórico completos
- Cronograma semanal

### Premium — R$ 34,90/mês
- Tudo do Pro
- Gerações de IA ilimitadas
- Flashcards gerados automaticamente por IA
- Cronograma adaptativo em tempo real
- Tutor IA ilimitado (explicação de questões, diagnóstico)
- Dashboard preditivo (previsão de cobertura do edital)
- Acesso antecipado a novos recursos

---

## FASE 0 — Fundação
**Prazo:** 2–3 semanas
**Objetivo:** Produto funcional de ponta a ponta. Base sólida para tudo que vem.

### Autenticação (`Login.jsx` — atualmente 10%)
- [ ] Tela de login com email/senha via Supabase Auth
- [ ] Tela de cadastro com validação de campos
- [ ] Recuperação de senha por email
- [ ] Proteção de rotas (redireciona para login se não autenticado)
- [ ] Redirecionamento automático pós-login

### Infraestrutura
- [x] `.gitignore` criado
- [ ] Primeiro commit no Git
- [ ] Repositório no GitHub
- [ ] Deploy no Vercel (frontend)
- [ ] Variáveis de ambiente configuradas em produção
- [ ] `.env.example` documentado (sem valores reais)

### Dashboard com dados reais
- [ ] Substituir mocks por queries reais no Supabase
- [ ] Sessões de estudo gravando no banco
- [ ] Streak calculado a partir de dados reais de sessões

---

## FASE 1 — MVP Core
**Prazo:** 3–5 semanas após Fase 0
**Objetivo:** Ciclo completo de estudo funcionando. Primeiro usuário pagante.

### Sessões de Estudo — Ciclos (atualmente 25%)
- [ ] Timer Pomodoro integrado (25min estudo / 5min pausa)
- [ ] Seleção de disciplina antes de iniciar sessão
- [ ] Gravação automática ao finalizar (tempo, disciplina, data)
- [ ] Pausa e retomada de sessão

### Disciplinas + Edital (atualmente 40–100%)
- [ ] CRUD completo de disciplinas e tópicos
- [ ] Progresso por tópico: pendente / em andamento / concluído
- [ ] Edital verticalizado com visualização limpa
- [ ] Upload de PDF do edital → IA extrai disciplinas (`/api/analyze-edital`)

### Flashcards com Spaced Repetition (atualmente 85% UI)
- [ ] CRUD de decks e cards no Supabase
- [ ] Algoritmo FSRS implementado (20–40% mais eficiente que Anki SM-2)
- [ ] Sessão de revisão diária gerada automaticamente
- [ ] Estatísticas de retenção por deck

### Planejamento Semanal
- [ ] Configuração de horas disponíveis por dia da semana
- [ ] Meta de horas por disciplina
- [ ] Visualização de progresso semanal vs. meta

### Gamificação + Perfil
- [ ] Badges por conquistas (streak 7/30/100 dias, horas estudadas, acertos)
- [ ] Sistema de XP e nível do estudante
- [ ] Histórico completo de sessões com filtros

### Assinatura
- [ ] Integração com Pagar.me ou Stripe
- [ ] Planos Free / Pro / Premium funcionais
- [ ] Bloqueio de features por plano via Supabase

---

## FASE 2 — Conteúdo + IA
**Prazo:** 4–6 semanas após Fase 1
**Objetivo:** Diferenciação real de mercado. Nenhum concorrente tem isso tudo junto.

### Biblioteca de Conteúdo em PDF
- [ ] Upload de PDFs pelo admin (Supabase Storage)
- [ ] Organização por disciplina e tópico
- [ ] Leitor de PDF nativo no app (`pdfjs-dist` — já instalado)
- [ ] Anotações vinculadas a páginas específicas
- [ ] Marcação de trechos com highlight colorido
- [ ] Busca por termos dentro do PDF

### Trilha de Estudo por Disciplina
- [ ] Estrutura: Disciplina → Tópicos → [PDF + Flashcards + Questões]
- [ ] Progresso da trilha reflete automaticamente no edital verticalizado

### Grifar → Flashcard ⚡ (feature killer — nenhum concorrente no Brasil tem)
- [ ] Aluno seleciona trecho no PDF
- [ ] Botão flutuante "Criar flashcard" aparece
- [ ] IA gera frente e verso automaticamente (`/api/generate-flashcards`)
- [ ] Card salvo direto no deck da disciplina correspondente

### Resumos por IA
- [ ] Botão "Resumir tópico" dentro do leitor de PDF
- [ ] IA gera resumo estruturado de 1 página (`/api/summarize-topic`)
- [ ] Resumo salvo na biblioteca pessoal do aluno
- [ ] Opção de exportar como PDF

### Tutor de Dúvidas por IA
- [ ] Na tela de questões/simulados: botão "Por que errei isso?"
- [ ] IA explica em linguagem simples e pedagógica (`/api/explain-question`)
- [ ] Leva em conta disciplina, banca e histórico do aluno

### Diagnóstico de Performance
- [ ] Análise automática semanal dos pontos fracos
- [ ] "Você erra 60% de princípios constitucionais — revise antes de avançar"
- [ ] Sugestão de material específico e flashcards (`/api/study-diagnosis`)

---

## FASE 3 — Social + Comunidade
**Prazo:** 4–6 semanas após Fase 2
**Objetivo:** Crescimento orgânico via comunidade. Retenção de longo prazo.

### Comunidades
- [ ] Feed de posts por disciplina/concurso (estilo Reddit)
- [ ] Sistema de upvotes, comentários, posts fixados
- [ ] Filtros: hot, novos, top
- [ ] Posts salvos pelo usuário

### Esquadrões (grupos privados de estudo)
- [ ] Criação com código de convite
- [ ] Ranking interno semanal entre membros
- [ ] Mural de avisos pelo líder
- [ ] Simulados exclusivos do esquadrão
- [ ] Permissões configuráveis (líder, professor, membro)

### Convide e Ganhe
- [ ] Código de referral único por usuário
- [ ] Rastreamento de indicações convertidas
- [ ] Recompensas: 1 mês grátis, extensão de plano, créditos de IA

---

## FASE 4 — Inteligência Adaptativa
**Prazo:** 6–8 semanas após Fase 3
**Objetivo:** Plataforma que evolui com o aluno. Lock-in por valor real.

### Cronograma Adaptativo por IA
- [ ] Aluno informa data da prova e horas disponíveis por dia
- [ ] IA distribui tópicos do edital no calendário (`/api/adaptive-schedule`)
- [ ] Ajuste automático quando aluno perde dias ou muda disponibilidade
- [ ] Alerta: "No ritmo atual, você cobre o edital X dias antes da prova"
- [ ] Realocação de tópicos conforme desempenho em questões

### Dashboard Preditivo
- [ ] Previsão de cobertura do edital na data da prova
- [ ] Alerta de disciplinas em risco de não serem cobertas
- [ ] Projeção de nota em simulado baseada no histórico
- [ ] Comparativo com média de aprovados históricos

### Simulados Inteligentes
- [ ] Banco de questões integrado (importação ou parceria)
- [ ] Montagem de simulado adaptativo (peso maior nas matérias fracas)
- [ ] Ranking nacional entre usuários Papirando
- [ ] Análise por banca: padrão CESPE, FCC, FGV, VUNESP

### Vade Mecum + Legislação
- [ ] Biblioteca de leis em texto atualizada
- [ ] Busca semântica (não apenas por palavra exata)
- [ ] Anotações salvas por usuário por artigo
- [ ] IA responde: "qual artigo trata de X?"

---

## FASE 5 — Escala e Produto Completo
**Prazo:** 3–4 meses após Fase 4
**Objetivo:** Consolidar posição de mercado. Receita recorrente sólida.

### Audiobooks
- [ ] Biblioteca de áudio por disciplina (upload pelo admin)
- [ ] Player com velocidade ajustável (0.75x a 2x)
- [ ] Sincronização de progresso com flashcards da disciplina
- [ ] Playlists da comunidade

### Mapas Mentais
- [ ] Criação manual por tópico/disciplina
- [ ] Geração automática por IA a partir de PDF ou anotações
- [ ] Compartilhamento na comunidade

### Bem-Estar e Foco
- [ ] Pausas guiadas integradas ao timer Pomodoro
- [ ] Mini-meditações e exercícios de respiração (biblioteca de áudio)
- [ ] Rastreamento de humor/energia por sessão
- [ ] Alertas de burnout baseados no padrão de uso

### App Mobile
- [ ] PWA como primeira versão mobile (sem precisar de loja)
- [ ] Push notifications para revisões pendentes e metas do dia
- [ ] Modo offline para flashcards e PDFs baixados

### Admin Panel (completar painéis já existentes)
- [ ] Dashboard de métricas: MAU, churn, receita, conversão
- [ ] Upload e gestão de conteúdo (PDFs, audiobooks)
- [ ] CRM de leads com funil de conversão
- [ ] Relatórios financeiros e repasses

---

## Backlog / Ideias Futuras

- API pública para integração com plataformas de questões (QConcursos, etc.)
- Certificados de conclusão por disciplina/trilha
- Mentoria 1:1 com professores parceiros (marketplace)
- Exportar cronograma para Google Calendar
- Notificações de novos editais por cargo/área de interesse
- IA que adapta linguagem das explicações ao nível do aluno
- Versão web offline via Service Worker

---

## Status Atual (Abril 2026)

| Módulo | Status | Fase |
|---|---|---|
| Login/Auth | 🔴 10% | Fase 0 — prioridade máxima |
| Ciclos/Timer | 🔴 25% | Fase 1 |
| AI Server | 🟡 25% — config pronta | Fase 1 (endpoints) |
| Esquadrões | 🔴 30% | Fase 3 |
| Edital + AI | 🟡 40% | Fase 1 (completar) |
| Comunidades | 🟡 60% | Fase 3 |
| Dashboard | 🟡 70% | Fase 0 (dados reais) |
| Simulados | 🟡 UI pronta, sem backend | Fase 4 |
| Flashcards | 🟡 UI pronta, sem FSRS | Fase 1 |
| Disciplinas | ✅ Produção | Manutenção |
| Conteúdo/PDFs | 🔴 0% — a construir | Fase 2 |

**PRÓXIMO PASSO: Fase 0 — Login funcional + primeiro commit no Git.**
