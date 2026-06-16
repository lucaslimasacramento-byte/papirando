// supabase/functions/start-trial/index.ts
// Concede o periodo gratuito de 30 dias (plano Papiro) ao usuario logado.
// Idempotente: se o usuario ja tem uma assinatura (trial, ativa ou paga), nao faz nada.
// NAO altera profiles.subscription_plan de proposito — o acesso premium fica
// amarrado a linha em `subscriptions` (status trialing + current_period_end), que
// expira sozinha no dia 30 e devolve o usuario para o plano Folha.
// Deploy: supabase functions deploy start-trial
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/http.ts';

const TRIAL_DAYS = 30;

function json(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  try {
    if (req.method !== 'POST') return json(req, { error: 'Metodo nao permitido' }, 405);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json(req, { error: 'Nao autorizado' }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json(req, { error: 'Nao autorizado' }, 401);

    // Ja possui assinatura? Nao concede outro trial (evita renovar trial e nao
    // sobrescreve uma assinatura paga/expirada existente).
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      return json(req, { granted: false, reason: 'already_exists', status: existing.status });
    }

    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + TRIAL_DAYS);

    const { error: insertError } = await supabaseAdmin.from('subscriptions').upsert(
      {
        user_id: user.id,
        provider: 'trial',
        plan_name: 'papiro',
        billing_cycle: 'trial',
        status: 'trialing',
        current_period_start: start.toISOString(),
        current_period_end: end.toISOString(),
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );

    if (insertError) {
      console.error('[start-trial] falha ao conceder trial:', insertError.message);
      return json(req, { error: 'Nao foi possivel ativar o periodo gratuito.' }, 500);
    }

    return json(req, { granted: true, trialEnd: end.toISOString() });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[start-trial]', message);
    return json(req, { error: 'Erro interno.' }, 500);
  }
});
