/** Presentation only: never use compact labels as category keys or tooltip data. */
export function compactCategoryLabel(value: string, limit = 14): string {
  const graphemes = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value), part => part.segment);
  return graphemes.length <= limit ? value : `${graphemes.slice(0, limit - 1).join('')}…`;
}
