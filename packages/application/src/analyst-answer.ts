import { governedDimensionLabel, semanticCatalog, timeDimensions } from '@el-dabboos/domain';
import type { AnalystAnswer, AnalystPanel, Locale, TenantProfile } from '@el-dabboos/domain';
import type { AnalyticsIntentResult, AnalyticsSeriesResult } from './analytics-execution.ts';
export const emptyAnalystTiming=()=>({plannerMs:0,capabilityMs:0,executionMs:0,synthesisMs:0,totalMs:0});
/** Compact display evidence retains exact semantic queries and immutable lineage, with explicit truncation. */
export function renderAnalystAnswer(result:AnalyticsIntentResult,profile:TenantProfile):AnalystAnswer {
  let remaining=600;
  const seriesCount=result.analyses.reduce((count,analysis)=>count+analysis.series.length,0);
  let retainedCount=0;
  const panels=result.analyses.flatMap(analysis=>analysis.series.flatMap(entry=>{
    if(entry.status==='EXECUTION_FAILED')return [];
    const count=Math.min(30,Math.max(1,remaining-(seriesCount-++retainedCount)));remaining-=count;
    return [renderPanel(entry,profile,count)];
  }));
  const semanticLimit=result.intent.analyses.some(analysis=>analysis.context||analysis.rank);
  return {status:result.status,panels,failedAnalyses:result.analyses.flatMap(analysis=>analysis.series).filter(entry=>entry.status==='EXECUTION_FAILED').length,intent:answerIntent(result),conversion:semanticLimit?'semantic_limit':panels.some(panel=>panel.status!=='DATA_NOT_READY')?'available':'unavailable',timing:{...emptyAnalystTiming(),...result.timing}};
}
function renderPanel(entry:Exclude<AnalyticsSeriesResult,{status:'EXECUTION_FAILED'}>,profile:TenantProfile,count:number):AnalystPanel {
  const result=structuredClone(entry.result),omittedRows=Math.max(0,result.rows.length-count);
  result.rows=result.rows.slice(0,count);
  const retained=new Set(result.rows.flatMap(row=>row.key===null?[]:[row.key]));
  if(result.metadata.dimensionLabels)result.metadata.dimensionLabels=Object.fromEntries(Object.entries(result.metadata.dimensionLabels).filter(([key])=>retained.has(key)));
  if(result.metadata.drillReleases)result.metadata.drillReleases=Object.fromEntries(Object.entries(result.metadata.drillReleases).filter(([key])=>retained.has(key)));
  return {status:entry.status,query:structuredClone(entry.query),result,form:entry.form,omittedRows,summary:{en:summary(entry,profile,'en'),ar:summary(entry,profile,'ar')}};
}
function summary(entry:Exclude<AnalyticsSeriesResult,{status:'EXECUTION_FAILED'}>,profile:TenantProfile,locale:Locale):string {
  const metric=semanticCatalog[entry.query.metric],label=metric.labels[locale],row=entry.result.rows[0];
  if(!row || row.value===null)return locale==='ar'?`${label}: لا تتوفر قيمة لهذا الاختيار.`:`${label}: no value is available for this selection.`;
  const amount=summaryAmount(entry,row.value,profile,locale);
  const entity=summaryEntity(entry,locale);
  const periodComparison=periodComparisonSummary(entry,profile,locale);if(periodComparison)return periodComparison;
  const comparison=pairSummary(entry,profile,locale,amount);
  if(comparison)return comparison;
  const ordinal=ordinalSummary(entry,locale,entity,amount);if(ordinal)return ordinal;
  if(row.key!==null && entry.result.rows.length>1)return locale==='ar'?`${label} حسب ${entity ? 'الاختيار الموضح أدناه' : 'المجموعات'}.`:`${label} by the groups shown below.`;
  return `${entity?entity+' · ':''}${label}: ${amount}.`;
}

/** Freeze the answer's effective period so conversion cannot shift a relative period on a later day. */
function answerIntent(result:AnalyticsIntentResult) {
 const intent=structuredClone(result.intent),first=result.analyses[0]?.series[0]?.query;
 if(first?.dateRange)intent.context={dateRange:structuredClone(first.dateRange),...(first.filters?{dimensions:structuredClone(first.filters)}:{})};
 intent.analyses.forEach((analysis,index)=>{if(analysis.context){const query=result.analyses[index]?.series[0]?.query;if(query?.dateRange)analysis.context={dateRange:structuredClone(query.dateRange),...(query.filters?{dimensions:structuredClone(query.filters)}:{})};}});
 return intent;
}

