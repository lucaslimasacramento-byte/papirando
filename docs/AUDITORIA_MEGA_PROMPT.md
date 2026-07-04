# Mega Prompt v2 — Auditoria Completa e Blindagem do Papirando

> Prompt-mestre para auditar, corrigir e blindar a plataforma antes do lançamento (25/05/2026).
> Adaptado à stack REAL do projeto. Use inteiro ou por seções. Ordem: 1 → 14.
>
> **Como usar:** cole a seção "O PROMPT" no Claude. Cada bloco pode virar uma rodada de trabalho.
> As seções de referência (RBAC, logs, testes, matriz) servem tanto de prompt quanto de checklist de aceite.

---

## STACK REAL (contexto fixo — não é genérico)

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite + Tailwind (design system `pl-*`) |
| Backend / DB / Auth | **Supabase** (Postgres + Auth + RLS + Storage + Edge Functions Deno) |
| Servidor de IA | `ai-server.mjs` (Node, porta 8787) → Gemini / OpenAI / OpenRouter / Groq |
| Hospedagem | **Vercel** (frontend + rotas `/api/*`) |
| Pagamentos | **Asaas** (Stripe abandonado — código morto a remover) |
| E-mail transacional | Resend (via Edge Function) |
| Monitoramento | Sentry |
| Papéis reais | visitante · aluno · **admin** (gate por e-mail no front + `is_app_admin` no banco) |

**O que a plataforma NÃO tem hoje** (marcar como N/A ou "backlog futuro" na auditoria, não inventar):
- ❌ Professores/instrutores (não há esse papel)
- ❌ Certificados de conclusão / carga horária
- ❌ Player de vídeo próprio / aulas em vídeo hospedadas
- ❌ Cupons de desconto
- ❌ Suporte/chat em tempo real
- ✅ Tem: questões, simulados, redações, flashcards, mapas mentais, planos de estudo (FSRS), catálogo de concursos/vestibulares, comunidade, upload de foto de objetivo e PDF de edital.

> Regra de ouro da auditoria: **RLS do Supabase é a fronteira de segurança principal.** No modelo Supabase, o navegador fala direto com o banco usando a `anon key`. Esconder um botão no React NÃO protege nada — só a policy de RLS no Postgres protege. Todo achado de "acesso indevido" tem que ser confirmado testando a query direto, não olhando a UI.

---

## O PROMPT

Você é um auditor sênior de segurança defensiva, arquitetura SaaS, DevSecOps e LGPD. Vai auditar a plataforma **Papirando** (stack acima). Trabalhe como se estivesse preparando para produção real com alunos e pagamentos reais.

Para CADA achado, entregue: **arquivo:linha · severidade (P0/P1/P2/P3) · cenário concreto de ataque ou bug · impacto · como testar em ambiente próprio · correção**. Nunca reporte achismo — confirme lendo o código/SQL de verdade. Ao final de cada bloco, corrija os P0/P1 seguros e rode `npm test` + build.

Testes só em ambiente próprio/homologação. Nada de ataque a terceiros.

---

### BLOCO 1 — Segredos, chaves e ambiente (P0)
- Nenhuma chave privada no código-fonte (`src/`, `scripts/`, `supabase/functions/`, `api/`). Só `VITE_SUPABASE_ANON_KEY` pode ser pública.
- `.env*` e `.claude/` fora do git — confirmar no histórico (`git log --all -- .env`), não só no working tree.
- Nenhuma `VITE_*` guardando segredo (tudo que é `VITE_` vai pro navegador).
- `ai-server.mjs`: exige `AI_SERVER_TOKEN` fora de dev? Avisa se vazio? CORS por allowlist, não `*`.
- `CRON_SECRET` obrigatório e validado nas rotas de cron (`/api/instagram/publish-due`).
- Sentry: redigir CPF, e-mail, tokens de breadcrumbs/erros (`beforeSend`).
- Source maps não expostos em produção; `robots.txt` e `security.txt` adequados.

