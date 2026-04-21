import {
  REDACAO_KIT_VISAO_FINAL,
  REDACAO_KIT_CONECTIVOS,
  REDACAO_KIT_FRASES_PRONTAS,
  REDACAO_KIT_MODELOS,
} from '../data/redacaoDicasKit';

export function getDefaultRedacaoKitBundle() {
  return {
    visaoFinal: REDACAO_KIT_VISAO_FINAL,
    conectivos: REDACAO_KIT_CONECTIVOS,
    frasesProntas: REDACAO_KIT_FRASES_PRONTAS,
    modelos: REDACAO_KIT_MODELOS,
  };
}

function pickVisao(override) {
  const o = override?.visaoFinal;
  if (!o || typeof o !== 'object') return REDACAO_KIT_VISAO_FINAL;
  return {
    titulo: typeof o.titulo === 'string' && o.titulo.trim() ? o.titulo.trim() : REDACAO_KIT_VISAO_FINAL.titulo,
    subtitulo:
      typeof o.subtitulo === 'string' && o.subtitulo.trim() ? o.subtitulo.trim() : REDACAO_KIT_VISAO_FINAL.subtitulo,
    checklist: Array.isArray(o.checklist) && o.checklist.length ? o.checklist.map(String) : REDACAO_KIT_VISAO_FINAL.checklist,
  };
}

function pickBlocos(overrideList, fallback) {
  if (!Array.isArray(overrideList) || overrideList.length === 0) return fallback;
  const out = overrideList
    .map((b) => {
      if (!b || typeof b !== 'object') return null;
      const id = String(b.id || '').trim();
      const titulo = String(b.titulo || '').trim();
      const emoji = String(b.emoji || '📌');
      const itens = Array.isArray(b.itens) ? b.itens.map((x) => String(x || '').trim()).filter(Boolean) : [];
      if (!id || !titulo || itens.length === 0) return null;
      return { id, titulo, emoji, itens };
    })
    .filter(Boolean);
  return out.length ? out : fallback;
}

function pickModelos(overrideList) {
  if (!Array.isArray(overrideList) || overrideList.length === 0) return REDACAO_KIT_MODELOS;
  const out = overrideList
    .map((m) => {
      if (!m || typeof m !== 'object') return null;
      const id = String(m.id || '').trim();
      const titulo = String(m.titulo || '').trim();
      const badge = String(m.badge || '').trim();
      const corpo = String(m.corpo || '').trim();
      if (!id || !titulo || !corpo) return null;
      return { id, titulo, badge: badge || undefined, corpo };
    })
    .filter(Boolean);
  return out.length ? out : REDACAO_KIT_MODELOS;
}

/** Mescla JSON salvo no Supabase com o kit embutido no app. */
export function mergeRedacaoKitBundle(kitOverride) {
  const base = getDefaultRedacaoKitBundle();
  if (!kitOverride || typeof kitOverride !== 'object') return base;
  return {
    visaoFinal: pickVisao(kitOverride),
    conectivos: pickBlocos(kitOverride.conectivos, base.conectivos),
    frasesProntas: pickBlocos(kitOverride.frasesProntas, base.frasesProntas),
    modelos: pickModelos(kitOverride.modelos),
  };
}

/** Monta o objeto gravado em `kit_json` a partir do kit mesclado (override + padrão). */
export function sanitizeRedacaoKitForSave(d) {
  if (!d || typeof d !== 'object') return null;
  const visaoFinal = {
    titulo: String(d.visaoFinal?.titulo || '').trim(),
    subtitulo: String(d.visaoFinal?.subtitulo || '').trim(),
    checklist: Array.isArray(d.visaoFinal?.checklist)
      ? d.visaoFinal.checklist.map((x) => String(x).trim()).filter(Boolean)
      : [],
  };
  const normBlocos = (arr) =>
    (Array.isArray(arr) ? arr : [])
      .map((b) => {
        if (!b || typeof b !== 'object') return null;
        const id = String(b.id || '').trim();
        const titulo = String(b.titulo || '').trim();
        const emoji = String(b.emoji || '📌').trim() || '📌';
        const itens = Array.isArray(b.itens) ? b.itens.map((x) => String(x).trim()).filter(Boolean) : [];
        if (!id || !titulo || !itens.length) return null;
        return { id, titulo, emoji, itens };
      })
      .filter(Boolean);
  const modelos = (Array.isArray(d.modelos) ? d.modelos : [])
    .map((m) => {
      if (!m || typeof m !== 'object') return null;
      const id = String(m.id || '').trim();
      const titulo = String(m.titulo || '').trim();
      const corpo = String(m.corpo || '').trim();
      const badge = String(m.badge || '').trim();
      if (!id || !titulo || !corpo) return null;
      const out = { id, titulo, corpo };
      if (badge) out.badge = badge;
      return out;
    })
    .filter(Boolean);
  return {
    visaoFinal,
    conectivos: normBlocos(d.conectivos),
    frasesProntas: normBlocos(d.frasesProntas),
    modelos,
  };
}
