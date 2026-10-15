import {WorkspaceLink} from '../WorkspaceLink.tsx';
import { useState } from 'react';
import { LayoutTemplate, LockKeyhole, Search } from 'lucide-react';
import { semanticCatalog } from '@el-dabboos/domain';
import { copy } from '../i18n.ts';
import type { DimensionId, MetricId, Locale } from '@el-dabboos/domain';
import type { AccessibleTemplate } from '../api/client.ts';
import { filterTemplates } from '../library-model.ts';
import { libraryCopy } from '../library-copy.ts';
import { presentationCopy } from '../presentation/copy.ts';
import { EmptyState } from '../presentation/Feedback.tsx';
function compatibilityMessage(template: AccessibleTemplate,locale: Locale): string | undefined {
  if (template.availability==='restricted') return locale==='ar' ? 'يتضمن مؤشرات غير متاحة لهذا المستخدم.' : 'Contains metrics unavailable to this user.';
  if (template.availability!=='incompatible') return undefined;
  const missing = [...new Set((template.compatibility?.missing ?? []).map(issue => {
    const [kind,metric,detail] = issue.split(':');
    const label = semanticCatalog[metric as MetricId]?.labels[locale] ?? metric;
    if (kind==='pair' || kind==='filter') return `${label} · ${copy[locale].dimensions[detail as DimensionId] ?? detail}`;
    if (kind==='analysis') return `${label} · ${locale==='ar' ? 'تحليل إضافي' : 'additional analysis'}`;
    if (kind==='period') return locale==='ar' ? 'الفترة المعتمدة' : 'Certified period';
    return label;
  }))];
  const prefix = locale==='ar' ? 'يتطلب هذا القالب إمكانات غير متاحة لمساحة العمل: ' : 'This template requires capabilities unavailable for this workspace: ';
  return prefix+missing.join(locale==='ar' ? '، ' : ', ');
}
export function TemplateBrowser({ templates, locale, onOpen, activeId }: { templates: AccessibleTemplate[]; locale: Locale; onOpen: (id: string) => void; activeId?: string }) {
  const [domain, setDomain] = useState('all'); const [search, setSearch] = useState(''); const t = libraryCopy[locale];
  const filtered = filterTemplates(templates,domain,search);
  return <div className="template-browser"><div className="template-toolbar"><label className="search-field"><Search aria-hidden="true" /><input aria-label={t.templateSearch} placeholder={t.templateSearch} value={search} onChange={event => setSearch(event.target.value)} /></label><select aria-label={t.category} value={domain} onChange={event => setDomain(event.target.value)}>{(['all','executive','sales','crm','finance','customers','inventory','maintenance'] as const).map(value => <option key={value} value={value}>{value === 'all' ? t.templateAll : t[value]}</option>)}</select></div><nav className="template-cards">{filtered.map(template => <WorkspaceLink route={{kind:'report',id:template.id}} key={template.id} disabled={template.availability !== 'available'} title={compatibilityMessage(template,locale)} className={`template-card ${activeId === template.id ? 'active' : ''}`} onNavigate={() => onOpen(template.id)}><div className="template-card-top"><LayoutTemplate aria-hidden="true" /><span className="template-domain">{t[template.domain as 'sales'] ?? template.domain}</span>{template.availability === 'restricted' && <LockKeyhole aria-hidden="true" />}</div><strong>{template.name[locale]}</strong><span className="template-description">{template.description[locale]}</span>{compatibilityMessage(template,locale) && <small>{compatibilityMessage(template,locale)}</small>}</WorkspaceLink>)}</nav>{!filtered.length && <EmptyState search>{presentationCopy[locale].noTemplates}</EmptyState>}</div>;
}
