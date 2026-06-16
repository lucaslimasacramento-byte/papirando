// Helpers de URL de imagem.
//
// As logos de concurso/curso ficam no Supabase Storage (bucket publico) em
// tamanho cheio — algumas com ~900KB — mas sao exibidas em miniaturas (28-56px).
// O Supabase oferece transformacao de imagem on-the-fly via o endpoint
// `render/image`, que entrega versoes redimensionadas e bem mais leves
// (ex: 884KB -> ~9KB). Use `storageThumb` ao renderizar qualquer logo.

/**
 * Converte uma URL publica do Supabase Storage para a versao redimensionada.
 * Se a URL nao for do storage publico (ex: vazia, externa, data URI), retorna
 * a propria URL sem alteracao.
 *
 * @param {string} url   URL original (…/storage/v1/object/public/…)
 * @param {number} size  Lado maximo em px (default 64 — bom para miniaturas 2x)
 * @returns {string}
 */
export function storageThumb(url, size = 64) {
  if (!url || typeof url !== 'string') return url || '';
  const marker = '/storage/v1/object/public/';
  if (!url.includes(marker)) return url;
  const rendered = url.replace(marker, '/storage/v1/render/image/public/');
  const sep = rendered.includes('?') ? '&' : '?';
  return `${rendered}${sep}width=${size}&height=${size}&resize=contain&quality=80`;
}