### BLOCO 2 — Banco de dados e RLS (P0 — o mais importante)
Para cada tabela criada nas migrations/SQL:
- Tem `ENABLE ROW LEVEL SECURITY` + policies de SELECT/INSERT/UPDATE/DELETE? Flag qualquer tabela de dados de usuário SEM RLS (aberta a qualquer logado).
- Policies frouxas: `USING (true)`, gate só em `auth.role()='authenticated'` (todo logado vê tudo), INSERT/UPDATE sem `WITH CHECK`.
- **Escalada de privilégio de plano:** um aluno consegue `update('subscriptions', {status:'active'})` ou mudar `profiles.role`/`plan` pelo console do navegador? Tem trigger protegendo mudança de role? As colunas de plano/role estão fora do alcance de UPDATE do próprio usuário?
- **IDOR/BOLA:** as policies amarram cada linha ao `auth.uid()` do dono? Testar: logado como Aluno A, tentar ler redação/nota/flashcard do Aluno B por id.
- Tabelas admin (`admin_crm`, `admin_finance`, rascunhos de catálogo): gate por `is_app_admin`/role no banco, não só no front.
- Funções `SECURITY DEFINER`: alguma deixa usuário comum escalar privilégio ou ler dados alheios?
- Constraints: FKs, `UNIQUE` (CPF/e-mail/telefone), `NOT NULL` onde importa; dados órfãos possíveis?
- Criptografia em repouso (Supabase já faz), backup automático e teste de restauração documentados.

### BLOCO 3 — Edge Functions, APIs e pagamentos (P0)
- `asaas-webhook`: valida token/assinatura ANTES de confiar no evento? Reverifica o pagamento na fonte (não confia no corpo)? Idempotente (evento repetido não duplica acesso)? Protege contra replay?
- `create-checkout-session`: exige autenticação? Preço/plano definidos no SERVIDOR (não aceita valor do navegador)?
- **`stripe-webhook`: remover** (código morto; planos legados `tatico`/`elite` podem sujar `subscriptions`).
- `register-free` / `start-trial`: rate limit efetivo (persistido no banco, não em memória do isolate)? Idempotente? Antifraude de CPF/IP real? Bots conseguem criar contas/trials em massa?
- Reembolso/chargeback/assinatura vencida: removem o acesso premium de fato?
- Todas: sem vazar stack trace/`detail` interno na resposta; CORS por allowlist (não `*` com credenciais); `service_role` nunca retorna ao cliente.
- Rotas `/api/*` da Vercel: autenticação em todas as privadas; validação de schema; métodos HTTP desnecessários bloqueados.

### BLOCO 4 — Autenticação, sessão e autorização (P1)
- Rotas protegidas: toda página logada redireciona anônimo? Páginas admin bloqueiam não-admin de verdade (e não só escondem o link)?
- Gate de admin: hoje usa e-mails fixos + domínio `@papirando.com` no `App.jsx`. Fonte de verdade tem que ser o banco (`profiles.role`/`is_app_admin`). O front pode usar pra UX, mas o RLS é quem protege.
- **Limites de plano** (free x Caderno x Estúdio): são aplicados no banco/servidor ou só escondidos na UI? Se UI-only, listar cada feature burlável (flashcards, questões, mapas, IA) — um usuário free chama a API direto e estoura o limite. Contadores de uso (`usage_counters`) são validados server-side?
- Sessão: cookies/tokens do Supabase — onde ficam (localStorage x cookie)? Expiração adequada? Logout revoga sessão? Sessão morre após troca de senha? Params de erro/token do OAuth são removidos da URL?
- Recuperação de senha: token curto, uso único, expira, invalida sessões antigas. Nunca enviar senha por e-mail.
- Enumeração de usuário: login e recuperação respondem genérico (não revelam "e-mail não existe")?
- MFA para admin (recomendado antes de expor painel financeiro).

