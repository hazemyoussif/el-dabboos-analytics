import { useEffect, useState } from 'react';
import { semanticCatalog, tenantProfiles } from '@el-dabboos/domain';
import type { DashboardWidget, GovernedPalette, Locale, WidgetType } from '@el-dabboos/domain';
import type { WidgetExecution } from '@el-dabboos/application';
import { WidgetCard } from '../Renderer.tsx';
import { DashboardAppearance } from '../builder/DashboardAppearance.tsx';
import { useTheme } from '../presentation/ThemeProvider.tsx';
import type { ThemePreference } from '../presentation/preferences.ts';
import './visualization-lab.css';

const cases: { type: WidgetType; count: number; donut?: boolean }[] = [
  { type: 'line', count: 1 }, { type: 'line', count: 4 }, { type: 'line', count: 8 },
  { type: 'area', count: 4 }, { type: 'bar', count: 4 }, { type: 'pie', count: 1 },
  { type: 'pie', count: 1, donut: true }, { type: 'treemap', count: 1 }, { type: 'combo', count: 4 },
];
/** Development-only synthetic renderer matrix; no API or persistence dependencies. */
export default function VisualizationLab() {
  const { preference, setPreference } = useTheme();
  const [locale, setLocale] = useState<Locale>('en'); const [palette, setPalette] = useState<GovernedPalette>('default');
  useEffect(() => { document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'; document.documentElement.lang = locale; }, [locale]);
  return <main className="visualization-lab">
    <h1>Visualization lab</h1><p>Internal synthetic data · Production chart renderers · No API or persistence</p>
    <div className="lab-controls"><label>Theme<select value={preference} onChange={event => setPreference(event.target.value as ThemePreference)}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
      <label>Language<select value={locale} onChange={event => setLocale(event.target.value as Locale)}><option value="en">English</option><option value="ar">العربية</option></select></label></div>
    <DashboardAppearance locale={locale} palette={palette} onChange={setPalette} />
    <div className="lab-charts">{cases.map(({ type, count, donut }, index) => {
      const widget: DashboardWidget = { id: `lab-${index}`, type, title: { en: `${donut ? 'Donut' : type} · ${count} series · 8 categories`, ar: `${donut ? 'Donut' : type} · ${count} سلسلة · ٨ فئات` },
        dimension: ['line', 'area', 'combo'].includes(type) ? 'month' : 'customer',
        series: Array.from({ length: count }, (_, i) => ({ id: `s${i}`, metric: i % 2 ? 'gross_profit' : 'revenue' })),
        presentation: { ...(donut ? { pieVariant: 'donut' as const } : {}), ...(type === 'bar' ? { orientation: 'vertical' as const } : {}), ...(['pie','treemap'].includes(type) ? { dataLabels: 'show' as const } : {}) },
      };
      const entry: WidgetExecution = { status: 'success', seriesResults: {}, alignedRows: Array.from({ length: 8 }, (_, row) => ({
        key: widget.dimension === 'month' ? `2026-0${row + 1}` : `customer_${row + 1}`,
        series: Object.fromEntries(widget.series.map((series, i) => [series.id, { value: 100 + i * 60 + row * 20 + Math.sin(row + i) * 35,
          ...(i === 0 && ['line','area','combo'].includes(type) ? { comparisonValue: 80 + row * 20 } : {}) }])),
      })) };
      return <div className="lab-chart" key={widget.id}><WidgetCard widget={widget} dashboardPalette={palette} entry={entry} catalog={semanticCatalog} locale={locale} profile={tenantProfiles['demo-iq']} /></div>;
    })}</div>
  </main>;
}
