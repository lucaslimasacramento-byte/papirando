// supabase/functions/create-checkout-session/index.ts
// Cria uma assinatura no Asaas e retorna a URL de pagamento.
// Deploy: supabase functions deploy create-checkout-session
// Secrets necessários (supabase secrets set KEY=value):
//   ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN, ASAAS_SANDBOX (true/false), APP_URL,
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/http.ts';

// produção exige ASAAS_SANDBOX=false explícito
const isSandbox = Deno.env.get('ASAAS_SANDBOX') !== 'false';
const ASAAS_BASE = isSandbox
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3';

const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY') ?? '';

interface PlanConfig {
  value: number;
  cycle: string;
  description: string;
  trialDays: number;
}

const PLANS: Record<string, PlanConfig> = {
  papiro_monthly: {
    value: 19.90,
    cycle: 'MONTHLY',
    description: 'Papirando Papiro — Mensal',
    trialDays: 30,
  },
  papiro_annual: {
    value: 159.90,
    cycle: 'YEARLY',
    description: 'Papirando Papiro — Anual',
    trialDays: 30,
  },
};

function json(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

async function asaas(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = Array.isArray(data?.errors)
      ? data.errors.map((e: { description: string }) => e.description).join(', ')
      : `Asaas HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

async function findOrCreateCustomer(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  email: string,
  name: string,
  cpfCnpj: string,
): Promise<string> {
  const customerName = name || email.split('@')[0] || 'Aluno Papirando';

  // Verifica se já existe customer salvo
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('asaas_customer_id')
    .eq('user_id', userId)
    .not('asaas_customer_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (sub?.asaas_customer_id) {
    // Garante que o customer tem o CPF (cobranças exigem). Faz update idempotente.
    const id = String(sub.asaas_customer_id);
    await asaas(`/customers/${id}`, 'POST', { name: customerName, email, cpfCnpj });
    return id;
  }

  // Busca por externalReference no Asaas
  const search = await asaas(`/customers?externalReference=${encodeURIComponent(userId)}`);
  if (Array.isArray(search?.data) && search.data.length > 0) {
    const id = String(search.data[0].id);
    // Customer pode ter sido criado antes sem CPF — atualiza antes de cobrar.
    await asaas(`/customers/${id}`, 'POST', { name: customerName, email, cpfCnpj });
    return id;
  }

  // Cria novo customer já com o CPF
  const customer = await asaas('/customers', 'POST', {
    name: customerName,
    email,
    cpfCnpj,
    externalReference: userId,
    notificationDisabled: false,
  });

  return String(customer.id);
}

const rateLimit = new Map<string, { count: number; resetAt: number }>();

function enforceRateLimit(userId: string) {
  const now = Date.now();
  const current = rateLimit.get(userId);
  if (!current || current.resetAt <= now) {
    rateLimit.set(userId, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return;
  }
  current.count += 1;
  if (current.count > 5) throw new Error('RATE_LIMITED');
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

    enforceRateLimit(user.id);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch {
      return json(req, { error: 'Payload invalido' }, 400);
    }

    const planId  = String(body.planId  ?? 'papiro');
    const billing = String(body.billing ?? 'monthly');

    if (planId !== 'papiro') return json(req, { error: 'planId invalido' }, 400);
    if (!['monthly', 'annual'].includes(billing)) return json(req, { error: 'billing invalido' }, 400);

    const plan = PLANS[`${planId}_${billing}`];
    if (!plan) return json(req, { error: 'Plano nao encontrado' }, 400);

    // Assinatura ativa/trialing já existente? NÃO criar outra no Asaas (evita
    // dupla cobrança quando o usuário clica de novo no checkout). Se houver
    // cobrança pendente, reutiliza a URL dela. Este check também elimina o vetor
    // de abuso que o rate-limit em memória não cobre entre cold starts.
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('asaas_subscription_id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .not('asaas_subscription_id', 'is', null)
      .limit(1)
      .maybeSingle();

    if (existingSub?.asaas_subscription_id) {
      try {
        const pendingPayments = await asaas(
          `/payments?subscription=${existingSub.asaas_subscription_id}&status=PENDING&limit=1`,
        );
        const pending = Array.isArray(pendingPayments?.data) ? pendingPayments.data[0] : null;
        if (pending?.invoiceUrl) {
          return json(req, {
            url: pending.invoiceUrl,
            subscriptionId: existingSub.asaas_subscription_id,
            reused: true,
          });
        }
      } catch (lookupErr) {
        console.error('[create-checkout-session] lookup de cobranca pendente falhou:', lookupErr);
      }
      return json(req, { error: 'Voce ja possui uma assinatura ativa. Gerencie-a na aba Assinatura do perfil.' }, 409);
    }

    // Busca nome + CPF do perfil
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('nome, cpf')
      .eq('id', user.id)
      .maybeSingle();

    // Asaas exige CPF/CNPJ do cliente para gerar a cobrança (PIX ou cartão).
    const cpfDigits = String(profile?.cpf || '').replace(/\D/g, '');
    if (cpfDigits.length !== 11 && cpfDigits.length !== 14) {
      return json(req, {
        error: 'Preencha um CPF válido no seu Perfil antes de assinar.',
        code: 'CPF_REQUIRED',
      }, 422);
    }

    const customerId = await findOrCreateCustomer(
      supabaseAdmin,
      user.id,
      user.email ?? '',
      String(profile?.nome || ''),
      cpfDigits,
    );

    // Data da primeira cobrança (após trial de 30 dias)
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + plan.trialDays);
    const nextDueDate = trialEnd.toISOString().split('T')[0]; // YYYY-MM-DD

    // Cria assinatura no Asaas
    const subscription = await asaas('/subscriptions', 'POST', {
      customer: customerId,
      billingType: 'UNDEFINED', // cliente escolhe PIX ou cartão na página de pagamento
      value: plan.value,
      nextDueDate,
      cycle: plan.cycle,
      description: plan.description,
      externalReference: user.id,
    });

    // Registra no banco com status trialing
    await supabaseAdmin.from('subscriptions').upsert(
      {
        user_id: user.id,
        provider: 'asaas',
        plan_name: planId,
        billing_cycle: billing,
        asaas_customer_id: customerId,
        asaas_subscription_id: subscription.id,
        status: 'trialing',
        current_period_start: new Date().toISOString(),
        current_period_end: nextDueDate + 'T23:59:59.000Z',
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    // Busca a primeira cobrança para pegar a URL de pagamento
    const payments = await asaas(`/payments?subscription=${subscription.id}&limit=1`);
    const firstPayment = Array.isArray(payments?.data) ? payments.data[0] : null;
    const paymentUrl = firstPayment?.invoiceUrl ?? null;

    const appUrl = Deno.env.get('APP_URL') ?? 'https://papirando.app';

    return json(req, {
      url: paymentUrl ?? `${appUrl}/?checkout=success&plan=${planId}`,
      subscriptionId: subscription.id,
      trialEnd: nextDueDate,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'RATE_LIMITED') {
      return json(req, { error: 'Muitas tentativas. Aguarde alguns minutos.' }, 429);
    }
    console.error('[create-checkout-session]', message);
    return json(req, { error: 'Nao foi possivel iniciar o checkout.' }, 500);
  }
});
