import type { ResolvedTheme } from '../presentation/preferences.ts';
/** Presentation only. These controlled palettes never enter a dashboard spec. */
export interface ChartTheme {
  categorical: readonly string[]; sequential: readonly string[];
  positive: string; negative: string; warning: string; neutral: string;
  grid: string; axis: string; tooltip: string; border: string; text: string; highlight: string; onMark: string;
}
const themes: Record<ResolvedTheme, ChartTheme> = {
  light: { categorical: ['#087f72','#3d68b5','#9262b0','#98641f','#b94c70','#3b7099','#6e7c38','#795e4a'], sequential: ['#c4e8df','#7bc6b3','#3aa28d','#087f72'], positive:'#087f72',negative:'#b94c70',warning:'#9e681e',neutral:'#63758b',grid:'#e3e9ee',axis:'#63758b',tooltip:'#ffffff',border:'#ccd7e1',text:'#1d2d42',highlight:'#e8f3f1',onMark:'#ffffff' },
  dark: { categorical: ['#48c9b0','#79a3ed','#bc96de','#e3b366','#ed8ea9','#83c1e0','#b5c579','#c1a188'], sequential: ['#1f4b48','#2a796d','#36a88f','#48c9b0'], positive:'#48c9b0',negative:'#ed8ea9',warning:'#e3b366',neutral:'#a0b0c4',grid:'#314156',axis:'#a0b0c4',tooltip:'#202e40',border:'#455770',text:'#e7edf5',highlight:'#263d48',onMark:'#132434' },
};
export function chartTheme(theme: ResolvedTheme): ChartTheme { return themes[theme]; }
export function seriesColor(theme: ChartTheme, index: number): string { return theme.categorical[Math.abs(index) % theme.categorical.length]!; }
export const chartMargins = { top: 12, right: 16, bottom: 4, left: 4 };
export function showChartLegend(seriesCount: number, preference?: 'auto' | 'show' | 'hide', composition = false, comparison = false): boolean {
  return preference === 'hide' ? false : preference === 'show' || composition || comparison || seriesCount > 1;
}
