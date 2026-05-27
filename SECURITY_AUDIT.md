# Auditoria de Segurança

Data: 2026-05-08

Escopo revisado: React/Vite, Vercel API routes, Supabase Auth/Postgres/RLS/Edge Functions, Stripe, uploads/storage, IA e configuracao de deploy.

## Resumo Executivo

O projeto ja tinha boas bases de producao: RLS em varias tabelas, Supabase Auth, webhooks Stripe com assinatura, headers de hardening na Vercel e API de IA no backend. Os principais riscos encontrados estavam em bordas praticas: uma variavel publica que poderia virar token estatico de IA no bundle, CORS permissivo nas Edge Functions, fluxo de convites beta ainda inconsistente no middleware local, validacoes fracas em uploads/IA/checkout e risco de mass assignment em `profiles`.

As correcoes aplicadas reduzem os riscos de vazamento de segredo, abuso de custo de IA, bypass de RLS em desenvolvimento, upload indevido e alteracao indevida de campos de plano/role. Algumas protecoes dependem de aplicar SQL no Supabase e redeploy das Edge Functions para valerem em producao.

## Severidade

- Critico: nenhum achado critico confirmado em arquivos versionados.
- Alto: exposicao potencial de token estatico publico, CORS permissivo em Edge Functions, convites beta inconsistentes com RLS, mass assignment em perfil, checkout sem rate limit server-side.
- Medio: validacao fraca de upload/IA, health de IA informativo demais, mensagens de erro excessivas em APIs, hardening parcial de logs e storage.
- Baixo: documentacao/env incompleta, avisos de lint preexistentes, residuos operacionais.
- Informativo: `npm audit` sem vulnerabilidades conhecidas no momento da auditoria.

## Achados

### 1. Token estatico de IA documentado como variavel publica

- Severidade: Alto
- Arquivo/linha aproximada: `src/lib/aiRuntime.js:3`, `.env.example:10`, `README.md:36`, `docs/vercel-deploy-runbook.md:28`
- Impacto: qualquer variavel `VITE_` entra no bundle do navegador. Um token estatico ali poderia ser reutilizado por qualquer usuario que inspecionasse o frontend.
- Como poderia ser explorado em cenario autorizado: durante um teste, capturar o bundle/DevTools, localizar o token publico e chamar o backend de IA fora da aplicacao.
- Correcao aplicada: removido o uso de `VITE_AI_SERVER_TOKEN`; o frontend agora envia o JWT da sessao Supabase. Documentacao e `.env.example` foram ajustados.
- Status: corrigido no codigo.

### 2. CORS permissivo nas Supabase Edge Functions

- Severidade: Alto
- Arquivo/linha aproximada: `supabase/functions/_shared/http.ts:35`, `supabase/functions/register-free/index.ts:167`
- Impacto: `Access-Control-Allow-Origin: *` ampliava a superficie de abuso browser-side, especialmente em endpoints sensiveis como cadastro e checkout.
- Como poderia ser explorado em cenario autorizado: uma pagina de origem externa faria chamadas cross-origin e observaria respostas aceitas pelo navegador.
- Correcao aplicada: CORS agora usa allowlist (`ALLOWED_ORIGINS`, `APP_URL`, `SITE_URL`, `VITE_PUBLIC_APP_ORIGIN` e localhost de dev). `register-free` passou a responder JSON com o CORS calculado pela origem da requisicao.
- Status: corrigido no codigo; requer deploy das Edge Functions.

### 3. Convites beta inconsistentes com RLS e erro de insert

- Severidade: Alto
- Arquivo/linha aproximada: `api/beta-invites.js:127`, `vite.config.js:116`, `supabase/beta_invites_rpc.sql:37`
- Impacto: o middleware de dev ainda acessava `beta_invites` diretamente, o que reproduzia o erro `new row violates row-level security policy` e podia esconder divergencias entre dev/producao.
- Como poderia ser explorado em cenario autorizado: chamar GET/POST/DELETE local sem passar pelas RPCs administrativas e observar erro detalhado de RLS ou comportamento diferente do deploy.
- Correcao aplicada: API de producao e middleware local usam RPCs admin; GET exige JWT; POST valida e-mail; erros externos foram padronizados; RPC limita retorno e valida e-mail/tamanho dos campos no banco.
- Status: corrigido no codigo; requer aplicar `supabase/beta_invites_rpc.sql`.