### BLOCO 5 — Entradas, XSS e injeção (P1)
- XSS: todo `dangerouslySetInnerHTML`/`innerHTML` e todo render de conteúdo do usuário ou da **IA** como HTML/markdown sem sanitização. Comunidade/comentários e saídas de IA (flashcards, mapas, notas, análise de edital) são os alvos nº 1.
- Prompt injection: PDF de edital malicioso ou texto do usuário que injeta instruções na IA e volta como HTML executável.
- SQL injection: baixo risco pelo SDK do Supabase, mas conferir qualquer SQL cru / `rpc` que concatene string.
- Open redirect, path traversal em nomes de arquivo, CSV injection em qualquer export de relatório.
- `npm audit` — listar HIGH/CRITICAL com fix disponível.

### BLOCO 6 — Upload de arquivos e Storage (P1)
Alvos: foto de objetivo, PDF de edital.
- Valida tamanho, extensão E MIME real (não só a extensão)?
- Renomeia o arquivo (não usa nome do usuário)? Remove path traversal no nome?
- Bucket do Supabase Storage é **privado** com URLs assinadas expiráveis, ou público? Aluno A consegue abrir arquivo do Aluno B pela URL?
- Bloqueia HTML/SVG com script/executáveis? SVG servido com `Content-Type` seguro (não `image/svg+xml` inline em domínio principal)?

### BLOCO 7 — Regra de negócio: simulados, questões, redações, planos (P1)
- Nota/resultado de simulado calculado e validado no BACKEND (não aceita nota vinda do front)?
- Gabarito não exposto antes da hora (não vem no payload junto com a questão)?
- Reenvio duplicado / dupla submissão (clicar 2x) protegido por idempotência?
- Progresso e revisões (FSRS / `topicReviewApi`): datas e fuso horário corretos (revisão no dia certo)? Aluno consegue forjar progresso?
- Aluno acessa simulado/redação de outro aluno por id? (é IDOR — cai no Bloco 2 RLS).

### BLOCO 8 — Headers, transporte e produção Vercel (P1)
- HTTPS forçado + HSTS; TLS moderno (a Vercel cuida, confirmar).
- `vercel.json`: CSP, X-Content-Type-Options, X-Frame-Options/`frame-ancestors`, Referrer-Policy, Permissions-Policy, COOP/CORP. Listar os que faltam e aplicar sem quebrar o app.
- `Cache-Control` sem cachear páginas com dados de usuário.
- DEBUG desligado, stack trace escondido, logs sem dados sensíveis.

### BLOCO 9 — E-mail e domínio (P2)
- SPF, DKIM, DMARC configurados no domínio (anti-spoofing).
- Links de e-mail com token expirável; não enviar dados sensíveis desnecessários.
- Monitorar bounces/falhas de entrega do Resend.

### BLOCO 10 — Bugs funcionais e estabilidade (P1/P2)
Varra `src/pages/` e `src/lib/`:
- Promises sem `catch` → tela branca; estados de loading/vazio/erro faltando; `x.y.z` com `x` nulo.
- `useEffect` com deps erradas (loop de requisições / dado que não atualiza).
- Condições de corrida (dupla submissão de pagamento/salvar).
- Cache mostrando dado de outro usuário após troca de conta.
- Mensagens de erro amigáveis em PT-BR (não "TypeError...").

### BLOCO 11 — Performance (P2)
- `App.jsx` (~295KB) e `AdminConcursos.jsx` (~177KB): code-splitting por rota com `React.lazy`.
- Queries: `select('*')` onde bastam poucas colunas; N+1; paginação no catálogo (1.500 concursos).
- Bundle final analisado; deps não usadas removidas; imagens com lazy loading.

### BLOCO 12 — LGPD e privacidade (P2)
- Política de privacidade + termos publicados; base legal do tratamento.
- Minimização: coletar só o necessário (CPF é mesmo preciso?). Retenção e exclusão/anonimização.
- Exportação dos dados do titular; registro de consentimento.
- Se houver alunos menores: proteção adicional.
- Processo de resposta a incidente de vazamento.

