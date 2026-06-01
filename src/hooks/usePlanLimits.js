import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  COUNTED_LIMITS,
  FEATURE_ACCESS,
  getPeriod,
} from '../lib/planLimits';

/**
 * usePlanLimits — hook central de limites de plano
 *
 * @param {string|null} userId
 * @param {boolean} isPremium — true durante trial ativo ou plano Papiro pago
 *
 * @returns {{
 *   canUse: (feature: string) => boolean,
 *   getUsed: (feature: string) => number,
 *   getLimit: (feature: string) => number,
 *   increment: (feature: string) => Promise<number>,
 *   isLoading: boolean,
 * }}
 */
export function usePlanLimits(userId, isPremium) {
  // { 'feature:period': count }
  const [counts, setCounts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const loadedRef = useRef(false);

  // Carrega contagens atuais do banco (apenas para usuários free)
  useEffect(() => {
    if (!userId || isPremium || loadedRef.current) return;
    loadedRef.current = true;

    const features = Object.keys(COUNTED_LIMITS);
    const periods  = features.map((f) => getPeriod(COUNTED_LIMITS[f].period));

    setIsLoading(true);
    supabase
      .rpc('get_usage', { p_features: features, p_periods: periods })
      .then(({ data }) => {
        if (!Array.isArray(data)) return;
        const map = {};
        data.forEach(({ feature, period, count }) => {
          map[`${feature}:${period}`] = count;
        });
        setCounts(map);
      })
      .catch((err) => console.warn('[usePlanLimits] load usage error', err))
      .finally(() => setIsLoading(false));
  }, [userId, isPremium]);

  /** Verifica se o usuário pode usar a feature agora */
  const canUse = useCallback(
    (feature) => {
      // Premium: tudo liberado
      if (isPremium) return true;

      // Feature completamente bloqueada no Folha
      if (feature in FEATURE_ACCESS) {
        return FEATURE_ACCESS[feature].folha !== false;
      }

      // Feature com limite contável
      const cfg = COUNTED_LIMITS[feature];
      if (!cfg) return true; // sem limite configurado = liberado

      const period = getPeriod(cfg.period);
      const key    = `${feature}:${period}`;
      const used   = counts[key] ?? 0;
      return used < cfg.folha;
    },
    [isPremium, counts],
  );

  /** Retorna quantas vezes a feature foi usada no período atual */
  const getUsed = useCallback(
    (feature) => {
      const cfg = COUNTED_LIMITS[feature];
      if (!cfg) return 0;
      const period = getPeriod(cfg.period);
      return counts[`${feature}:${period}`] ?? 0;
    },
    [counts],
  );

  /** Retorna o limite da feature para o plano atual */
  const getLimit = useCallback(
    (feature) => {
      if (isPremium) return Infinity;
      return COUNTED_LIMITS[feature]?.folha ?? Infinity;
    },
    [isPremium],
  );

  /**
   * Incrementa o contador no banco e atualiza estado local.
   * Chamar ANTES de executar a ação (a ação só acontece se canUse retornar true).
   * @returns {Promise<number>} novo valor do contador
   */
  const increment = useCallback(
    async (feature) => {
      if (isPremium) return 0; // premium não conta

      const cfg = COUNTED_LIMITS[feature];
      if (!cfg) return 0;

      const period = getPeriod(cfg.period);

      const { data, error } = await supabase.rpc('increment_usage', {
        p_feature: feature,
        p_period:  period,
      });

      if (error) {
        console.warn('[usePlanLimits] increment error', error);
        return 0;
      }

      const newCount = Number(data ?? 0);
      setCounts((prev) => ({ ...prev, [`${feature}:${period}`]: newCount }));
      return newCount;
    },
    [isPremium],
  );

  return { canUse, getUsed, getLimit, increment, isLoading };
}
