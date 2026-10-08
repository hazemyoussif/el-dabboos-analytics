import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { governedDimensionLabel, semanticCatalog, timeDimensions } from '@el-dabboos/domain';
import type { AnalystPanel, AnalyticsRow, Locale, TenantProfile } from '@el-dabboos/domain';
import { useChartTheme } from '../presentation/ThemeProvider.tsx';
import { formatDate, formatValue, localeTag } from '../i18n.ts';
import { analystCopy } from './copy.ts';
export function answerRowLabel(panel:AnalystPanel,row:AnalyticsRow,locale:Locale,profile:TenantProfile) {
 if(row.key===null)return semanticCatalog[panel.query.metric].labels[locale];
 if(panel.query.groupBy && timeDimensions.includes(panel.query.groupBy))return /^\d{4}-\d{2}(-\d{2})?$/.test(row.key)?formatDate(row.key.length===7?row.key+'-01':row.key,locale,profile):new Intl.NumberFormat(localeTag(locale,profile),{useGrouping:false}).format(Number(row.key));
 return governedDimensionLabel(row.key,panel.result.metadata.dimensionLabels?.[row.key],locale,panel.query.groupBy);
}
export function answerValue(panel:AnalystPanel,value:number|null,locale:Locale,profile:TenantProfile) {
 return formatValue(value,panel.query.analysis?.percentageContribution?'percentage':panel.result.metadata.metricType,locale,profile,panel.result.metadata.unit);
}
export function AnswerVisual({panel,locale,profile,onDetails}:{panel:AnalystPanel;locale:Locale;profile:TenantProfile;onDetails?:(key:string|null)=>void}) {
 const text=analystCopy[locale],rows=panel.result.rows;
 const timeSeries=panel.form==='time_series' || !!panel.query.groupBy&&timeDimensions.includes(panel.query.groupBy);
 if(rows.length<=1 && !panel.query.analysis?.comparison)return onDetails&&rows[0]?<button onClick={()=>onDetails(rows[0]!.key)}>{text.details}</button>:null;
 return <>
 {timeSeries&&rows.length>1&&<AnswerChart panel={panel} locale={locale} profile={profile}/>}
 <div className="table-wrap analyst-table" tabIndex={0} role="region" aria-label={semanticCatalog[panel.query.metric].labels[locale]}><table><thead><tr><th>{panel.query.groupBy?text.group:text.value}</th><th>{text.value}</th>{panel.query.analysis?.ranking&&<th>{text.rank}</th>}{panel.query.analysis?.comparison&&<><th>{text.previous}</th><th>{text.change}</th></>}{onDetails&&<th>{text.details}</th>}</tr></thead><tbody>{rows.map((row,index)=><tr key={row.key??index}><th scope="row">{answerRowLabel(panel,row,locale,profile)}</th><td><bdi>{answerValue(panel,row.value,locale,profile)}</bdi></td>{panel.query.analysis?.ranking&&<td>{row.rank?new Intl.NumberFormat(localeTag(locale,profile)).format(row.rank):'—'}</td>}{panel.query.analysis?.comparison&&<><td><bdi>{answerValue(panel,row.comparisonValue??null,locale,profile)}</bdi></td><td><bdi>{answerValue(panel,row.absoluteChange??null,locale,profile)}</bdi></td></>}{onDetails&&<td><button disabled={row.value===null} onClick={()=>onDetails(row.key)} aria-label={`${text.details}: ${answerRowLabel(panel,row,locale,profile)}`}>{text.details}</button></td>}</tr>)}</tbody></table></div>
 {panel.omittedRows>0&&<p className="muted">{text.omitted}</p>}
 </>;
}

function AnswerChart({panel,locale,profile}:{panel:AnalystPanel;locale:Locale;profile:TenantProfile}) {
 const theme=useChartTheme(),text=analystCopy[locale];
 const data=panel.result.rows.map(row=>({label:answerRowLabel(panel,row,locale,profile),value:row.value,comparison:row.comparisonValue??null}));
 return <div className="analyst-chart" role="img" aria-label={semanticCatalog[panel.query.metric].labels[locale]}><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{top:12,right:16,bottom:8,left:0}}><CartesianGrid stroke={theme.grid} vertical={false}/><XAxis dataKey="label" stroke={theme.axis} interval="preserveStartEnd" minTickGap={40}/><YAxis stroke={theme.axis} width={58} orientation={locale==='ar'?'right':'left'} tickFormatter={value=>new Intl.NumberFormat(localeTag(locale,profile),{notation:'compact'}).format(Number(value))}/><Tooltip contentStyle={{background:theme.tooltip,borderColor:theme.border,color:theme.text}} formatter={value=>answerValue(panel,value==null?null:Number(value),locale,profile)}/><Line dataKey="value" name={semanticCatalog[panel.query.metric].labels[locale]} stroke={theme.categorical[0]} strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false}/>{panel.query.analysis?.comparison&&<><Legend/><Line dataKey="comparison" name={text.previous} stroke={theme.categorical[1]} strokeDasharray="5 4" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false}/></>}</LineChart></ResponsiveContainer></div>;
}
