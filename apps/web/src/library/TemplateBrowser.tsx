import { useState } from 'react';
import { LayoutTemplate, LockKeyhole, Search } from 'lucide-react';
import type { Locale } from '@el-dabboos/domain';
import type { AccessibleTemplate } from '../api/client.ts';
import { filterTemplates } from '../library-model.ts';
import { libraryCopy } from '../library-copy.ts';
import { presentationCopy } from '../presentation/copy.ts';
import { EmptyState } from '../presentation/Feedback.tsx';
export function TemplateBrowser({ templates, locale, onOpen, activeId }: { templates: AccessibleTemplate[]; locale: Locale; onOpen: (id: string) => void; activeId?: string }) {
  const [domain, setDomain] = useState('all'); const [search, setSearch] = useState(''); const t = libraryCopy[locale];
  const filtered = filterTemplates(templates,domain,search);
  return <div className="template-browser"><div className="template-toolbar"><label className="search-field"><Search aria-hidden="true" /><input aria-label={t.templateSearch} placeholder={t.templateSearch} value={search} onChange={event => setSearch(event.target.value)} /></label><select aria-label={t.category} value={domain} onChange={event => setDomain(event.target.value)}>{(['all','executive','sales','crm','finance','customers','inventory','maintenance'] as const).map(value => <option key={value} value={value}>{value === 'all' ? t.templateAll : t[value]}</option>)}</select></div><nav className="template-cards">{filtered.map(template => <button key={template.id} disabled={template.availability === 'restricted'} title={template.reason} className={`template-card ${activeId === template.id ? 'active' : ''}`} onClick={() => onOpen(template.id)}><div className="template-card-top"><LayoutTemplate aria-hidden="true" /><span className="template-domain">{t[template.domain as 'sales'] ?? template.domain}</span>{template.availability === 'restricted' && <LockKeyhole aria-hidden="true" />}</div><strong>{template.name[locale]}</strong><span className="template-description">{template.description[locale]}</span>{template.reason && <small>{template.reason}</small>}</button>)}</nav>{!filtered.length && <EmptyState search>{presentationCopy[locale].noTemplates}</EmptyState>}</div>;
}
