import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { tenantProfiles } from '@el-dabboos/domain';
import type { PublishedAnalyticsCapabilities } from '@el-dabboos/domain';

test('historical coverage and effective snapshot cutoff are visible in English and Arabic; unknowns stay absent',async()=>{
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom'});
 try {
  const { HistoricalCoverage,historicalCoverage }=await server.ssrLoadModule('/src/reports/HistoricalCoverage.tsx');
  const { SnapshotAsOf }=await server.ssrLoadModule('/src/rendering/SnapshotAsOf.tsx');
  const period={from:'2025-10-01',to:'2026-09-30'};
  const published:PublishedAnalyticsCapabilities={tenantId:'demo-iq',mode:'certified',releases:[{datasetId:'history',sourceId:'source',mappingId:'mapping',mappingVersion:'1',certificationReference:'cert',period,capabilities:[]}]};
  assert.deepEqual(historicalCoverage(published),period);
  assert.equal(historicalCoverage({...published,mode:'synthetic'}),null);
  assert.equal(historicalCoverage(undefined),null);
  for(const locale of ['en','ar']) {
   const profile=tenantProfiles['demo-iq'];
   const html=renderToStaticMarkup(createElement(HistoricalCoverage,{published,locale,profile}));
   assert.ok(html.includes(locale==='en'?'Historical data available from':'البيانات التاريخية متاحة من'));assert.ok(html.includes('<bdi>'));
   const entry={seriesResults:{balance:{status:'success',result:{metadata:{snapshotAsOf:'2026-06-30'}}}}};
   const snapshot=renderToStaticMarkup(createElement(SnapshotAsOf,{entry,locale,profile}));
   assert.ok(snapshot.includes(locale==='en'?'As of':'الرصيد كما في'));assert.ok(snapshot.includes('<bdi>'));
   assert.equal(renderToStaticMarkup(createElement(SnapshotAsOf,{entry:undefined,locale,profile})), '');
  }
 }finally{await server.close();}
});
