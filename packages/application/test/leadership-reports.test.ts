import assert from 'node:assert/strict';
import test from 'node:test';
import type {PublishedAnalyticsCapabilities,PublishedAnalyticsRelease} from '@el-dabboos/domain';
import {templateCompatibility,supportedTemplatePeriod} from '../src/index.ts';
import {leadershipTemplates} from '../src/leadership-templates.ts';
const base={sourceId:'synthetic-only',mappingId:'fixture',mappingVersion:'1',certificationReference:'SYNTHETIC ONLY'};
function published():PublishedAnalyticsCapabilities {
 const finance=['net_aged_receivable','total_overdue_receivable','credit_balances','aged_at_date','aged_1_30','aged_31_60','aged_61_90','aged_91_120','aged_over_120'] as const;
 const financeRelease:PublishedAnalyticsRelease={...base,datasetId:'finance',period:{from:'2024-06-30',to:'2026-09-30'},selectionSemantics:'latest_snapshot',capabilities:finance.map(metric=>({metric,summary:true,dimensions:['customer','month'],analyses:[]}))};
 const eventRelease:PublishedAnalyticsRelease={...base,datasetId:'events',period:{from:'2024-06-01',to:'2026-10-14'},selectionSemantics:'event_intersection',capabilities:(['net_invoiced_revenue','refund_value'] as const).map(metric=>({metric,summary:true,dimensions:['customer','business_line','month'],analyses:[]}))};
 const reviewReleases:PublishedAnalyticsRelease[]=['2024-06','2026-08','2026-09'].map(month=>({...base,datasetId:month,financeReview:'pending',period:{from:`${month}-01`,to:`${month}-${month.endsWith('08')?'31':'30'}`},capabilities:(['customer_cash_collected','unallocated_customer_receipts','weighted_collection_days','receivables_due_for_collection'] as const).map(metric=>({metric,summary:true,dimensions:['customer','month'],analyses:['topN']}))}));
 return {tenantId:'demo-iq',mode:'certified',releases:[financeRelease,eventRelease,...reviewReleases]};
}
test('leadership reports choose latest shared complete month regardless of current date or release order',()=>{
 for(const template of leadershipTemplates){
  const capabilities=published();
  assert.equal(templateCompatibility(template,capabilities).status,'supported');
  assert.deepEqual(supportedTemplatePeriod(template,capabilities),{from:'2026-09-01',to:'2026-09-30'});
  assert.deepEqual(supportedTemplatePeriod(template,{...capabilities,releases:[...capabilities.releases].reverse()}),{from:'2026-09-01',to:'2026-09-30'});
  const older={...capabilities,releases:capabilities.releases.filter(release=>release.datasetId!=='2026-09')};
  assert.deepEqual(supportedTemplatePeriod(template,older),{from:'2026-08-01',to:'2026-08-31'});
 }
});
test('leadership reports fail closed when exact capabilities have no shared complete month',()=>{
 for(const template of leadershipTemplates){
  const capabilities=published();
  const disjoint={...capabilities,releases:capabilities.releases.map(release=>release.datasetId==='finance'?{...release,period:{from:'2026-10-01',to:'2026-10-14'}}:release)};
  assert.equal(templateCompatibility(template,disjoint).status,'unsupported');
  assert.equal(supportedTemplatePeriod(template,disjoint),undefined);
  const noRanking={...capabilities,releases:capabilities.releases.map(release=>({...release,capabilities:release.capabilities.map(capability=>({...capability,analyses:[]}))}))};
  assert.notEqual(templateCompatibility(template,noRanking).status,'supported');
 }
});
test('latest complete month respects leap February and rejects incomplete-only coverage',()=>{
 const template=leadershipTemplates[1]!;
 const capabilities=published();
 const leap={...capabilities,releases:capabilities.releases.map(release=>({...release,period:{from:'2024-02-01',to:'2024-02-29'}}))};
 assert.deepEqual(supportedTemplatePeriod(template,leap),{from:'2024-02-01',to:'2024-02-29'});
 const partial={...leap,releases:leap.releases.map(release=>({...release,period:{from:'2024-02-01',to:'2024-02-28'}}))};
 assert.equal(supportedTemplatePeriod(template,partial),undefined);
});
