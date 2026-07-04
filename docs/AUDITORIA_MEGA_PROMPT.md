# Mega Prompt — Auditoria Completa do Papirando

> Use este prompt (inteiro ou por seções) com o Claude para auditar e blindar a plataforma.
> Cada seção pode virar uma rodada de trabalho separada. Ordem recomendada: 1 → 8.

---

## O PROMPT

Você é um auditor sênior de software (segurança + qualidade + performance). Vai auditar a plataforma **Papirando** — app de estudos com IA, feito em **React 19 + Vite + Tailwind + Supabase (Postgres, Auth, Edge Functions) + Vercel**, com pagamentos via **Asaas** (e resquícios de Stripe) e IA via servidor próprio (`ai-server.mjs`, porta 8787) que fala com Gemini/OpenAI/OpenRouter/Groq.

Contexto do código:
- ~50 páginas em `src/pages/` (destaque: `App.jsx` com ~295KB — monolito de rotas/estado; `AdminConcursos.jsx` ~177KB)
- ~83 módulos em `src/lib/` (clients de API, lógica de negócio, FSRS, planos de estudo)
- 7 Edge Functions em `supabase/functions/` (webhooks de pagamento, checkout, registro, trial, e-mails)
- ~72 arquivos SQL em `supabase/` com RLS (Row Level Security) em ~38 deles
- 12 arquivos de teste (Vitest) — cobertura baixa (~7%)
- Sentry integrado; deploy na Vercel; lançamento previsto para 25/05/2026

Para CADA problema encontrado, reporte: **arquivo:linha · gravidade (Crítico/Alto/Médio/Baixo) · o que acontece de errado na prática (cenário concreto) · como corrigir**. Não reporte achismo: confirme lendo o código de verdade. Depois de listar, corrija começando pelos Críticos.

---

### 1. SEGREDOS E CHAVES (Crítico)
- Verifique se alguma chave de API, senha ou token aparece **dentro do código-fonte** (`src/`, `scripts/`, `supabase/functions/`) — não só no `.env`.
- Confirme que `.env`, `.env.local` e variantes estão no `.gitignore` E que nunca foram commitados no histórico do git (`git log --all -- .env`).
- Confirme que nenhuma chave privada (service_role do Supabase, Asaas, OpenAI, Gemini) chega ao navegador — só a `anon key` do Supabase pode ser pública.
- Verifique se o Sentry pode estar gravando dados sensíveis (tokens, CPF, e-mails) em breadcrumbs/erros; configure redação de campos sensíveis.
- Liste chaves que devem ser **rotacionadas** (trocadas) por já terem sido expostas em qualquer lugar.

### 2. BANCO DE DADOS E RLS (Crítico)
RLS é a "fechadura" de cada tabela: garante que um aluno só vê os dados dele.
- Liste TODAS as tabelas criadas nas migrations e confira: cada uma tem `ENABLE ROW LEVEL SECURITY` + policies de SELECT/INSERT/UPDATE/DELETE?
- Procure policies frouxas: `USING (true)` em tabela com dados de usuário, policies que checam só `auth.role() = 'authenticated'` (qualquer logado vê tudo), falta de `WITH CHECK` em INSERT/UPDATE.
- Tabelas de admin (`admin_crm`, `admin_finance`, catálogo de concursos): confirme que usam `is_app_admin`/role no **banco**, não só o gate de e-mail no frontend.
- Tabela `subscriptions`/planos: um usuário consegue se dar plano premium via UPDATE direto na API do Supabase? (Teste mental: o que acontece se alguém chamar `supabase.from('subscriptions').update(...)` do console do navegador?)
- Verifique funções SQL `SECURITY DEFINER`: alguma permite escalar privilégio?

### 3. EDGE FUNCTIONS E PAGAMENTOS (Crítico)
- `asaas-webhook`: valida o token/assinatura do Asaas ANTES de processar? Um atacante consegue forjar um evento "pagamento confirmado" e ganhar premium de graça?
- `create-checkout-session`: valida que o usuário está autenticado? Valida o plano/preço no servidor (ou confia no valor vindo do navegador)?
- `stripe-webhook`: se Stripe foi abandonado, essa função deve ser desativada/removida — código morto de pagamento é risco.
- `register-free` e `start-trial`: dá pra criar contas/trials em massa (bots)? Rate limit funciona de verdade? Idempotência (chamar 2x não duplica nada)?
- Todas: tratam erro sem vazar stack trace/detalhes internos na resposta? Retornam CORS correto (não `*` com credenciais)?

