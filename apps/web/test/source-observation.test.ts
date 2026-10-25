import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AnalyticsResult } from '@el-dabboos/domain';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';

const metadata: AnalyticsResult['metadata'] = { sourceId: 'postgres', executedAt: '2026-10-25T12:00:00Z', metricType: 'currency', semantics: 'additive' };
test('API receipt notice is explicit in both languages and absent for retained snapshots', async () => {
  const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
  try {
  const {SourceObservation}=await server.ssrLoadModule('/src/rendering/SourceObservation.tsx');
  assert.equal(renderToStaticMarkup(createElement(SourceObservation, { metadata, locale: 'en' })), '');
  const observed = { ...metadata, sourceConsistency: 'api_observed' as const };
  const english = renderToStaticMarkup(createElement(SourceObservation, { metadata: observed, locale: 'en' }));
  const arabic = renderToStaticMarkup(createElement(SourceObservation, { metadata: observed, locale: 'ar' }));
  assert.match(english, /role="note"/); assert.match(english, /Records may change between requests/);
  assert.match(arabic, /قد تتغير السجلات بين الطلبات/);
  assert.doesNotMatch(english, /frozen|live snapshot/);
  } finally {await server.close();}
});
