import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MetricTooltip } from './MetricTooltip.tsx';
import { MetricIdentifier } from './MetricIdentifier.tsx';
import { Info, X } from 'lucide-react';
import type { AnalyticsReleaseProvenance, AnalyticsResult, Locale, SemanticMetric, PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
import { copy } from '../i18n.ts';
import { definitionCopy, definitionStatus, metricDefinitionText, openDefinitionDialog } from './definition-copy.ts';
import { analysisHelp } from './analysis-help.ts';
export const MetricCurrencyContext = createContext<string | undefined>(undefined);
export const MetricPublicationContext = createContext<PublishedAnalyticsCapabilities | undefined>(undefined);
interface Props { metric: SemanticMetric; locale: Locale; currency?: string; metadata?: AnalyticsResult['metadata']; label?: string }
export function MetricDefinitionBody({ metric, locale, currency, metadata }: Props) {
 const text = definitionCopy[locale];
 const help = metric.help;
 const published = useContext(MetricPublicationContext);
 const publication = published?.releases.find(release => release.capabilities.some(capability => capability.metric === metric.id));
 const provenance = metadata?.release ?? publication;
 const status = metricTrustStatus(metric,metadata,published,locale);
 const fields = [
  [text.formula, help.formula[locale]], [text.includes, help.inclusionSummary[locale]], [text.excludes, help.exclusionSummary[locale]],
  [text.date, help.dateBasis[locale]], [text.unit, metric.type === 'currency' ? currency ?? '—' : metric.presentation.unit ?? (locale === 'ar' ? 'عدد' : 'Count')],
  [text.type, text[help.metricType]], [text.credits, help.refundCreditBehavior[locale]], [text.aggregation, help.aggregationBehavior[locale]],
  [text.dimensions, (publication?.capabilities.find(capability => capability.metric === metric.id)?.dimensions ?? metric.dimensions).map(dimension => copy[locale].dimensions[dimension]).join(locale === 'ar' ? '، ' : ', ') || '—'],
  [text.version, String(help.definitionVersion)], [text.period, metadata?.dataThrough ?? publication?.period?.to ?? '—'], [text.asOf, metadata?.sourceAsOf ?? '—'],
  ...(metadata?.reconciliation?[[locale==='ar'?'مرجع التعريف المعتمد':'Approved definition reference',metadata.reconciliation.definitionReference]]:[]),
  ...analysisHelp(metadata?.analysis,locale),
 ];
 return <><p className="report-status">{status}</p><p>{help.definition[locale]}</p><dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><DefinitionTechnicalDetails metric={metric} locale={locale} provenance={provenance} /></>;
}
export function MetricDefinitionDialog({ trigger, onClose, ...props }: Props & { trigger: HTMLElement | null; onClose: () => void }) {
 const dialog = useRef<HTMLDialogElement>(null);
 const published = useContext(MetricPublicationContext);
 const heading = useId();
 const [feedback, setFeedback] = useState('');
 const text = definitionCopy[props.locale];
 useEffect(() => dialog.current ? openDefinitionDialog(dialog.current, trigger) : undefined, [trigger]);
 const copyDefinition = async () => {
  try { await navigator.clipboard.writeText(metricDefinitionText(props.metric, props.locale, metricTrustStatus(props.metric,props.metadata,published,props.locale),props.metadata?.analysis)); setFeedback(text.copied); }
  catch { setFeedback(text.failed); }
 };
 return <dialog ref={dialog} className="metric-definition-dialog" aria-modal="true" aria-labelledby={heading} dir={props.locale === 'ar' ? 'rtl' : 'ltr'} onCancel={event => { event.preventDefault(); onClose(); }}>
  <header><div><h2 id={heading}>{props.metric.labels[props.locale]}</h2><p lang={props.locale === 'ar' ? 'en' : 'ar'} dir={props.locale === 'ar' ? 'ltr' : 'rtl'}>{props.metric.labels[props.locale === 'ar' ? 'en' : 'ar']}</p></div><button type="button" aria-label={text.close} onClick={onClose}><X aria-hidden="true" /></button></header>
  <div className="metric-definition-body"><MetricDefinitionBody {...props} /></div><footer><button type="button" onClick={() => void copyDefinition()}>{text.copy}</button><span role="status">{feedback}</span></footer>
 </dialog>;
}
/** Shared independent action: inspecting a metric never selects/adds it. */
export function MetricInfo(props: Props) {
 const contextCurrency = useContext(MetricCurrencyContext);
 const currency = props.currency ?? contextCurrency;
 const [open, setOpen] = useState(false);
 const trigger = useRef<HTMLButtonElement>(null);
 const tooltip = useId();
 const [hint,setHint]=useState(false);
 const focused=useRef(false);
 const hovered=useRef(false);
 const dismiss=useRef<ReturnType<typeof setTimeout>|null>(null);
 const showHint=()=>{if(dismiss.current)clearTimeout(dismiss.current);setHint(true);};
 const hideHint=()=>{if(focused.current||hovered.current)return;if(dismiss.current)clearTimeout(dismiss.current);dismiss.current=setTimeout(()=>setHint(false),150);};
 useEffect(()=>()=>{if(dismiss.current)clearTimeout(dismiss.current);},[]);
 return <span className="metric-info" onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
  <button type="button" ref={trigger} className="metric-info-button" aria-label={`${definitionCopy[props.locale].info}: ${props.metric.labels[props.locale]}`} aria-describedby={tooltip} aria-haspopup="dialog" onPointerEnter={()=>{hovered.current=true;showHint();}} onPointerLeave={()=>{hovered.current=false;hideHint();}} onFocus={()=>{focused.current=true;showHint();}} onBlur={()=>{focused.current=false;hideHint();}} onKeyDown={event=>{if(event.key==='Escape'){if(dismiss.current)clearTimeout(dismiss.current);setHint(false);}}} onClick={() => {if(dismiss.current)clearTimeout(dismiss.current);setHint(false);setOpen(true);}}><Info aria-hidden="true" /></button>
  <MetricTooltip id={tooltip} text={props.metric.help.shortDefinition[props.locale]} rtl={props.locale==='ar'} visible={hint&&!open} anchor={trigger} onEnter={()=>{hovered.current=true;showHint();}} onLeave={()=>{hovered.current=false;hideHint();}}/>
  {open && createPortal(<MetricDefinitionDialog {...props} currency={currency} trigger={trigger.current} onClose={() => setOpen(false)} />, document.body)}
 </span>;
}

function DefinitionTechnicalDetails({metric,locale,provenance}: {metric: SemanticMetric; locale: Locale; provenance: AnalyticsReleaseProvenance | undefined}) { const text = definitionCopy[locale]; return <details><summary>{text.technical}</summary><MetricIdentifier metric={metric} locale={locale}/><dl>{provenance && <><dt>{locale === 'ar' ? 'إصدار الربط' : 'Mapping version'}</dt><dd><bdi>{provenance.mappingVersion}</bdi></dd><dt>{locale === 'ar' ? 'مرجع الاعتماد' : 'Certification reference'}</dt><dd><bdi>{provenance.outputCertificationReference ?? provenance.certificationReference}</bdi></dd><dt>{locale === 'ar' ? 'المصدر' : 'Source'}</dt><dd><bdi>{provenance.sourceId}</bdi></dd></>}</dl></details>; }

function metricTrustStatus(metric:SemanticMetric,metadata:AnalyticsResult['metadata']|undefined,published:PublishedAnalyticsCapabilities|undefined,locale:Locale){
 if(published?.mode==='synthetic')return definitionCopy[locale].demo;
 if(metadata?.reconciliation)return definitionStatus(metadata,locale);
 const approved=metadata?.release||published?.releases.some(release=>release.capabilities.some(capability=>capability.metric===metric.id));
 return approved?definitionCopy[locale].certified:definitionStatus(metadata,locale);
}
