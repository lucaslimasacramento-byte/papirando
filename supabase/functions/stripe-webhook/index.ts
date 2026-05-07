// supabase/functions/stripe-webhook/index.ts
// Recebe eventos do Stripe e atualiza a tabela `subscriptions`.
// Deploy: supabase functions deploy stripe-webhook
// Secrets necessários:
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
//   STRIPE_PRICE_TATICO_MONTHLY, STRIPE_PRICE_TATICO_ANNUAL,
//   STRIPE_PRICE_ELITE_MONTHLY, STRIPE_PRICE_ELITE_ANNUAL

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

/** Mapeia price_id → nome do plano interno */
function planNameFromPriceId(priceId: string): string {
  const priceMap: Record<string, string> = {
    [Deno.env.get('STRIPE_PRICE_TATICO_MONTHLY') ?? '__none1']: 'tatico',
    [Deno.env.get('STRIPE_PRICE_TATICO_ANNUAL') ?? '__none2']: 'tatico',
    [Deno.env.get('STRIPE_PRICE_ELITE_MONTHLY') ?? '__none3']: 'elite',
    [Deno.env.get('STRIPE_PRICE_ELITE_ANNUAL') ?? '__none4']: 'elite',
  };
  return priceMap[priceId] ?? 'tatico';
}

function billingCycleFromPriceId(priceId: string): string {
  const annualIds = [
    Deno.env.get('STRIPE_PRICE_TATICO_ANNUAL') ?? '',
    Deno.env.get('STRIPE_PRICE_ELITE_ANNUAL') ?? '',
  ];
  return annualIds.includes(priceId) ? 'annual' : 'monthly';
}

async function upsertSubscription(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) {
    console.warn('[stripe-webhook] subscription sem supabase_user_id:', subscription.id);
    return;
  }

  const item = subscription.items.data[0];
  const priceId = item?.price?.id ?? '';

  await supabaseAdmin.from('subscriptions').upsert(
    {
      user_id: userId,
      provider: 'stripe',
      plan_name: planNameFromPriceId(priceId),
      billing_cycle: billingCycleFromPriceId(priceId),
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' },
  );
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature ?? '',
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '',
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe-webhook] Assinatura invalida:', msg);
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }

  console.log('[stripe-webhook] evento recebido:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await upsertSubscription(sub);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(sub);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await upsertSubscription(sub);
        }
        break;
      }

      default:
        console.log('[stripe-webhook] evento ignorado:', event.type);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe-webhook] erro ao processar:', msg);
    return new Response(`Erro interno: ${msg}`, { status: 500 });
  }

  return new Response('ok', { status: 200 });
});
