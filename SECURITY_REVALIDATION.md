# SECURITY_REVALIDATION.md

Data: 2026-05-08

Escopo: segunda rodada Red Team + QA + resiliencia operacional sobre React/Vite, Vercel API routes, Supabase Auth/Postgres/RLS/Storage/Edge Functions, Stripe e endpoints de IA.

## Resumo Executivo

A segunda rodada validou as correcoes da auditoria inicial e encontrou regressao real no fluxo admin: ao apagar concurso, uma sessao local invalida podia chegar ao Supabase Auth como JWT sem `sub`, gerando o alerta cru `invalid claim: missing sub claim`. A correcao agora valida storage de auth antes de migrar sessoes antigas, remove somente tokens sem `sub`/malformados/de outro projeto e preserva tokens expirados para permitir refresh token normal.

Tambem foram encontrados riscos mais profundos: view admin de assinaturas com potencial bypass de RLS, Stripe liberando plano `tatico` para price desconhecido, ausencia de idempotencia por `event.id` no webhook, rate limit de IA apenas por IP e convites de esquadrao com codigo curto demais. Todos receberam correcoes no codigo/SQL, com compatibilidade mantida quando o SQL novo ainda nao estiver aplicado.

## Fluxos testados

- Build de producao com Vite: passou.
- Lint: passou com 8 warnings preexistentes, 0 erros.
- Testes unitarios/regressao: passou, 10 arquivos e 60 testes.
- `npm audit --audit-level=moderate`: 0 vulnerabilidades.
- Smoke do dev server em `127.0.0.1:5175`: `/` e `/admin/concursos` responderam 200 e HTML com `#root`.
- API IA via handler local:
  - `GET /api/ai/health`: 200.
  - Health nao expoe `provider` nem `model`.
  - `POST /api/ai/generate-flashcards` sem token: 401.
- API convites beta via handler local:
  - `GET /api/beta-invites` sem token: 401.
- Probe controlado Supabase com anon key, sem imprimir dados:
  - `contest_templates`: 200 com linha publica esperada.
  - `subscriptions`: 200 com 0 linhas anon.
  - `subscriptions_admin_view`: 200 com 0 linhas anon no estado atual.
  - `beta_invites`: 200 com 0 linhas anon.

## Fluxos quebrados encontrados

### Exclusao de concurso com sessao local invalida

- Sintoma: alerta `invalid claim: missing sub claim`.
- Causa provavel: storage do Supabase podia conter/migrar token que parecia JWT, mas nao era access token de usuario (`sub` ausente), normalmente anon key ou sessao de outro projeto.
- Impacto: fluxo admin quebrava e a UX vazava erro interno de Auth.
- Correcao aplicada:
  - `src/lib/supabase.js` valida sessoes migradas por formato, `sub` e projeto.
  - `clearInvalidSupabaseAuthStorage()` remove sessao local invalida.
  - `src/App.jsx` transforma `missing sub claim`/`invalid claim` em "Sessao expirada. Faca login novamente para continuar."
  - Teste `src/lib/supabaseAuthStorage.test.js`.

## Vulnerabilidades novas encontradas

### View admin de assinaturas podia ser superficie de bypass de RLS

- Severidade: Alto.
- Arquivos: `supabase/subscriptions.sql`, `src/lib/subscriptionApi.js`, `src/pages/AdminAssinaturas.jsx`.
- Risco: views em Postgres podem rodar com privilegios do owner e escapar de RLS dependendo da configuracao. A view juntava `subscriptions` com `auth.users`.
- Correcao: acesso direto a `subscriptions_admin_view` foi revogado; criada RPC `admin_list_subscriptions()` com `public.is_app_admin()` explicito. Frontend usa RPC e cai para query direta somente se a RPC ainda nao foi aplicada.

### Stripe aceitava price desconhecido como plano `tatico`

- Severidade: Alto.
- Arquivo: `supabase/functions/stripe-webhook/index.ts`.
- Risco economico: price ID desconhecido/misconfigurado poderia liberar premium indevido.
- Correcao: `planNameFromPriceId()` retorna `null` para price desconhecido e o webhook nao cria assinatura premium nesses casos.

### Webhook Stripe sem tabela de idempotencia por evento

