import {useEffect,useRef,useMemo,useState} from 'react';
import {RowPages,useRowPages} from './RowPages.tsx';
import { ExcelExportButton } from '../export/ExcelExportButton.tsx';
import { tableWorkbook } from '../export/excel-data.ts';
import { drillActionLabel } from '../DrillDetails.tsx';
import { successfulMetricMetadata } from '../metrics/definition-copy.ts';
import { MetricInfo } from '../metrics/MetricDefinition.tsx';
import type { WidgetExecution } from '@el-dabboos/application';
import { copy, formatKey } from '../i18n.ts';
import { seriesLabel } from './shared.ts';
import type { RenderSeriesProps } from './shared.ts';

export function TableContent(props: RenderSeriesProps & { entry: WidgetExecution }) {
  const { widget, entry, locale, profile, formatSeries } = props;
  const t = copy[locale];
  const [search,setSearch]=useState('');
  const filtered=useMemo(()=>search.trim()?entry.alignedRows.filter(row=>(props.keyLabel?.(row.key)??formatKey(row.key,widget.dimension,locale,profile)).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())):entry.alignedRows,[entry.alignedRows,search,props.keyLabel,widget.dimension,locale,profile]);
  const paging=useRowPages(filtered,100),scroll=useRef<HTMLDivElement>(null);
  const searchLabel=locale==='ar'?'بحث في أسماء الصفوف':'Search row labels';
  useEffect(()=>{if(scroll.current)scroll.current.scrollTop=0;},[paging.start,entry.alignedRows]);
  return <><ExcelExportButton locale={locale} kind="table" disabled={!entry.alignedRows.length} createWorkbook={() => tableWorkbook(widget, entry, props)} /><>{entry.alignedRows.length>200&&<label className="table-row-search"><span>{searchLabel}</span><input aria-label={searchLabel} value={search} onInput={event=>setSearch(event.currentTarget.value)}/><small>{locale==='ar'?'التصدير يشمل جميع الصفوف المحملة':'Export includes all loaded rows'}</small></label>}</><div ref={scroll} className="table-wrap" tabIndex={0} role="region" aria-label={widget.title?.[locale]??t.results} style={{ borderColor: props.theme.grid }}><table aria-rowcount={filtered.length+1}><thead><tr><th>{widget.dimension ? t.dimensions[widget.dimension] : t.results}</th>{widget.series.map((series, index) => <th key={series.id}>{seriesLabel(props, index)}{props.catalog[series.metric] && <MetricInfo metric={props.catalog[series.metric]!} locale={locale} currency={profile.reportingCurrency} metadata={successfulMetricMetadata(entry.seriesResults[series.id])} />}</th>)}</tr></thead><tbody>{paging.rows.map((row, index) => <tr aria-rowindex={paging.start+index+2} key={`${row.key}-${index}`}><td>{props.keyLabel?.(row.key)??formatKey(row.key, widget.dimension, locale, profile)}</td>{widget.series.map(series => <td key={series.id}>{props.onDrill&&props.canDrill?.(series.id,row.key)?<button type="button" className="drill-value" aria-label={`${drillActionLabel(locale)}: ${props.keyLabel?.(row.key)??''} · ${seriesLabel(props,widget.series.indexOf(series))} · ${formatSeries(series.id,row.series[series.id]?.value??null)}`} onClick={()=>props.onDrill?.(series.id,row.key)}>{formatSeries(series.id,row.series[series.id]?.value??null)}</button>:formatSeries(series.id, row.series[series.id]?.value ?? null)}</td>)}</tr>)}{!filtered.length&&<tr><td colSpan={widget.series.length+1}>{locale==='ar'?'لا توجد صفوف مطابقة':'No matching rows'}</td></tr>}</tbody></table></div><RowPages paging={paging} locale={locale} kind="table"/></>;
}
