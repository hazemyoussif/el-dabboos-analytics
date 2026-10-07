import test from 'node:test';
import assert from 'node:assert/strict';
import { semanticCatalog } from '../src/catalog.ts';
test('every executable metric has authored bilingual help, type and version on the semantic catalog', () => {
 for (const metric of Object.values(semanticCatalog)) {
  assert.ok(['event','snapshot','derived'].includes(metric.help.metricType));
  assert.ok(Number.isInteger(metric.help.definitionVersion) && metric.help.definitionVersion > 0);
  for (const field of ['shortDefinition','definition','formula','dateBasis','aggregationBehavior','inclusionSummary','exclusionSummary','refundCreditBehavior'] as const) {
   assert.ok(metric.help[field].en.trim(), `${metric.id}/${field}`);
   assert.match(metric.help[field].ar, /[\u0600-\u06ff]/u);
  }
  assert.ok(metric.help.shortDefinition.en.length < 240,metric.id);
 }
 assert.match(semanticCatalog.net_invoiced_revenue.help.formula.en,/Posted Invoice Value − Refund Value/u);
 assert.match(semanticCatalog.average_confirmed_order_value.help.aggregationBehavior.en,/aggregated|totals/u);
});