- Severidade: Medio/Alto.
- Arquivos: `supabase/functions/stripe-webhook/index.ts`, `supabase/subscriptions.sql`.
- Risco: eventos duplicados/retries podiam reprocessar efeitos. Upsert por subscription ajudava, mas nao bloqueava replay de evento.
- Correcao: tabela `stripe_webhook_events` e registro por `event.id`; duplicado retorna 200 e nao reprocessa. Se a tabela ainda nao existir em producao, a function continua operando e registra warning.

### Rate limit de IA apenas por IP

- Severidade: Medio.
- Arquivos: `api/_ai.js`, `api/ai.js`.
- Risco de abuso de custo: usuarios autenticados em IPs diferentes poderiam escapar do limite por IP.
- Correcao: rate limit agora roda por IP e por `user:${id}` depois da autenticacao.

### Convite de esquadrao com codigo curto e entrada livre

- Severidade: Medio.
- Arquivos: `src/lib/squadRemote.js`, `supabase/squad_payload.sql`.
- Risco: enumeracao/bruteforce de turmas privadas via RPC `resolve_squad_invite`.
- Correcao: normalizacao para `A-Z0-9-`, limite 6-32 chars no cliente e no SQL. Testes adicionados.

## Vulnerabilidades confirmadas corrigidas

- Token estatico publico `VITE_AI_SERVER_TOKEN`: removido.
- CORS wildcard de Edge Functions: trocado por allowlist dinamica.
- Health de IA com provider/modelo: removido do publico.
- Transcricao IA: validacao de MIME/data URL/tamanho.
- Convites beta: API e dev middleware exigem JWT e usam RPC admin.
- Uploads principais: validacao de extensao, MIME e tamanho.
- Perfil: allowlist de update e trigger SQL contra campos privilegiados.
- Checkout: POST obrigatorio, billing/plan validado, rate limit e erro generico.

## Tentativas de exploração simuladas

- Chamada IA sem Authorization: retornou 401.
- Chamada beta-invites sem Authorization: retornou 401.
- Health de IA: nao retornou `provider`/`model`.
- Token Supabase sem `sub`: teste unitario rejeita e impede migracao como sessao valida.
- Convite de esquadrao curto: teste unitario bloqueia antes da RPC.
- Convite de esquadrao com caracteres extras: teste unitario normaliza antes da RPC.
- Supabase anon probe: tabelas sensiveis nao retornaram dados no probe anon.

## Riscos residuais

- RLS multi-user real ainda precisa de dois usuarios de teste autenticados no ambiente Supabase alvo.
- Edge Functions nao foram typechecked com Deno porque `deno` nao esta instalado nesta maquina.
- Webhook Stripe real precisa ser testado via Stripe CLI/dashboard com evento assinado.
- `subscriptions_admin_view` precisa ter o revoke/RPC aplicado no Supabase para fechar o risco em producao.
- Admin ainda depende de criterio misto de perfil/e-mail hardcoded em `is_app_admin`; ideal migrar para claim/roles controladas por backend.
- LocalStorage segue sendo storage de sessao do Supabase; CSP e ausencia de HTML bruto reduzem risco, mas XSS futuro continuaria critico.

## Possíveis abusos econômicos

- IA: mitigado com auth obrigatoria, rate limit por IP e usuario, limite de payload/transcricao e health reduzido.
- Stripe: mitigado contra price desconhecido e webhook duplicado; ainda precisa validar assinatura real em ambiente Stripe.
- Premium manual admin: continua permitido, mas protegido por RLS/admin. Recomendado auditar mudancas manuais de plano em tabela de eventos.

## Possíveis abusos de IA

- Prompt injection continua possivel semanticamente quando usuario fornece conteudo malicioso, mas a API exige JSON e limita entrada.
- Abuso de custo por base64 gigante foi reduzido.
- Fingerprinting de provider/modelo foi removido do health publico.
- Rate limit em memoria ainda e por instancia; para escala multi-region, migrar para Redis/Upstash/Vercel KV ou Supabase-backed counters.

## Possíveis abusos de autenticação

- Sessao anon/malformada nao deve mais ser migrada como usuario.
- Refresh token legitimo foi preservado: a limpeza nao remove token apenas por estar expirado.
- Erro bruto `missing sub claim` foi tratado no fluxo admin.
- Recomendado adicionar botao/fluxo de "limpar sessao local" em tela de erro persistente.

## Possíveis abusos multi-tenant