### 4. Mass assignment em atualizacao de perfil

- Severidade: Alto
- Arquivo/linha aproximada: `src/lib/profileApi.js:6`, `supabase/security_hardening.sql:108`
- Impacto: patches vindos do cliente poderiam incluir campos sensiveis como `role`, `subscription_plan`, `subscription_status` ou limites de plano.
- Como poderia ser explorado em cenario autorizado: alterar o payload de update no navegador/PostgREST para tentar promover a propria conta ou mudar status premium.
- Correcao aplicada: `updateProfile` agora tem allowlist de campos editaveis pelo usuario. Foi adicionado trigger defensivo no banco para bloquear alteracao de campos privilegiados por usuarios comuns.
- Status: corrigido no codigo; trigger requer aplicar `supabase/security_hardening.sql`.

### 5. Checkout Stripe com validacao/rate limit insuficientes

- Severidade: Alto
- Arquivo/linha aproximada: `supabase/functions/create-checkout-session/index.ts:31`
- Impacto: sem rate limit server-side e validacao estrita de `billing`, um usuario autenticado poderia abusar do endpoint e gerar sessoes em excesso.
- Como poderia ser explorado em cenario autorizado: enviar varias requisicoes POST autenticadas com payloads variados e medir custo/erro do Stripe.
- Correcao aplicada: metodo POST obrigatorio, parsing seguro de JSON, validacao de `planId`/`billing`, rate limit por usuario/IP e respostas genericas em erro interno.
- Status: corrigido no codigo; requer deploy da Edge Function.

### 6. Webhook Stripe com erro excessivamente informativo

- Severidade: Medio
- Arquivo/linha aproximada: `supabase/functions/stripe-webhook/index.ts:79`
- Impacto: mensagens de assinatura/interno poderiam revelar detalhes operacionais. O webhook ja validava assinatura e usa upsert/idempotencia por `stripe_subscription_id`.
- Como poderia ser explorado em cenario autorizado: enviar webhook invalido para observar respostas e logs detalhados.
- Correcao aplicada: respostas de assinatura invalida e erro interno foram genericadas; logs mantem evento/id sem stack ou segredo.
- Status: corrigido no codigo; requer deploy e conferencia do `STRIPE_WEBHOOK_SECRET`.

### 7. Health de IA expunha provider/modelo e transcricao aceitava entrada ampla

- Severidade: Medio
- Arquivo/linha aproximada: `api/ai.js:31`, `api/_ai.js:101`, `api/_ai.js:563`
- Impacto: o health publico revelava fornecedor/modelo. A rota de transcricao podia receber formatos/tamanhos inadequados, aumentando risco de abuso de custo.
- Como poderia ser explorado em cenario autorizado: consultar `/api/ai/health` para fingerprinting e enviar imagem/base64 grande ou tipo nao suportado.
- Correcao aplicada: criado `getPublicHealth()` sem provider/modelo; limite especifico `AI_TRANSCRIBE_RATE_LIMIT_MAX`; data URL e MIME permitidos somente `png/jpeg/webp`; tamanho de base64 limitado.
- Status: corrigido no codigo.

### 8. Uploads sem validacao forte de tipo/tamanho/extensao

- Severidade: Medio
- Arquivo/linha aproximada: `src/App.jsx:4334`, `src/lib/profileApi.js:80`, `src/pages/Materiais.jsx:800`, `src/lib/vadeMecumApi.js:293`
- Impacto: confiar apenas no `contentType` ou nao limitar tamanho facilita abuso de storage, upload de arquivo inesperado e DoS por arquivos grandes.
- Como poderia ser explorado em cenario autorizado: tentar subir arquivo com extensao/tipo divergente ou tamanho excessivo.
- Correcao aplicada: avatar limitado a `jpg/png/webp` e 2 MB; imagens de concurso a `jpg/png/webp` e 3 MB; PDFs de materiais a 25 MB; PDF do Vade Mecum a 50 MB; extensao e MIME verificados.
- Status: corrigido no codigo; conferir policies/buckets no Supabase.

