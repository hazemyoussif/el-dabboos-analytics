import test from 'node:test';
import assert from 'node:assert/strict';
import {publishedQueryIssues} from '../src/published-capabilities.ts';
import type {PublishedAnalyticsCapabilities} from '../src/published-capabilities.ts';
const release={datasetId:'synthetic',sourceId:'synthetic',mappingId:'synthetic',mappingVersion:'1',certificationReference:'SYNTHETIC TEST ONLY',period:{from:'2026-09-01',to:'2026-09-30'},capabilities:[{metric:'net_aged_receivable' as const,summary:true,dimensions:['customer' as const],analyses:[]}]};
test('trusted snapshot selection resolves dates while preserving dimensions and legacy strict periods',()=>{
 const published:PublishedAnalyticsCapabilities={tenantId:'synthetic',mode:'certified',releases:[release]},query={metric:'net_aged_receivable' as const,dateRange:{from:'2025-10-01',to:'2026-10-08'}};
 assert.ok(publishedQueryIssues(query,published).some(issue=>issue.startsWith('period:')));
 const trusted={...published,releases:[{...release,selectionSemantics:'latest_snapshot' as const}]};assert.deepEqual(publishedQueryIssues(query,trusted),[]);
 assert.ok(publishedQueryIssues({...query,groupBy:'salesperson'},trusted).includes('pair:net_aged_receivable:salesperson'));
 assert.ok(publishedQueryIssues({...query,filters:[{dimension:'branch',values:['unapproved']}]},trusted).includes('filter:net_aged_receivable:branch'));
 assert.ok(publishedQueryIssues(query,{...published,releases:[{...release,selectionSemantics:'event_intersection'}]}).some(issue=>issue.startsWith('period:')));
});
