import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de plano
// ─────────────────────────────────────────────────────────────────────────────
/** @returns {'gratuito'|'tatico'|'elite'} */
export function normalizePlanName(raw) {
  const v = String(raw || '').toLowerCase().trim();
  if (v === 'elite') return 'elite';
  if (v === 'tatico') return 'tatico';
  return 'gratuito';
}

export function isPremiumStatus(status) {
  return ['active', 'trialing'].includes(String(status || ''));
}

function isMissingAdminSubscriptionsRpc(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code === 'PGRST202' || code === '42883' || message.includes('admin_list_subscriptions');
}

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────

/** Busca a assinatura ativa do usuário logado */
export async function loadMySubscription() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}

/**
 * Inicia o checkout Stripe.
 * @param {{ planId: 'tatico'|'elite', billing: 'monthly'|'annual' }} options
 * @returns {Promise<string>} URL do Stripe Checkout
 */
export async function startStripeCheckout({ planId, billing }) {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { planId, billing },
  });

  if (error) throw new Error(error.message || 'Erro ao criar sessao de pagamento.');
  if (!data?.url) throw new Error('URL de checkout nao retornada.');
  return data.url;
}

/**
 * Admin: carrega todas as assinaturas (requer is_app_admin = true via RLS)
 */
export async function loadAllSubscriptions() {
  const { data, error } = await supabase.rpc('admin_list_subscriptions');

  if (!error) return data ?? [];
  if (!isMissingAdminSubscriptionsRpc(error)) throw new Error(error.message);

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (fallbackError) throw new Error(fallbackError.message);
  return fallbackData ?? [];
}

/**
 * Admin: atualiza manualmente o plano de um usuário (uso no beta)
 */
export async function adminSetPlan(subscriptionId, planName) {
  const { error } = await supabase
    .from('subscriptions')
    .update({ plan_name: normalizePlanName(planName), updated_at: new Date().toISOString() })
    .eq('id', subscriptionId);

  if (error) throw new Error(error.message);
}

/**
 * Admin: cria assinatura manual para um usuário (beta sem Stripe)
 * @param {{ userId: string, planName: string, billing: string }} opts
 */
export async function adminCreateManualSubscription({ userId, planName, billing = 'monthly' }) {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1); // 1 ano de beta

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      provider: 'manual',
      plan_name: normalizePlanName(planName),
      billing_cycle: billing,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook React
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook que retorna o estado de assinatura do usuário logado.
 *
 * @param {string|null} userId  – auth.uid() do usuário
 * @returns {{
 *   subscription: object|null,
 *   planName: 'gratuito'|'tatico'|'elite',
 *   isPremium: boolean,
 *   loading: boolean,
 *   refresh: () => void,
 * }}
 */
export function useSubscription(userId) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setSubscription(data ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId, tick]);

  const planName = normalizePlanName(subscription?.plan_name);
  const isPremium =
    !!subscription &&
    isPremiumStatus(subscription.status) &&
    (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());

  return {
    subscription,
    planName,
    isPremium,
    loading,
    refresh: () => setTick((t) => t + 1),
  };
}