### 9. Respostas de API com detalhes internos do Supabase

- Severidade: Medio
- Arquivo/linha aproximada: `api/beta-invites.js:185`, `vite.config.js:166`, `supabase/functions/create-checkout-session/index.ts:148`
- Impacto: detalhes como `hint`, `details`, `code` e snippets de resposta podem ajudar fingerprinting e vazar estrutura interna.
- Como poderia ser explorado em cenario autorizado: enviar payload invalido e comparar mensagens para inferir schema/policies.
- Correcao aplicada: respostas externas agora sao genericas para erro 5xx; logs mantem apenas status/codigo quando util.
- Status: corrigido no codigo.

### 10. Separacao incompleta de variaveis publicas/privadas

- Severidade: Medio
- Arquivo/linha aproximada: `.env.example:1`, `docs/vercel-deploy-runbook.md:21`
- Impacto: ausencia de um mapa claro aumenta chance de publicar service role, Stripe ou chave de IA como variavel `VITE_`.
- Como poderia ser explorado em cenario autorizado: revisar bundle de producao e procurar valores sensiveis acidentalmente prefixados como `VITE_`.
- Correcao aplicada: `.env.example` agora separa frontend publico, Vercel server-only e Supabase Edge Function secrets; runbook alerta para nao usar segredo com prefixo `VITE_`.
- Status: corrigido no codigo/documentacao.

### 11. RLS sensivel depende de scripts ainda nao aplicados

- Severidade: Medio
- Arquivo/linha aproximada: `supabase/security_hardening.sql:8`, `supabase/beta_invites_rpc.sql:96`
- Impacto: as protecoes SQL no repositorio nao protegem producao ate serem executadas no projeto Supabase correto.
- Como poderia ser explorado em cenario autorizado: com dois usuarios de teste, tentar acessar/alterar `subjects`, `topics`, `weekly_availability`, `calendar_reminders`, `beta_feedback` ou `profiles` de outro usuario.
- Correcao aplicada: scripts atualizados com policies e trigger de campos privilegiados.
- Status: requer configuracao externa/aplicacao no Supabase.

### 12. Logs client-side e localStorage ainda exigem disciplina de XSS

- Severidade: Baixo
- Arquivo/linha aproximada: `src/lib/supabase.js:100`, varios `console.warn/error` em `src/`
- Impacto: Supabase persiste sessao no localStorage por padrao. Nao foi encontrado `dangerouslySetInnerHTML`, mas XSS futuro teria impacto alto sobre tokens.
- Como poderia ser explorado em cenario autorizado: inserir payload malicioso em campos renderizados no futuro e observar se consegue ler storage.
- Correcao aplicada: nenhum `dangerouslySetInnerHTML` encontrado; headers CSP ja existem em `vercel.json`; logs mais sensiveis de APIs corrigidos.
- Status: parcialmente corrigido; manter CSP forte, evitar HTML bruto e revisar logs client-side por PII.

### 13. Dependencias e supply chain

- Severidade: Informativo
- Arquivo/linha aproximada: `package.json`, `package-lock.json`
- Impacto: dependencias vulneraveis poderiam comprometer build/runtime.
- Como poderia ser explorado em cenario autorizado: explorar CVE conhecida em pacote usado pelo app.
- Correcao aplicada: `npm audit --audit-level=moderate` executado e retornou 0 vulnerabilidades.
- Status: sem acao no momento.

## Correções Aplicadas

