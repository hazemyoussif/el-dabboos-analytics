import assert from 'node:assert/strict';

/** Derive expected reporting eligibility from the registered window, preserving source authority and all data. */
export function referenceAnalyticsResultForWindow(result,window){
 const expected=structuredClone(result);
 if(!window)return expected;
 const day=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value).toISOString().slice(0,10)===value;
 assert.ok(day(window.from)&&day(window.to)&&window.from<=window.to,'Valid registered reporting window required');
 const metadata=expected.metadata;
 if(metadata.coverage){
  const coverage=metadata.coverage;
  assert.ok(day(coverage.from)&&day(coverage.through),'Valid reference coverage required');
  coverage.from=coverage.from<window.from?window.from:coverage.from;
  coverage.through=coverage.through>window.to?window.to:coverage.through;
  assert.ok(coverage.from<=coverage.through,'Reference coverage has no reporting-window intersection');
 }
 if(metadata.release?.period){
  const release=metadata.release,period=release.period;
  assert.ok(day(period.from)&&day(period.to),'Valid reference release period required');
  if(release.selectionSemantics==='latest_snapshot'&&period.to<window.from)release.period={from:window.from,to:window.from};
  else{
   period.from=period.from<window.from?window.from:period.from;period.to=period.to>window.to?window.to:period.to;
   assert.ok(period.from<=period.to,'Reference release has no reporting-window intersection');
  }
 }
 return expected;
}
export function referenceExecutionForWindow(result,window){
 const expected=structuredClone(result);
 for(const widget of Object.values(expected.widgetResults))for(const series of Object.values(widget.seriesResults)){
  if(series.status==='success')series.result=referenceAnalyticsResultForWindow(series.result,window);
 }
 return expected;
}