### BLOCO 13 — Qualidade, testes e CI/CD (P2)
- Remover/condicionar os ~149 `console.log` (vazam dados no console do usuário).
- Código morto: Stripe, componentes aposentados, imports não usados.
- Testes dos 5 fluxos críticos sem cobertura: pagamento/webhook, registro, limites de plano, revisões FSRS, upload de edital.
- CI: secret scanning, `npm audit`/SCA, testes de autorização (RLS), bloqueio de deploy com falha crítica, branch protection + PR obrigatório.

---

## SEÇÃO A — Matriz RBAC (papéis reais do Papirando)

| Recurso | Visitante | Aluno | Admin | Precisa log? | Precisa MFA? |
|---|---|---|---|---|---|
| Páginas públicas / marketing | ver | ver | ver | não | não |
| Cadastro / login | usar | — | — | login sim | não |
| Questões / simulados | — | usar (por plano) | tudo | não | não |
| Redações / flashcards / mapas | — | CRUD **próprios** | ver todos | não | não |
| Planos de estudo (FSRS) | — | CRUD próprios | ver | não | não |
| Catálogo concursos (leitura) | ver publicados | ver publicados | ver+editar rascunhos | edição sim | recomendado |
| `subscriptions` / plano | — | **ver o próprio** (nunca editar) | ver/gerir | sim | sim |
| Admin CRM / financeiro | — | — | ver/gerir | sim | **sim** |
| Gestão de usuários / roles | — | — | super admin | **sim** | **sim** |
| Logs / auditoria | — | — | ver | acesso logado | sim |
| Webhooks / config | — | — | sistema | sim | — |

Para cada célula "editar/excluir/exportar", a regra é: **validado por RLS no banco**, não por checagem só no React.

---

## SEÇÃO B — Logs de auditoria obrigatórios

| Evento | Nível | Quem vê | Retenção | Alerta? |
|---|---|---|---|---|
| Login sucesso/falha | info/warn | admin | 90d | falhas repetidas → sim |
| Recuperação/troca de senha | warn | admin | 180d | sim |
| Novo dispositivo/local | info | dono+admin | 90d | admin de local estranho → sim |
| Criação de usuário | info | admin | 1a | não |
| Alteração de role/permissão | **critical** | super admin | permanente | **sim** |
| Compra / pagamento aprovado/recusado | info/warn | financeiro | 5a (fiscal) | falha em massa → sim |
| Reembolso / chargeback | warn | financeiro | 5a | sim |
| Liberação manual de acesso | warn | admin | 1a | sim |
| Webhook inválido/falho | error | sistema | 1a | **sim** |
| Acesso ao painel admin | info | super admin | 180d | não |
| Exportação de relatório/dados | warn | super admin | 1a | export grande → sim |
| Upload / exclusão de arquivo | info | admin | 90d | upload suspeito → sim |
| Erro crítico (500) | error | dev | 90d | pico → sim |

Campos mínimos por log: `timestamp, actor_id, actor_role, ip, user_agent, ação, alvo, resultado`. Nunca logar senha/token/CPF em claro.

---

## SEÇÃO C — Alertas automáticos (mínimos pré-lançamento)

| Condição | Gravidade | Canal | Ação imediata |
|---|---|---|---|
| Muitas tentativas de login / IP | alta | Sentry+e-mail | bloquear IP temporário |
| Criação/alteração de super admin | crítica | e-mail+SMS | confirmar com dono |
| Webhook Asaas inválido em série | alta | Sentry | verificar token/gateway |
| Pico de erros 500 | alta | Sentry | investigar deploy recente |
| Export grande de dados | alta | e-mail | confirmar autor |
| Acesso anormal a material pago | média | Sentry | revisar RLS/plano |
| Falha em backup | crítica | e-mail | restaurar rotina |

---

## SEÇÃO D — Plano de testes de segurança (autorizados, ambiente próprio)

Para cada: objetivo · como testar · resultado esperado · sinal de falha · prioridade.

