// Helpers de URL de imagem.
//
// As logos de concurso/curso ficam no Supabase Storage (bucket publico) em
// tamanho cheio — algumas com ~900KB — mas sao exibidas em miniaturas (28-56px).
// O Supabase oferece transformacao de imagem on-the-fly via o endpoint
// `render/image`, que entrega versoes redimensionadas e bem mais leves
// (ex: 884KB -> ~9KB). Use `storageThumb` ao renderizar qualquer logo.

// Cada transformacao `render/image` num tamanho novo e um cache separado no CDN
// e a 1a requisicao de cada variante e "fria" (~1.5s). O app pedia 5 tamanhos
// diferentes (64/80/120/160/256) para a MESMA logo -> 5 transforms frias por
// logo e nenhum reuso entre telas. Travamos numa escada fixa de 2 degraus para
// que so existam 2 variantes por logo (icone 128, hero 256), compartilhadas por
// todas as telas. Mantem nitidez 2x ate ~64px (128) e ~128px (256).
const THUMB_LADDER = [128, 256];

function snapThumbSize(size) {
  const px = Number(size) || THUMB_LADDER[0];
  for (const step of THUMB_LADDER) {
    if (px <= step) return step;
  }
  return THUMB_LADDER[THUMB_LADDER.length - 1];
}

/**
 * Converte uma URL publica do Supabase Storage para a versao redimensionada.
 * Se a URL nao for do storage publico (ex: vazia, externa, data URI), retorna
 * a propria URL sem alteracao. O `size` pedido e arredondado para a escada fixa
 * (128 ou 256) para maximizar o reuso de cache do CDN entre telas.
 *
 * @param {string} url   URL original (…/storage/v1/object/public/…)
 * @param {number} size  Lado maximo desejado em px (sera ajustado para 128 ou 256)
 * @returns {string}
 */
export function storageThumb(url, size = 64) {
  if (!url || typeof url !== 'string') return url || '';
  const marker = '/storage/v1/object/public/';
  if (!url.includes(marker)) return url;
  const snapped = snapThumbSize(size);
  const rendered = url.replace(marker, '/storage/v1/render/image/public/');
  const sep = rendered.includes('?') ? '&' : '?';
  return `${rendered}${sep}width=${snapped}&height=${snapped}&resize=contain&quality=80`;
}
