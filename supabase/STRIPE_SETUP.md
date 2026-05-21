# Stripe — Guia de Setup (Papirando)

## 1. Criar conta Stripe
- Acesse https://stripe.com e crie uma conta
- Ative o modo live quando estiver pronto para produção (durante beta, use Test Mode)

## 2. Criar produtos e preços no Stripe Dashboard
Vá em Products → Add Product:

| Produto | Intervalo | Preço | Seu ID interno |
|---------|-----------|-------|----------------|
| Papirando Tatico | Mensal | R$49,90 | `STRIPE_PRICE_TATICO_MONTHLY` |
| Papirando Tatico | Anual | R$29,90/mês (cobrança anual) | `STRIPE_PRICE_TATICO_ANNUAL` |
| Papirando Elite | Mensal | R$89,90 | `STRIPE_PRICE_ELITE_MONTHLY` |
| Papirando Elite | Anual | R$59,90/mês (cobrança anual) | `STRIPE_PRICE_ELITE_ANNUAL` |

Copie os `price_...` IDs gerados.

## 3. Configurar secrets no Supabase
No terminal (com Supabase CLI instalado e projeto linkado):

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_TATICO_MONTHLY=price_...
supabase secrets set STRIPE_PRICE_TATICO_ANNUAL=price_...
supabase secrets set STRIPE_PRICE_ELITE_MONTHLY=price_...
supabase secrets set STRIPE_PRICE_ELITE_ANNUAL=price_...
supabase secrets set APP_URL=https://papirando.com.br
```

Ou pelo Dashboard: Supabase → Edge Functions → Secrets.

## 4. Deploy das Edge Functions
```bash
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

## 5. Configurar Webhook no Stripe
- Stripe Dashboard → Developers → Webhooks → Add endpoint
- URL: `https://[SEU_PROJECT_REF].supabase.co/functions/v1/stripe-webhook`
- Eventos para escutar:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- Copie o **Signing Secret** (whsec_...) e configure como `STRIPE_WEBHOOK_SECRET`

## 6. Rodar o SQL no Supabase
- Abra o SQL Editor no Supabase Dashboard
- Cole e execute o conteúdo de `supabase/subscriptions.sql`

## 7. Testar (Test Mode)
Use os cartões de teste do Stripe:
- Sucesso: `4242 4242 4242 4242` | qualquer data futura | qualquer CVV
- Recusado: `4000 0000 0000 0002`
- Teste PIX: disponível no checkout em modo test

## 8. Variáveis no .env (frontend — não são necessárias, a chave fica só no Supabase)
O frontend não precisa de VITE_STRIPE_* pois toda comunicação passa pela Edge Function.
Apenas configure:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Fluxo completo resumido
1. Usuário clica "Assinar Tatico/Elite" na página de Assinatura
2. Frontend chama `supabase.functions.invoke('create-checkout-session', { body: { planId, billing } })`
3. Edge Function valida JWT, cria Stripe Checkout Session, retorna URL
4. Frontend faz `window.location.href = url` → usuário vai para o Stripe
5. Usuário paga → Stripe dispara webhook
6. Edge Function `stripe-webhook` valida assinatura e faz upsert na tabela `subscriptions`
7. Ao voltar para o app, `useSubscription()` lê a tabela e libera os recursos premium