1. **IDOR/BOLA:** logado como Aluno A, chamar `supabase.from('redacoes').select().eq('id', <id do B>)` no console. Esperado: 0 linhas. Falha: retorna dado do B. **P0**
2. **Escalada de plano:** `supabase.from('subscriptions').update({status:'active'}).eq('user_id', me)`. Esperado: erro RLS. Falha: vira premium. **P0**
3. **Escalada de role:** `update profiles set role='admin'`. Esperado: bloqueado por trigger/RLS. **P0**
4. **Webhook forjado:** POST em `asaas-webhook` sem token válido. Esperado: 403. Falha: concede acesso. **P0**
5. **Rate limit login:** 20 logins errados seguidos. Esperado: bloqueio temporário. **P1**
6. **Upload malicioso:** enviar `.svg` com `<script>` / arquivo `.html` como "foto". Esperado: rejeitado ou servido inerte. **P1**
7. **XSS comunidade/IA:** postar `<img src=x onerror=alert(1)>`. Esperado: escapado. **P1**
8. **Headers:** rodar contra a URL de produção — CSP/HSTS/X-Frame presentes. **P1**
9. **Limite de plano por API:** como usuário free, criar recursos acima do limite via API direta. Esperado: barrado no servidor. **P1**
10. **CORS:** requisição de origem não autorizada às Edge Functions/`/api`. Esperado: bloqueada. **P1**
11. **Enumeração:** login/recuperação com e-mail inexistente. Esperado: resposta genérica. **P2**
12. **Restauração de backup:** restaurar dump em ambiente limpo. Esperado: app sobe íntegro. **P1**

---

## SEÇÃO E — Matriz de prioridade (modelo a preencher com achados reais)

| Vulnerabilidade | Área | Impacto | Prob. | Severidade | Facilidade | Esforço | Prioridade | Prazo |
|---|---|---|---|---|---|---|---|---|
| _(ex.)_ Tabela X sem RLS | banco | vazamento PII | alta | crítica | fácil | baixo | **P0** | antes do lançamento |
| Stripe-webhook morto | backend | estado inconsistente | baixa | alta | — | baixo | P1 | 1ª versão |
| Limite de plano UI-only | backend/produto | perda de receita | alta | alta | fácil | médio | P1 | 1ª versão |
| console.log em massa | frontend | vaza dado no console | média | média | fácil | baixo | P2 | 2ª versão |

Legenda: **P0** imediato · **P1** urgente · **P2** próximo ciclo · **P3** melhoria planejada.

---

## SEÇÃO F — LISTA DE TAREFAS DE DESENVOLVIMENTO (o formato que você pediu)

> Formato por tarefa: **o quê · por quê · como testar · critério de aceite · prioridade · área**.

### 1) Correções CRÍTICAS antes de lançar (P0)

| # | O que fazer | Por que | Como testar | Critério de aceite | Área |
|---|---|---|---|---|---|
| C1 | Auditar RLS de TODA tabela; ativar onde faltar; amarrar linhas a `auth.uid()` | Sem RLS, qualquer aluno lê/edita dados de outro pelo navegador | Testes IDOR #1-3 da Seção D | Aluno A não lê nem altera nada do Aluno B; teste automatizado passa | banco/segurança |
| C2 | Bloquear escalada de plano/role (policies + trigger) | Aluno viraria premium/admin de graça | Testes #2 e #3 | UPDATE em `subscriptions.status`/`profiles.role` pelo usuário retorna erro | banco/segurança |
| C3 | Confirmar webhook Asaas: token + reverificação + idempotência | Premium grátis via evento forjado | Teste #4 + evento duplicado | Evento sem token → 403; duplicado não concede 2x | backend/segurança |
| C4 | Remover `stripe-webhook` e planos legados | Código morto suja `subscriptions` | Deploy sem a função; grep sem `tatico/elite` | Função removida; nenhum caminho grava plano inexistente | backend |
| C5 | Confirmar zero segredo no git e no bundle | Chave vazada = conta sequestrada | `git log --all -- .env`; grep `VITE_` por segredo | Nenhuma chave privada versionada nem em `VITE_*` | segurança |

### 2) Correções IMPORTANTES para a 1ª versão (P1)

