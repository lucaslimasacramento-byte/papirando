// supabase/functions/asaas-webhook/index.ts
// Recebe eventos do Asaas e atualiza a tabela `subscriptions`.
// Deploy: supabase functions deploy asaas-webhook
// Secrets necessários:
//   ASAAS_WEBHOOK_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// No painel do Asaas: Configurações → Notificações → Webhook
// URL: https://<project>.supabase.co/functions/v1/asaas-webhook
// Eventos a ativar: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE,
//                   SUBSCRIPTION_INACTIVATED, SUBSCRIPTION_DELETED

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? '';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

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

    // Verifica token de segurança do webhook
    if (WEBHOOK_TOKEN && body.accessToken !== WEBHOOK_TOKEN) {
      console.warn('[asaas-webhook] token invalido');
      return new Response('Forbidden', { status: 403 });
    }

    const event      = String(body.event      ?? '');
    const payment    = body.payment    as Record<string, unknown> | undefined;
    const subscription = body.subscription as Record<string, unknown> | undefined;

    console.log('[asaas-webhook] evento:', event);

    switch (event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED': {
        // Pagamento confirmado → assinatura ativa
        const userId = String(payment?.externalReference ?? '');
        const subId  = String(payment?.subscription ?? '');
        const dueDate = payment?.dueDate ? new Date(String(payment.dueDate)) : new Date();

        // Detecta ciclo pela assinatura salva
        const { data: sub } = await supabaseAdmin
          .from('subscriptions')
          .select('billing_cycle')
          .eq('asaas_subscription_id', subId)
          .maybeSingle();

        const isAnnual = sub?.billing_cycle === 'annual';
        const periodEnd = isAnnual ? addYear(dueDate) : addMonths(dueDate, 1);

        await updateSubscription(userId || null, subId || null, {
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
