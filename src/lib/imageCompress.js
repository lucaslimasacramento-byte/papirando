// Compressao de imagem no navegador, antes do upload.
//
// As logos de concurso eram enviadas em tamanho cheio (algumas com ~900KB) e
// exibidas em miniaturas. Esta funcao redimensiona o lado maior para `maxSize`
// e re-encoda em WebP (preserva transparencia e comprime muito melhor que PNG),
// resultando em arquivos ~50-100x menores no Storage.
//
// Robusta por design: SVG/GIF nao sao rasterizados, e qualquer falha (ou um
// resultado que nao reduza o tamanho) faz a funcao devolver o arquivo original
// sem alteracao — o upload nunca quebra por causa da compressao.

/**
 * @param {File} file
 * @param {{ maxSize?: number, quality?: number }} [opts]
 *   maxSize  Lado maximo em px (default 512 — cobre as maiores miniaturas em 2x)
 *   quality  Qualidade WebP 0..1 (default 0.85)
 * @returns {Promise<File>}
 */
export async function compressImage(file, { maxSize = 512, quality = 0.85 } = {}) {
  try {
    if (!file || !String(file.type || '').startsWith('image/')) return file;
    // Vetoriais e GIFs (possivelmente animados) nao devem ser rasterizados.
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;

    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxSize / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close?.(); return file; }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (!blob || blob.size >= file.size) return file; // nunca piora

    const baseName = String(file.name || 'imagem').replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
  } catch {
    return file; // qualquer erro: usa o original
  }
}