| # | O que fazer | Por que | Como testar | Critério de aceite | Área |
|---|---|---|---|---|---|
| I1 | Aplicar limites de plano no servidor (não só UI) | Free burla limite via API e você perde receita | Teste #9 | API rejeita criação acima do limite do plano | backend |
| I2 | Migrar gate de admin para role do banco como fonte de verdade | E-mail fixo no front é frágil | Logar como não-admin e tentar rota/ação admin | Ação admin barrada por RLS mesmo forjando o front | backend/segurança |
| I3 | Endurecer upload (MIME real, rename, bucket privado + URL assinada) | Arquivo malicioso / acesso a arquivo alheio | Teste #6 | SVG/HTML rejeitado; arquivo do B inacessível ao A | backend/infra |
| I4 | Sanitizar todo render de conteúdo de usuário/IA | XSS rouba sessão | Teste #7 | Payload de XSS aparece escapado, não executa | frontend/segurança |
| I5 | Headers de segurança no `vercel.json` | Clickjacking, downgrade, vazamento de referer | Teste #8 | CSP/HSTS/X-Frame/Referrer presentes em produção | infra |
| I6 | Rate limit real (persistido) em login/registro/checkout | Força bruta, bots, spam de trial | Teste #5 | Bloqueio após N tentativas sobrevive a cold start | backend |
| I7 | Validar resultado de simulado no backend + gabarito protegido | Aluno forja nota / vê gabarito | Postar nota adulterada; inspecionar payload da questão | Nota recalculada no servidor; gabarito ausente antes da hora | backend |
| I8 | Redigir dados sensíveis no Sentry; erros amigáveis PT-BR | Vazamento de CPF/token em logs | Forçar erro e inspecionar evento Sentry | Nenhum CPF/token/e-mail no evento; usuário vê msg amigável | frontend/segurança |

### 3) Melhorias de segurança para a 2ª versão (P2)

| # | O que fazer | Por que | Critério de aceite | Área |
|---|---|---|---|---|
| M1 | MFA para admin | Painel financeiro precisa de 2º fator | Admin exige TOTP no login | segurança |
| M2 | Logs de auditoria da Seção B | Rastrear ações sensíveis | Eventos críticos gravados e visíveis ao super admin | backend |
| M3 | SPF/DKIM/DMARC no domínio | Anti-spoofing de e-mail | Ferramenta de e-mail valida os 3 | infra |
| M4 | Code-splitting `App.jsx`/`AdminConcursos.jsx` | App inteiro baixado na 1ª tela | Bundle inicial cai; rotas carregam sob demanda | frontend |
| M5 | LGPD: política, exportação e exclusão de dados | Conformidade legal | Titular exporta/exclui os próprios dados | produto/backend |
| M6 | Remover `console.log`; testes dos 5 fluxos críticos | Vazamento e regressão | 0 log sensível; testes cobrindo pagamento/registro/plano/FSRS/upload | frontend/backend |

### 4) Monitoramento contínuo

- Sentry com alertas da Seção C ativos.
- Painel de falhas de webhook Asaas e de entrega de e-mail (Resend).
- `npm audit` semanal + Dependabot/renovate.
- Revisão trimestral de acessos admin e de policies RLS novas.
- Alerta de backup falho e teste de restauração mensal.

### 5) Testes obrigatórios antes de CADA deploy

- [ ] `npm test` verde (inclui testes de autorização/RLS).
- [ ] `npm run build` sem erro.
- [ ] `npm audit` sem HIGH/CRITICAL novos.
- [ ] Secret scanning no diff (nenhuma chave nova).
- [ ] Smoke test dos fluxos: login, compra/trial, criar recurso respeitando limite de plano.
- [ ] Testes IDOR #1-3 automatizados passam.
- [ ] Deploy primeiro em preview/staging; rollback pronto.

---

### REGRAS PARA O CLAUDE AO EXECUTAR
- Ler antes de editar; aspas retas em JSX; tokens `pl-*` em UI; confirmar cada achado no código.
- Correção não muda comportamento visível sem avisar.
- Rodar `npm test` + build após corrigir; nunca entregar quebrado.
- Reportar em PT-BR, linguagem acessível, começando pelo resultado.
