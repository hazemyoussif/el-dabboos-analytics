import { governedPalettes } from '@el-dabboos/domain';
import type { GovernedPalette, Locale } from '@el-dabboos/domain';
import { appearanceCopy, paletteLabels } from '../i18n.ts';
import { useChartTheme } from '../presentation/ThemeProvider.tsx';
import { withGovernedPalette } from '../rendering/chart-theme.ts';

export function DashboardAppearance({ locale, palette, disabled = false, onChange }: {
  locale: Locale; palette: GovernedPalette; disabled?: boolean; onChange: (palette: GovernedPalette) => void;
}) {
  const theme = useChartTheme(); const t = appearanceCopy[locale];
  return <details className="dashboard-appearance">
    <summary><span className="appearance-summary-content">
      <strong>{t.heading}</strong>
      <span className="appearance-summary-preview"><span>{paletteLabels[locale][palette]}</span>
        <span className="appearance-swatches" aria-hidden="true">{withGovernedPalette(theme, palette).categorical.map((color, index) => <i key={index} style={{ backgroundColor: color }} />)}</span>
      </span>
    </span></summary>
    <fieldset disabled={disabled} className="appearance-palettes">
      <legend>{t.palette}</legend>
      {governedPalettes.map(value => <label key={value} className={`appearance-card ${palette === value ? 'selected' : ''}`}>
        <span className="appearance-name"><input type="radio" name="dashboard-palette" value={value} checked={palette === value} onChange={() => onChange(value)} />{paletteLabels[locale][value]}</span>
        <span className="appearance-swatches" aria-hidden="true">{withGovernedPalette(theme, value).categorical.map((color, index) => <i key={index} style={{ backgroundColor: color }} />)}</span>
      </label>)}
    </fieldset>
    <p className="builder-hint">{t.savedHint}</p>
  </details>;
}
