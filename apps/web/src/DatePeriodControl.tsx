import { useEffect, useState } from 'react';
import { relativeDatePresets, validDateRange } from '@el-dabboos/domain';
import type { DashboardSpec, DateRange, Locale, RelativeDatePreset } from '@el-dabboos/domain';
import { resolveRelativeDatePreset } from '@el-dabboos/application';
import type { DashboardDateSelection } from '@el-dabboos/application';

export const periodLabels: Record<Locale, Record<RelativeDatePreset, string>> = {
  en: { today: 'Today', yesterday: 'Yesterday', current_month: 'This month', previous_month: 'Previous month', last_30_days: 'Last 30 days', last_90_days: 'Last 90 days', current_quarter: 'This quarter', previous_quarter: 'Previous quarter', current_year: 'This year', previous_year: 'Previous year', last_6_months: 'Last 6 months', last_12_months: 'Last 12 months' },
  ar: { today: 'اليوم', yesterday: 'أمس', current_month: 'هذا الشهر', previous_month: 'الشهر السابق', last_30_days: 'آخر ٣٠ يومًا', last_90_days: 'آخر ٩٠ يومًا', current_quarter: 'هذا الربع', previous_quarter: 'الربع السابق', current_year: 'هذه السنة', previous_year: 'السنة السابقة', last_6_months: 'آخر ٦ أشهر', last_12_months: 'آخر ١٢ شهرًا' },
};
export const periodCopy = {
  en: { period: 'Date period', relative: 'Relative period', fixed: 'Fixed dates', all: 'All time', preset: 'Period', from: 'From', to: 'To', apply: 'Apply dates', filters: 'View filters', temporary: 'Temporary filters', reset: 'Reset to saved defaults', saved: 'Dashboard defaults' },
  ar: { period: 'الفترة الزمنية', relative: 'فترة نسبية', fixed: 'تواريخ ثابتة', all: 'كل الفترات', preset: 'الفترة', from: 'من', to: 'إلى', apply: 'تطبيق التواريخ', filters: 'مرشحات العرض', temporary: 'مرشحات مؤقتة', reset: 'إعادة الضبط إلى القيم المحفوظة', saved: 'إعدادات اللوحة الافتراضية' },
};
export function DatePeriodControl({ filters, effectiveRange, timeZone, locale, disabled, onChange }: {
  filters: DashboardSpec['filters']; effectiveRange?: DateRange; timeZone: string; locale: Locale; disabled?: boolean;
  onChange: (selection: DashboardDateSelection | null) => void;
}) {
  const t = periodCopy[locale];
  const mode = filters.datePreset ? 'relative' : filters.dateRange ? 'absolute' : 'all';
  const [range, setRange] = useState<DateRange>(filters.dateRange ?? { from: '', to: '' });
  useEffect(() => { setRange(filters.dateRange ?? { from: '', to: '' }); }, [filters.dateRange?.from, filters.dateRange?.to]);
  return <fieldset className="date-period" disabled={disabled}><legend className="sr-only">{t.period}</legend>
    <label>{t.period}<select value={mode} onChange={event => {
      if (event.target.value === 'all') onChange(null);
      else if (event.target.value === 'relative') onChange({ mode: 'relative', preset: 'current_year' });
      else {
        const next = filters.dateRange ?? effectiveRange ?? resolveRelativeDatePreset(filters.datePreset ?? 'current_year', timeZone, new Date());
        setRange(next); onChange({ mode: 'absolute', range: next });
      }
    }}><option value="relative">{t.relative}</option><option value="absolute">{t.fixed}</option><option value="all">{t.all}</option></select></label>
    {mode === 'relative' && <label>{t.preset}<select value={filters.datePreset} onChange={event => onChange({ mode: 'relative', preset: event.target.value as RelativeDatePreset })}>{relativeDatePresets.map(preset => <option key={preset} value={preset}>{periodLabels[locale][preset]}</option>)}</select></label>}
    {mode === 'absolute' && <div className="builder-dates"><label>{t.from}<input type="date" value={range.from} onChange={event => setRange({ ...range, from: event.target.value })} /></label><label>{t.to}<input type="date" value={range.to} onChange={event => setRange({ ...range, to: event.target.value })} /></label><button type="button" disabled={!validDateRange(range) || range.from === filters.dateRange?.from && range.to === filters.dateRange?.to} onClick={() => onChange({ mode: 'absolute', range })}>{t.apply}</button></div>}
  </fieldset>;
}