function pairSummary(entry:Exclude<AnalyticsSeriesResult,{status:'EXECUTION_FAILED'}>,profile:TenantProfile,locale:Locale,amount:string) {
 const metric=semanticCatalog[entry.query.metric],label=metric.labels[locale],unit=metric.type==='currency'?profile.reportingCurrency:entry.result.metadata.unit??'',row=entry.result.rows[0]!;
 const entity=governedDimensionLabel(row.key??'',entry.result.metadata.dimensionLabels?.[row.key??''],locale,entry.query.groupBy);
  if(entry.result.rows.length===2 && entry.query.groupBy && !entry.query.analysis) {
    const other=entry.result.rows[1]!;
    if(other.value!==null) {
      const otherLabel=governedDimensionLabel(other.key??'',entry.result.metadata.dimensionLabels?.[other.key??''],locale,entry.query.groupBy);
      const difference=new Intl.NumberFormat(`${locale}-${profile.countryCode}`,{maximumFractionDigits:2}).format(Math.abs(row.value!-other.value));
      return locale==='ar'?`${label}: ${entity} ${amount}؛ ${otherLabel} ${new Intl.NumberFormat(`${locale}-${profile.countryCode}`,{maximumFractionDigits:2}).format(other.value)} ${unit}. الفرق ${difference} ${unit}.`:`${label}: ${entity} ${amount}; ${otherLabel} ${new Intl.NumberFormat(`${locale}-${profile.countryCode}`,{maximumFractionDigits:2}).format(other.value)} ${unit}. Difference: ${difference} ${unit}.`;
    }
  }
 return undefined;
}

function ordinalSummary(entry:Exclude<AnalyticsSeriesResult,{status:'EXECUTION_FAILED'}>,locale:Locale,entity:string,amount:string) {
 const label=semanticCatalog[entry.query.metric].labels[locale],row=entry.result.rows[0]!;
  if(entry.form==='ranked_list' && entry.result.rows.length===1) {
    const rank=row.rank??1;
    if(entry.query.analysis?.topN?.direction==='bottom')return locale==='ar'?`${entity} حقق أقل ${label} بقيمة ${amount}.`:`${entity} had the lowest ${label} at ${amount}.`;
    return locale==='ar'?`${entity} في المرتبة ${new Intl.NumberFormat('ar').format(rank)} في ${label} بقيمة ${amount}.`:`${entity} ranks ${rank} for ${label} at ${amount}.`;
  }
 return undefined;
}

function summaryAmount(entry:Exclude<AnalyticsSeriesResult,{status:'EXECUTION_FAILED'}>,value:number,profile:TenantProfile,locale:Locale) {
 const metric=semanticCatalog[entry.query.metric],percentage=entry.query.analysis?.percentageContribution||metric.type==='percentage';
 const number=new Intl.NumberFormat(`${locale}-${profile.countryCode}`,{maximumFractionDigits:2}).format(value);
 const unit=percentage?'%':metric.type==='currency'?profile.reportingCurrency:entry.result.metadata.unit??'';
 return `${number}${unit?' '+unit:''}`;
}

function periodComparisonSummary(entry:Exclude<AnalyticsSeriesResult,{status:'EXECUTION_FAILED'}>,profile:TenantProfile,locale:Locale) {
 const row=entry.result.rows[0];
 if(!entry.query.analysis?.comparison || entry.query.groupBy || !row || row.value===null)return undefined;
 const label=semanticCatalog[entry.query.metric].labels[locale],value=summaryAmount(entry,row.value,profile,locale);
 const previous=row.comparisonValue==null?'—':summaryAmount(entry,row.comparisonValue,profile,locale),change=row.absoluteChange==null?'—':summaryAmount(entry,row.absoluteChange,profile,locale);
 return locale==='ar'?`${label}: ${value}؛ الفترة المقارنة: ${previous}؛ التغير: ${change}.`:`${label}: ${value}; comparison period: ${previous}; change: ${change}.`;
}

function summaryEntity(entry:Exclude<AnalyticsSeriesResult,{status:'EXECUTION_FAILED'}>,locale:Locale) {
 const row=entry.result.rows[0]!;
 if(row.key===null || entry.query.groupBy && timeDimensions.includes(entry.query.groupBy))return '';
 return governedDimensionLabel(row.key,entry.result.metadata.dimensionLabels?.[row.key],locale,entry.query.groupBy);
}
