import { useEffect, useRef, useState } from 'react';
import type { DashboardSpec, Locale } from '@el-dabboos/domain';
import { libraryCopy } from '../library-copy.ts';
import { namedSpec } from '../library-model.ts';
export function DashboardNameDialog({ spec, locale, busy, onConfirm, onClose }: { spec: DashboardSpec; locale: Locale; busy: boolean; onConfirm: (spec: DashboardSpec) => void; onClose: () => void }) {
  const t = libraryCopy[locale];
  const [primary, setPrimary] = useState(spec.title[locale]);
  const [secondary, setSecondary] = useState(spec.title.en === 'Untitled Dashboard' && spec.title.ar === 'لوحة بدون اسم' || spec.title[locale === 'en' ? 'ar' : 'en'] === spec.title[locale] ? '' : spec.title[locale === 'en' ? 'ar' : 'en']);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); ref.current?.querySelector('input')?.select(); }, []);
  const valid = !!primary.trim() && primary.trim().length <= 120 && secondary.trim().length <= 120;
  return <dialog ref={ref} className="name-dialog" dir={locale === 'ar' ? 'rtl' : 'ltr'} aria-label={t.name} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}><form onSubmit={event => { event.preventDefault(); if (valid && !busy) onConfirm(namedSpec(spec, locale, primary, secondary)); }}>
    <h2>{t.name}</h2><p>{t.namingHint}</p><label>{t.name}<input autoFocus required maxLength={120} value={primary} disabled={busy} onChange={event => setPrimary(event.target.value)} /></label>
    <label>{t.alternate}<input maxLength={120} value={secondary} disabled={busy} onChange={event => setSecondary(event.target.value)} /></label><div><button type="button" disabled={busy} onClick={onClose}>{t.cancel}</button><button type="submit" disabled={!valid || busy} className="primary-button">{t.save}</button></div>
  </form></dialog>;
}
