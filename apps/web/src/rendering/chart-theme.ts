import type { GovernedPalette } from '@el-dabboos/domain';
import type { ResolvedTheme } from '../presentation/preferences.ts';
/** Presentation only. Only governed palette names enter specs; resolved colors remain here. */
export interface ChartTheme {
  mode: ResolvedTheme; categorical: readonly string[]; sequential: readonly string[];
  positive: string; negative: string; warning: string; neutral: string;
  grid: string; axis: string; tooltip: string; border: string; text: string; highlight: string; onMark: string;
}
const lightCore = {
  teal: '#087f72', blue: '#355fa8', purple: '#8056a6', amber: '#9a641b',
  rose: '#b14568', cyan: '#2f7890', olive: '#657a2d', brick: '#9a4c3c', slate: '#656876',
};
const darkCore: typeof lightCore = {
  teal: '#50c7b5', blue: '#7ca4e8', purple: '#bd98dc', amber: '#ddb263',
  rose: '#e58ca4', cyan: '#72bfd2', olive: '#b2c779', brick: '#d89a82', slate: '#b6bbc3',
};
const paletteOrder: Record<GovernedPalette, readonly (keyof typeof lightCore)[]> = {
  default: ['teal', 'blue', 'purple', 'amber', 'rose', 'cyan', 'olive', 'brick'],
  blue: ['blue', 'teal', 'amber', 'purple', 'rose', 'olive', 'brick', 'cyan'],
  green: ['olive', 'teal', 'blue', 'amber', 'purple', 'rose', 'cyan', 'brick'],
  orange: ['amber', 'brick', 'teal', 'blue', 'purple', 'rose', 'cyan', 'olive'],
  purple: ['purple', 'teal', 'amber', 'blue', 'rose', 'olive', 'cyan', 'brick'],
  red: ['rose', 'brick', 'teal', 'blue', 'amber', 'purple', 'cyan', 'olive'],
  neutral: ['slate', 'blue', 'teal', 'amber', 'purple', 'rose', 'olive', 'brick'],
};
function categoricalPalettes(core: typeof lightCore): Record<GovernedPalette, readonly string[]> {
  const resolve = (palette: GovernedPalette) => paletteOrder[palette].map(color => core[color]);
  return { default: resolve('default'), blue: resolve('blue'), green: resolve('green'), orange: resolve('orange'), purple: resolve('purple'), red: resolve('red'), neutral: resolve('neutral') };
}
const palettes = { light: categoricalPalettes(lightCore), dark: categoricalPalettes(darkCore) };
const themes: Record<ResolvedTheme, ChartTheme> = {
  light: { mode: 'light', categorical: palettes.light.default, sequential: ['#d9eee9','#aed9cf','#76bfb0','#3e9f8e','#157f72','#065c54'], positive:'#2e7d32',negative:'#b4233d',warning:'#9a6200',neutral:'#63758b',grid:'#e3e9ee',axis:'#63758b',tooltip:'#ffffff',border:'#ccd7e1',text:'#1d2d42',highlight:'#e8f3f1',onMark:'#ffffff' },
  dark: { mode: 'dark', categorical: palettes.dark.default, sequential: ['#24433f','#2d5a51','#347266','#3d917e','#49b49b','#63d1b7'], positive:'#78c982',negative:'#ef8b99',warning:'#e2b35e',neutral:'#a0b0c4',grid:'#314156',axis:'#a0b0c4',tooltip:'#202e40',border:'#455770',text:'#e7edf5',highlight:'#263d48',onMark:'#132434' },
};
export function withGovernedPalette(theme: ChartTheme, palette?: GovernedPalette): ChartTheme {
  if (!palette || palette === 'default') return theme;
  return { ...theme, categorical: palettes[theme.mode][palette] };
}
export function chartTheme(theme: ResolvedTheme): ChartTheme { return themes[theme]; }
export function seriesColor(theme: ChartTheme, index: number): string { return theme.categorical[Math.abs(index) % theme.categorical.length]!; }
export const chartMargins = { top: 12, right: 16, bottom: 4, left: 4 };
export function showChartLegend(seriesCount: number, preference?: 'auto' | 'show' | 'hide', composition = false, comparison = false): boolean {
  return preference === 'hide' ? false : preference === 'show' || composition || comparison || seriesCount > 1;
}