- Removido suporte a token estatico publico `VITE_AI_SERVER_TOKEN`; IA usa JWT da sessao Supabase.
- `.env.example`, README e runbook atualizados para separar variaveis publicas e server-only.
- CORS das Edge Functions trocado de wildcard para allowlist dinamica.
- `register-free` passou a responder sempre com CORS calculado pela origem da requisicao.
- `create-checkout-session` ganhou metodo POST obrigatorio, validacao de payload, rate limit e erros genericos.
- `stripe-webhook` manteve assinatura oficial e passou a responder/logar erros de forma menos informativa.
- API de IA removeu provider/modelo do health publico, adicionou limite especifico de transcricao e validacao de imagem/base64.
- API e middleware local de convites beta passaram a usar RPC admin, exigir JWT e mascarar erros internos.
- RPCs de convites beta passaram a validar e-mail, limitar campos e limitar listagem.
- `updateProfile` agora filtra campos editaveis pelo usuario; SQL adiciona trigger para proteger campos privilegiados.
- Uploads de avatar, imagens/PDFs de concurso, materiais e Vade Mecum agora validam MIME, extensao e tamanho.
- Criado `src/lib/aiSecurity.test.js` com testes de health publico, rate limit de transcricao e validacao de imagem.

## Itens que exigem ação manual

- Aplicar no Supabase SQL Editor ou via CLI:
  - `supabase/beta_invites_rpc.sql`
  - `supabase/security_hardening.sql`
- Deploy das Edge Functions alteradas:
  - `register-free`
  - `create-checkout-session`
  - `stripe-webhook`
- Configurar/confirmar secrets no Supabase:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_TATICO_MONTHLY`
  - `STRIPE_PRICE_TATICO_ANNUAL`
  - `STRIPE_PRICE_ELITE_MONTHLY`
  - `STRIPE_PRICE_ELITE_ANNUAL`
  - `APP_URL`, `SITE_URL`, `ALLOWED_ORIGINS`
  - `SIGNUP_IP_PEPPER`, `SIGNUP_EMAIL_LOG_PEPPER`
- Configurar/confirmar variaveis server-only na Vercel:
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`
  - `OPENROUTER_API_KEY`/`GROQ_API_KEY`/`GOOGLE_API_KEY`/`OPENAI_API_KEY`
  - `AI_REQUIRE_AUTH=true`, `AI_RATE_LIMIT_ENABLED=true`
- Conferir no Stripe se o endpoint de webhook usa o signing secret correto e envia somente eventos esperados.
- Executar testes manuais de RLS com dois usuarios reais de teste no Supabase.
- Deno nao esta instalado nesta maquina, entao as Edge Functions nao foram typechecked localmente com `deno check`.

## Verificações Executadas

- `npm run lint`: passou com 8 warnings preexistentes, 0 erros.
- `npm test`: passou, 8 arquivos e 55 testes.
- `npm run build`: passou.
- `npm audit --audit-level=moderate`: 0 vulnerabilidades.
- `git diff --check`: sem erro de whitespace; apenas avisos de normalizacao LF/CRLF no Windows.
- Varredura de segredos em arquivos versionados: sem valores reais de chaves/tokens encontrados; existem `.env` e `.env.local` locais ignorados pelo Git.

## Checklist final

- [x] Segredos reais nao foram expostos no relatorio.
- [x] `.env.example` revisado sem valores reais.
- [x] Variaveis publicas e privadas documentadas separadamente.
- [x] APIs de IA exigem auth por padrao e possuem rate limit.
- [x] Health publico de IA nao revela provider/modelo.
- [x] Convites beta usam RPC admin e validacao de entrada.
- [x] Checkout valida metodo/payload e limita abuso.
- [x] Webhook Stripe valida assinatura e responde erro generico.
- [x] Uploads principais validam tipo, extensao e tamanho.
- [x] Headers web de hardening existem em `vercel.json`.
- [x] Dependencias auditadas sem CVEs moderadas ou maiores.
- [ ] Aplicar SQL de RLS/RPC no Supabase.
- [ ] Deploy das Edge Functions corrigidas.
- [ ] Validar policies com usuario A/usuario B.
- [ ] Confirmar secrets no painel Vercel/Supabase/Stripe.
- [ ] Adicionar monitoramento de eventos criticos com Sentry sem PII.