### 4. AUTENTICAÇÃO E CONTROLE DE ACESSO (Alto)
- Rotas protegidas: todas as páginas que exigem login realmente redirecionam deslogados? E as páginas de admin?
- O gate de admin no frontend usa e-mails fixos no código (`App.jsx`) — migrar para role do banco (`profiles.role`/`is_app_admin`) como fonte única.
- Checagem de plano (free/Caderno/Estúdio): os limites do plano são aplicados **no servidor/banco** ou só escondidos na interface? (Esconder botão não é segurança — a API continua aberta.)
- Fluxo de OAuth/reset de senha: tokens vazam em URL, logs ou histórico?

### 5. BUGS FUNCIONAIS (Alto)
Varra `src/pages/` e `src/lib/` procurando:
- Promises sem `catch`/`try-catch` — erro de rede que quebra a tela em branco.
- Estados de loading/vazio/erro faltando (tela infinita de "carregando", crash com dados nulos: `x.y.z` quando `x` é `null`).
- `useEffect` com dependências erradas (loop infinito de requisições ou dado que nunca atualiza).
- Condições de corrida: usuário clica 2x no botão de salvar/pagar e duplica registro.
- Datas e fuso horário (app de cronograma de estudos: revisões marcadas pro dia errado é bug grave). Atenção ao FSRS e ao `topicReviewApi`.
- Formulários: validação de CPF, e-mail, campos obrigatórios; o que acontece com entrada maliciosa ou vazia.
- Uploads (foto de objetivo, PDF de edital): valida tipo/tamanho do arquivo? Onde o arquivo vai parar e quem consegue acessá-lo (bucket público?)?

### 6. SEGURANÇA DO FRONTEND (Médio/Alto)
- XSS: qualquer lugar que renderize conteúdo vindo do usuário ou da IA como HTML (`dangerouslySetInnerHTML`, markdown sem sanitização). Comunidade/comentários são o ponto nº 1.
- Injeção via IA: respostas da IA são exibidas sem tratamento? Prompt injection no upload de edital (PDF com instruções maliciosas)?
- Dependências: rodar `npm audit` e listar vulnerabilidades conhecidas com correção disponível.
- Headers de segurança na Vercel (`vercel.json`): CSP, X-Frame-Options, HSTS, Referrer-Policy — aplicar os que faltam sem quebrar o app.
- localStorage: o que está guardado lá? Tokens/dados sensíveis que scripts de terceiros poderiam ler?

### 7. PERFORMANCE E OTIMIZAÇÃO (Médio)
- `App.jsx` (295KB) e `AdminConcursos.jsx` (177KB): dividir com `React.lazy`/code-splitting por rota — hoje o usuário baixa o app inteiro pra ver a primeira tela.
- Bundle: analisar tamanho final (`vite build` + análise), remover dependências não usadas.
- Queries do Supabase: `select('*')` onde bastariam 3 colunas; N+1 (buscar itens num loop em vez de uma query só); falta de paginação em listas grandes (catálogo com 1.500 concursos).
- Re-renders desnecessários em listas grandes (memo onde importa, não em todo lugar).
- Imagens sem otimização/lazy loading.

### 8. QUALIDADE E PRONTIDÃO PARA LANÇAMENTO (Médio)
- Remover/condicionar os ~149 `console.log` espalhados em 46 arquivos (vazam dados no console do usuário).
- Código morto: Stripe, componentes aposentados, imports não usados.
- Testes: apontar os 5 fluxos mais críticos sem teste (pagamento, registro, limites de plano, revisões FSRS, upload de edital) e escrever testes para eles.
- Mensagens de erro amigáveis em português para o usuário final (não "TypeError: cannot read...").
- Acessibilidade básica: navegação por teclado nos modais, labels em inputs, contraste.

---

### FORMATO DO RELATÓRIO FINAL
1. **Resumo executivo** (10 linhas, linguagem leiga): as 5 coisas mais graves e o que significam na prática.
2. **Tabela de achados**: gravidade · arquivo · problema · impacto real · status (corrigido/pendente).
3. **Correções aplicadas**: lista do que já foi consertado, com os commits.
4. **Plano do que ficou**: o que precisa de decisão do dono (ex.: rotacionar chaves, desativar Stripe) com passo a passo.

### REGRAS
- Ler antes de editar; aspas retas em JSX; tokens `pl-*` para qualquer UI; não inventar problema sem confirmar no código.
- Correções não podem mudar comportamento visível sem avisar.
- Rodar `npm test` e o build após as correções — nada de entregar quebrado.
