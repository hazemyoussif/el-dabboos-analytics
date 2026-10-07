import type { Locale } from '@el-dabboos/domain';
import { compactCategoryLabel } from './category-label.ts';
interface CategoryTickProps {
  x?: number; y?: number; payload?: { value?: string | number };
  fill: string; locale: Locale; horizontal?: boolean;
}
/** SVG text stays on one line; keyboard focus exposes the complete category label. */
export function CategoryAxisTick({ x: positionX = 0, y: positionY = 0, payload, fill, locale, horizontal = false }: CategoryTickProps) {
  const label = String(payload?.value ?? '');
  return <g transform={`translate(${positionX},${positionY})`} tabIndex={0} role="img" aria-label={label}>
    <title>{label}</title><text fill={fill} fontSize={11} textAnchor={horizontal ? locale === 'ar' ? 'start' : 'end' : 'middle'} dy={horizontal ? '0.35em' : '1em'} direction={locale === 'ar' ? 'rtl' : 'ltr'} style={{ unicodeBidi: 'plaintext' }}>{compactCategoryLabel(label, horizontal ? 14 : 10)}</text>
  </g>;
}
