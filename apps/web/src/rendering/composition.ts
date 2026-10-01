import type { ChartRow } from './shared.ts';
export function compositionData(data: readonly ChartRow[], key: string) {
  if (data.some(row => typeof row[key] === 'number' && Number(row[key]) < 0)) return { status: 'negative' as const, rows: [], total: 0 };
  const rows = data.filter(row => typeof row[key] === 'number' && Number(row[key]) > 0).map(row => ({ name: String(row.label), value: Number(row[key]), sourceIndex: typeof row._row === 'number' ? row._row : data.indexOf(row) }));
  return { status: rows.length ? 'ok' as const : 'empty' as const, rows, total: rows.reduce((sum, row) => sum + row.value, 0) };
}
export const compositionWarning = { en: 'This visualization requires positive composition values. Use Bar or Table for negative or zero-only data.', ar: 'يتطلب هذا العرض قيم مساهمة موجبة. استخدم الأشرطة أو الجدول للقيم السالبة أو البيانات الصفرية.' };
export const cardinalityWarning = { en: 'Many categories: consider explicit Top N, Bar, or Table. All categories are retained.', ar: 'الفئات كثيرة: يمكنك استخدام أعلى عدد أو الأشرطة أو الجدول. جميع الفئات محفوظة.' };
