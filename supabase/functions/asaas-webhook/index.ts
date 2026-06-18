// supabase/functions/asaas-webhook/index.ts
// Recebe eventos do Asaas e atualiza a tabela `subscriptions`.
// Deploy: supabase functions deploy asaas-webhook
// Secrets necessários (OBRIGATÓRIOS):
//   ASAAS_WEBHOOK_TOKEN, ASAAS_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   (ASAAS_SANDBOX opcional: 'false' em produção)
//
// No painel do Asaas: Configurações → Notificações → Webhook
// URL: https://<project>.supabase.co/functions/v1/asaas-webhook
// Eventos a ativar: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE,
//                   SUBSCRIPTION_INACTIVATED, SUBSCRIPTION_DELETED

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? '';
const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY') ?? '';
// produção exige ASAAS_SANDBOX=false explícito
const ASAAS_SANDBOX = Deno.env.get('ASAAS_SANDBOX') !== 'false';
const ASAAS_BASE = ASAAS_SANDBOX
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Comparação em tempo constante (evita timing attack no token).
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i += 1) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

// Consulta a Asaas (fonte de verdade) — nunca confiar nos valores do corpo do webhook.
async function asaasGet(path: string): Promise<Record<string, unknown> | null> {
  if (!ASAAS_KEY) return null;
  try {
    const res = await fetch(`${ASAAS_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', access_token: ASAAS_KEY },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function updateSubscription(
  userId: string | null,
  subscriptionId: string | null,
  fields: Record<string, unknown>,
) {
  if (!userId && !subscriptionId) return;

  const query = supabaseAdmin
    .from('subscriptions')
    .update({ ...fields, updated_at: new Date().toISOString() });

  if (subscriptionId) {
    await query.eq('asaas_subscription_id', subscriptionId);
  } else if (userId) {
    await query.eq('user_id', userId);
  }
}

function addMonths(date: Date, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

function addYear(date: Date): string {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

serve(async (req) => {
  try {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch {
      return new Response('Payload invalido', { status: 400 });
    }

    // Token de segurança OBRIGATÓRIO — fail-closed. Se a secret não estiver
    // configurada, o webhook recusa tudo (em vez de processar requisições forjadas).
    if (!WEBHOOK_TOKEN) {
      console.error('[asaas-webhook] ASAAS_WEBHOOK_TOKEN nao configurado — recusando.');
      return new Response('Webhook nao configurado', { status: 503 });
    }
    // Asaas envia o token no header `asaas-access-token`; aceitamos também o
    // corpo (body.accessToken) por robustez entre versões do painel.
    const sentToken = String(
      req.headers.get('asaas-access-token') ?? body.accessToken ?? ''
    );
    if (!safeEqual(sentToken, WEBHOOK_TOKEN)) {
      console.warn('[asaas-webhook] token invalido');
      return new Response('Forbidden', { status: 403 });
    }

    const event      = String(body.event      ?? '').toUpperCase().trim();
    const payment    = body.payment    as Record<string, unknown> | undefined;
    const subscription = body.subscription as Record<string, unknown> | undefined;

    console.log('[asaas-webhook] evento:', event);

    switch (event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED': {
        // Concessão de acesso pago: NÃO confiar no corpo do webhook. Verifica o
        // pagamento direto na Asaas e deriva o usuário da linha salva (casada pela
        // assinatura), nunca de payment.externalReference do corpo.
        const paymentId = String(payment?.id ?? '');
        const verified = paymentId ? await asaasGet(`/payments/${paymentId}`) : null;
        if (!verified) {
          console.warn('[asaas-webhook] pagamento nao verificavel na Asaas:', paymentId);
          return new Response('Pagamento nao verificado', { status: 400 });
        }
        const status = String(verified.status ?? '').toUpperCase();
        if (!['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(status)) {
          console.warn('[asaas-webhook] status de pagamento inesperado:', status);
          return new Response('Pagamento nao confirmado', { status: 400 });
        }

        const subId = String(verified.subscription ?? payment?.subscription ?? '');
        const dueDate = verified.dueDate ? new Date(String(verified.dueDate)) : new Date();

        // Fonte de verdade do usuário e do ciclo: a linha já gravada no checkout.
        const { data: sub } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id, billing_cycle')
          .eq('asaas_subscription_id', subId)
          .maybeSingle();

        if (!sub?.user_id) {
          // Assinatura nao registrada no nosso banco (ex: cobranca antiga/externa,
          // anterior a correcao das colunas asaas_*). Responde 200 (ack/no-op) para
          // o Asaas parar de re-tentar e nao penalizar o webhook.
          console.warn('[asaas-webhook] assinatura desconhecida (ack/no-op):', subId);
          return new Response('ok (assinatura desconhecida)', { status: 200 });
        }

        const isAnnual = sub.billing_cycle === 'annual';
        const periodEnd = isAnnual ? addYear(dueDate) : addMonths(dueDate, 1);

        await updateSubscription(null, subId, {
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd,
        });
        break;
      }

      case 'PAYMENT_OVERDUE': {
        const userId = String(payment?.externalReference ?? '');
        const subId  = String(payment?.subscription ?? '');
        await updateSubscription(userId || null, subId || null, { status: 'past_due' });
        break;
      }

      case 'PAYMENT_DELETED':
      case 'SUBSCRIPTION_INACTIVATED':
      case 'SUBSCRIPTION_DELETED': {
        const userId = String(
          payment?.externalReference ?? subscription?.externalReference ?? ''
        );
        const subId = String(
          payment?.subscription ?? subscription?.id ?? ''
        );
        await updateSubscription(userId || null, subId || null, {
          status: 'canceled',
          cancel_at_period_end: true,
        });
        break;
      }

      default:
        console.log('[asaas-webhook] evento ignorado:', event);
    }

    return new Response('ok', { status: 200 });

  } catch (err) {
    console.error('[asaas-webhook] erro:', err instanceof Error ? err.message : err);
    return new Response('Erro interno', { status: 500 });
  }
});
