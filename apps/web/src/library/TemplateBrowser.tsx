import { useState } from 'react';
import type { Locale } from '@el-dabbous/domain';
import type { AccessibleTemplate } from '../api/client.ts';
import { filterTemplates } from '../library-model.ts';
import { libraryCopy } from '../library-copy.ts';
export function TemplateBrowser({ templates, locale, onOpen, activeId }: { templates: AccessibleTemplate[]; locale: Locale; onOpen: (id: string) => void; activeId?: string }) {
  const [domain, setDomain] = useState('all'); const [search, setSearch] = useState(''); const t = libraryCopy[locale];
  return <div className="template-browser"><input aria-label={t.templateSearch} placeholder={t.templateSearch} value={search} onChange={event => setSearch(event.target.value)} /><select aria-label={t.category} value={domain} onChange={event => setDomain(event.target.value)}>{(['all','executive','sales','crm','finance','customers','inventory','maintenance'] as const).map(value => <option key={value} value={value}>{value === 'all' ? t.templateAll : t[value]}</option>)}</select><nav className="demo-list">{filterTemplates(templates,domain,search).map(template => <button key={template.id} disabled={template.availability === 'restricted'} title={template.reason} className={`demo-item ${activeId === template.id ? 'active' : ''}`} onClick={() => onOpen(template.id)}><span>▥</span><span>{template.name[locale]}</span></button>)}</nav></div>;
}
