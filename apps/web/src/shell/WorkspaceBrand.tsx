import type { Locale } from '@el-dabboos/domain';
import { copy } from '../i18n.ts';

export function WorkspaceBrand({ locale, collapsed = false }: { locale: Locale; collapsed?: boolean }) {
  return <div className="brand">
    <img className="brand-mark" src="/brand/el-dabboos-mark.png" width="692" height="518" alt={collapsed ? 'El Dabboos' : ''} />
    {!collapsed && <div className="nav-label"><strong dir="ltr">{copy[locale].product}</strong><span>{copy[locale].studio}</span></div>}
  </div>;
}
