// supabase/functions/create-checkout-session/index.ts
// Cria uma Stripe Checkout Session para o usuário logado.
// Deploy: supabase functions deploy create-checkout-session
// Secrets necessários (supabase secrets set KEY=value):
//   STRIPE_SECRET_KEY, STRIPE_PRICE_TATICO_MONTHLY, STRIPE_PRICE_TATICO_ANNUAL,
//   STRIPE_PRICE_ELITE_MONTHLY, STRIPE_PRICE_ELITE_ANNUAL, APP_URL

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/http.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

/** Mapeia planId + billing para o price ID do Stripe */
function resolvePriceId(planId: string, billing: string): string {
  const map: Record<string, string | undefined> = {
    tatico_monthly: Deno.env.get('STRIPE_PRICE_TATICO_MONTHLY'),
    tatico_annual: Deno.env.get('STRIPE_PRICE_TATICO_ANNUAL'),
    elite_monthly: Deno.env.get('STRIPE_PRICE_ELITE_MONTHLY'),
    elite_annual: Deno.env.get('STRIPE_PRICE_ELITE_ANNUAL'),
  };
  const key = `${planId}_${billing === 'annual' ? 'annual' : 'monthly'}`;
  const priceId = map[key];
  if (!priceId) throw new Error(`Price ID nao configurado para: ${key}`);
  return priceId;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Nao autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Valida JWT do usuário via Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Nao autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const planId: string = body.planId ?? 'tatico';  // tatico | elite
    const billing: string = body.billing ?? 'monthly'; // monthly | annual

    if (!['tatico', 'elite'].includes(planId)) {
      return new Response(JSON.stringify({ error: 'planId invalido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const priceId = resolvePriceId(planId, billing);
    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173';

    // Verifica se já existe um customer Stripe para este usuário
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .not('stripe_customer_id', 'is', null)
      .limit(1)
      .maybeSingle();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: existingSub?.stripe_customer_id ?? undefined,
      customer_email: existingSub?.stripe_customer_id ? undefined : user.email ?? '',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/?checkout=success&plan=${planId}`,
      cancel_url: `${appUrl}/?checkout=cancel`,
      allow_promotion_codes: true,
      metadata: { supabase_user_id: user.id },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_name: planId,
          billing_cycle: billing,
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
