export const SUBJECT_PALETTE = [
  '#c9a98a',
  '#b8c9a4',
  '#dab8b8',
  '#e5d089',
  '#bbb5d4',
  '#a8b5c4',
  '#d4a08a',
  '#a9b094',
  '#c4a4b5',
  '#e8c4a8',
  '#bdb098',
  '#a4c4c0',
];

export function getSubjectColor(canonicalName) {
  const s = String(canonicalName || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return SUBJECT_PALETTE[Math.abs(h) % SUBJECT_PALETTE.length];
}
