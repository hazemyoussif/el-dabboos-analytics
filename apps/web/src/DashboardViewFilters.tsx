import { dashboardFilterDimensions } from '@el-dabboos/application';
import type { DashboardFilterOverrides } from '@el-dabboos/application';
import type { DashboardSpec, DateRange, Locale, SemanticMetric, TenantProfile } from '@el-dabboos/domain';
import { DimensionFilterControl } from './DimensionFilterControl.tsx';
import type { FilterOptions } from './DimensionFilterControl.tsx';
import { DatePeriodControl, periodCopy, periodLabels } from './DatePeriodControl.tsx';
import { copy } from './i18n.ts';
export function DashboardViewFilters({ dashboard, selection, effectiveRange, catalog, profile, locale, options, active, busy, onChange, onReset }: {
  dashboard: DashboardSpec; selection: DashboardSpec['filters']; effectiveRange?: DateRange; catalog: Record<string, SemanticMetric>; profile: TenantProfile; locale: Locale; options: FilterOptions; active: boolean; busy: boolean;
  onChange: (change: DashboardFilterOverrides) => void; onReset: () => void;
}) {
  const t = periodCopy[locale];
  return <details className="view-filters"><summary>{t.filters} · {selection.datePreset ? periodLabels[locale][selection.datePreset] : selection.dateRange ? `${selection.dateRange.from} — ${selection.dateRange.to}` : t.all}{active ? ` · ${t.temporary}` : ''}</summary>
    <div className="view-filter-controls"><DatePeriodControl filters={selection} effectiveRange={effectiveRange} timeZone={profile.timeZone} locale={locale} disabled={busy} onChange={date => onChange({ date })} />
      {dashboardFilterDimensions(dashboard, catalog).map(dimension => {
        const selected = selection.dimensions?.find(filter => filter.dimension === dimension)?.values ?? [];
        return <DimensionFilterControl key={dimension} dimension={dimension} values={selected} options={options[dimension] ?? []} locale={locale} disabled={busy} onChange={values => {
          const dimensions = (selection.dimensions ?? []).filter(filter => filter.dimension !== dimension);
          if (values.length) dimensions.push({ dimension, values });
          onChange({ dimensions });
        }} />;
      })}
      <button type="button" disabled={!active || busy} onClick={onReset}>{t.reset}</button>
    </div>
    {busy && <p role="status">{copy[locale].loading}</p>}
  </details>;
}
