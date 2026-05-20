/**
 * Cores das disciplinas — paleta procedural alinhada ao Brandbook Papirando.
 *
 * Antes desta lib, Ciclos.jsx e Planejamento.jsx tinham arrays de ~50 cores
 * pastel default (#FFD1DC, #BAFFC9, etc.) duplicados literalmente em ambos.
 * As cores eram cyan/rosa/lavanda fora da paleta warm paper do brandbook.
 *
 * Agora a paleta é centralizada aqui:
 *   - 28 tons pastel gerados em hue-zones warm (peach, areia, oliva, royal-
 *     blue do accent, lavanda morna, rosa quente)
 *   - Saturation 38-50%, lightness 80-88% — soft paper-friendly
 *   - Hash do nome da disciplina escolhe a cor deterministicamente
 *
 * API pública:
 *   - disciplineColorFor(name)         → #hex deterministic para um nome
 *   - disciplineColorByIndex(index)    → #hex por índice (legacy compat)
 *   - hashDisciplineName(name)         → uint32 hash (legacy compat)
 *   - CYCLE_PASTEL_COLORS              → array completo (legacy compat)
 *   - PASTEL_SUBJECT_COLORS            → alias do mesmo array (legacy compat)
 */

// ── Paleta curada — 28 pastéis warm-aligned ──────────────────────────────
// Gerados a partir de 11 "anchor hues" do brandbook + variações suaves de
// lightness/saturation. Cada cor cabe sobre paper #f3efe5 sem destoar.
const PALETTE = [
  // Quentes (peach / areia / dourado)
  '#f7d6c6', '#f6c4ad', '#f4dcb4', '#f0e6b3',
  // Oliva / verde-musgo soft (success-aligned)
  '#dcecb3', '#c5e2b6', '#b8d8c3', '#cdd9bb',
  // Royal-blue do accent (atenuado para pastel)
  '#bbcae8', '#c6cff0', '#d4dbf3',
  // Lavanda morna (warm violet)
  '#dccbe6', '#d2cee0', '#e0d4e8',
  // Rosa quente / coral suave
  '#f0c8d5', '#f5cfcf', '#e8c8d3', '#f3e1d6',
  // Areia clara (paper-friendly)
  '#eccfb2', '#e8d4c5', '#ead8b5', '#fce3c4',
  // Verde-folha mais frio mas ainda warm
  '#c4d8c7', '#bccebb', '#d6e0c6',
  // Cinza-bege (neutros warm)
  '#dcd6cc', '#e6dfd2', '#d2cdc1',
];

// ── Hash determinístico de string para uint32 ────────────────────────────
// djb2-like, rápido e estável entre execuções/sessões.
export function hashDisciplineName(name) {
  const s = String(name == null ? '' : name);
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

// ── API principal ────────────────────────────────────────────────────────
/** Retorna a cor pastel deterministic para um nome de disciplina. */
export function disciplineColorFor(name) {
  return PALETTE[hashDisciplineName(name) % PALETTE.length];
}

/** Retorna a cor pastel pelo índice (cíclico). Útil quando há iteração sem nome. */
export function disciplineColorByIndex(index) {
  const safeIndex = Math.max(0, Number(index) || 0);
  return PALETTE[safeIndex % PALETTE.length];
}

// ── Re-exports legacy ────────────────────────────────────────────────────
// Mantém compatibilidade com código existente que importa o array inteiro.
// Não duplicar a lista — sempre apontar para PALETTE.
export const CYCLE_PASTEL_COLORS = PALETTE.slice();
export const PASTEL_SUBJECT_COLORS = PALETTE.slice();
