// supabase/functions/create-checkout-session/index.ts
// Cria uma Stripe Checkout Session para o usuário logado.
// Deploy: supabase functions deploy create-checkout-session
// Secrets necessários (supabase secrets set KEY=value):
//   STRIPE_SECRET_KEY, STRIPE_PRICE_TATICO_MONTHLY, STRIPE_PRICE_TATICO_ANNUAL,
//   STRIPE_PRICE_ELITE_MONTHLY, STRIPE_PRICE_ELITE_ANNUAL, APP_URL

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/http.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

const checkoutRateLimit = new Map<string, { count: number; resetAt: number }>();

function json(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

function clientKey(req: Request, userId = ''): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || 'unknown';
  return `${userId || 'anon'}:${ip}`;
}

function enforceCheckoutRateLimit(req: Request, userId = '') {
  const now = Date.now();
  const key = clientKey(req, userId);
  const current = checkoutRateLimit.get(key);
  if (!current || current.resetAt <= now) {
    checkoutRateLimit.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return;
  }
  current.count += 1;
  if (current.count > 10) {
    throw new Error('RATE_LIMITED');
  }
}

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
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  try {
    if (req.method !== 'POST') {
      return json(req, { error: 'Metodo nao permitido' }, 405);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json(req, { error: 'Nao autorizado' }, 401);
    }

    // Valida JWT do usuário via Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return json(req, { error: 'Nao autorizado' }, 401);
    }

    enforceCheckoutRateLimit(req, user.id);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json(req, { error: 'Payload invalido' }, 400);
    }
    const planId = String(body.planId ?? 'tatico');  // tatico | elite
    const billing = String(body.billing ?? 'monthly'); // monthly | annual

    if (!['tatico', 'elite'].includes(planId)) {
      return json(req, { error: 'planId invalido' }, 400);
    }

    if (!['monthly', 'annual'].includes(billing)) {
      return json(req, { error: 'billing invalido' }, 400);
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

    return json(req, { url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'RATE_LIMITED') {
      console.warn('[create-checkout-session] rate limit');
      return json(req, { error: 'Muitas tentativas. Aguarde alguns minutos.' }, 429);
    }
    console.error('[create-checkout-session] erro interno');
    return json(req, { error: 'Nao foi possivel iniciar o checkout.' }, 500);
  }
});