- `subscriptions_admin_view` era a maior superficie nova; corrigida por revoke + RPC admin.
- Tabelas com `user_id` seguem dependentes de scripts RLS aplicados no Supabase.
- Probe anon nao retornou dados sensiveis, mas teste autenticado usuario A/B ainda e obrigatorio.

## Possíveis race conditions

- Webhook duplicado agora e ignorado por `event.id`.
- Checkout ainda pode gerar varias sessoes validas se usuario insistir, mas recebeu rate limit server-side.
- Atualizacao admin de concursos ainda e multi-step no cliente; se falhar entre template/subjects/topics, pode exigir limpeza manual. Recomendado RPC transacional futura para salvar/excluir concurso.

## Possíveis inconsistências de estado

- Exclusao de concurso local/fallback pode nao remover itens que ainda existem no catalogo versionado; delete real deve ser usado para templates Supabase. Para esconder templates locais, criar tabela de overrides/disabled slugs.
- Frontend de assinaturas usa fallback direto se RPC nova nao existir; isso preserva UX ate o SQL ser aplicado, mas nao traz e-mail do usuario.
- Probe anon em tabelas sensiveis retornou 200 com 0 linhas; isso e aceitavel do ponto de vista de dados, mas 401/403 seria semanticamente mais claro para endpoints puramente privados.

## Correções aplicadas

- Corrigida validacao/migracao de storage Supabase e mensagem amigavel para `missing sub claim`.
- Adicionados testes `supabaseAuthStorage`, `squadRemote` e mantido `aiSecurity`.
- Reforcada IA com limite por IP + usuario.
- Reforcado Stripe contra price desconhecido e webhook duplicado.
- Criada tabela SQL `stripe_webhook_events`.
- View admin de assinaturas teve acesso direto revogado e RPC admin criada.
- Admin assinaturas passou a usar `loadAllSubscriptions()` via RPC.
- Convite de esquadrao normalizado e limitado no cliente e no SQL.

## Correções recomendadas

- Criar RPC transacional `admin_delete_contest_template` para excluir template, subjects/topics e assets de forma atomica.
- Criar tabela `contest_template_overrides` para ocultar templates locais sem precisar mexer no bundle.
- Migrar rate limit de IA/checkout para storage compartilhado.
- Criar audit log para:
  - mudanca manual de plano,
  - acesso negado admin,
  - webhook invalido,
  - exclusao de concurso,
  - falha repetida de login/cadastro.
- Reduzir CSP futuramente removendo `'unsafe-inline'` com nonce/hash.

## Configurações manuais pendentes

- Aplicar no Supabase:
  - `supabase/security_hardening.sql`
  - `supabase/beta_invites_rpc.sql`
  - `supabase/subscriptions.sql`
  - `supabase/squad_payload.sql`
- Deploy das Edge Functions:
  - `register-free`
  - `create-checkout-session`
  - `stripe-webhook`
- Confirmar secrets:
  - Supabase: `SUPABASE_SERVICE_ROLE_KEY`, peppers de signup, `ALLOWED_ORIGINS`, `APP_URL`, `SITE_URL`
  - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs
  - Vercel: provider keys de IA somente server-side, sem prefixo `VITE_`
- Executar testes com dois usuarios reais:
  - usuario A nao acessa dados do usuario B,
  - usuario comum nao lista admin,
  - admin consegue apagar concurso com sessao valida,
  - convite beta cria/usa corretamente,
  - webhook assinado cria/atualiza assinatura.

## Checklist produção hardened

- [x] Build passa.
- [x] Testes passam.
- [x] Lint sem erros.
- [x] Audit de dependencias sem CVE moderada+.
- [x] Smoke HTTP local passou.
- [x] Health IA nao revela provider/modelo.
- [x] IA sem token retorna 401.
- [x] Beta invites sem token retorna 401.
- [x] Sessao sem `sub` nao e aceita como usuario.
- [x] Convite de esquadrao curto bloqueado.
- [x] Stripe price desconhecido nao libera plano.
- [x] Webhook duplicado tem caminho idempotente.
- [ ] SQL novo aplicado no Supabase.
- [ ] Edge Functions redeployadas.
- [ ] Stripe webhook real testado com assinatura.
- [ ] RLS A/B testado com usuarios reais.
- [ ] Monitoramento/audit log de eventos criticos ativado.
