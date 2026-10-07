import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { isMetricId } from '../../../packages/domain/src/catalog.ts';
import { definitionHash, renderPack, stateCounts, stateLabels, resolvedMetric } from '../../business/render-enterprise-pack.mjs';
const business = new URL('../../../docs/business/', import.meta.url);
const pack = JSON.parse(readFileSync(new URL('enterprise-metrics-v1.json', business), 'utf8'));
const discovery = JSON.parse(readFileSync(new URL('../../../docs/integration/odoo-analytics-capability-catalog.json', import.meta.url), 'utf8'));
function record(id) { const metric = pack.metrics.find(item => item.id === id); assert.ok(metric, id); return metric; }
test('business universe preserves every discovery candidate and keeps proposed identities outside runtime', () => {
 assert.equal(pack.metrics.length, 204);
 assert.equal(new Set(pack.metrics.map(metric => metric.id)).size, pack.metrics.length);
 assert.deepEqual(pack.metrics.filter(metric => metric.discoveryId).map(metric => metric.discoveryId).sort(), discovery.metrics.map(metric => metric.candidateMetric).sort());
 for (const metric of pack.metrics) {
  assert.match(metric.id, /^[a-z][a-z0-9_]+$/u);
  assert.ok(Object.hasOwn(stateLabels, metric.state));
  assert.ok(Object.hasOwn(pack.profiles, metric.domain));
  if (metric.canonicalId) assert.ok(isMetricId(metric.canonicalId), metric.canonicalId);
  if (metric.state !== 'certified') { assert.equal(metric.published, false); assert.deepEqual(metric.publishedDimensions, []); }
 }
});
test('certified definitions retain ten event metrics plus exact cutoff aging grouping boundaries', () => {
 assert.deepEqual(pack.metrics.filter(metric => metric.published && metric.approval !== 'standing_finance').map(metric => metric.canonicalId).sort(), ['average_confirmed_order_value', 'average_invoice_value', 'cancelled_orders', 'invoice_count', 'invoiced_revenue', 'net_invoiced_revenue', 'order_count', 'order_revenue', 'refund_count', 'refund_value'].sort());
 for (const metric of pack.metrics.filter(item => item.published && item.approval !== 'standing_finance')) { assert.equal(metric.state, 'certified'); assert.deepEqual(metric.publishedDimensions, ['business_line', 'salesperson']); }
 assert.equal(stateCounts(pack).certified, 21);
 const aging=pack.metrics.filter(item=>item.approval==='standing_finance');assert.equal(aging.length,11);
 for(const metric of aging){assert.equal(metric.state,'certified');assert.deepEqual(metric.publishedDimensions,['gross_open_receivable_components','credit_balances'].includes(metric.canonicalId)?[]:['customer']);assert.equal(metric.approvalRecord.approvalDate,'2026-10-07');}
 assert.equal(pack.financePublication.identityCases,15519);
 assert.equal(record('order_margin').published, false);
 assert.notEqual(record('refund_value_percentage').id, record('refund_count_percentage').id);
});
test('all report and approval references resolve, while future reports cannot claim execution', () => {
 for (const entry of [...pack.reports, ...pack.decisions]) for (const id of entry.metrics) record(id);
 assert.equal(pack.reports.filter(report => report.state === 'executable_certified').length, 5);
 for (const report of pack.reports.filter(item => item.state === 'executable_certified')) for (const id of report.metrics) assert.equal(record(id).published, true);
 assert.equal(pack.reports.find(report => report.id === 'customer-performance').state, 'blocked');
 for (const id of ['product-performance', 'order-margin', 'inventory-overview', 'expiry-risk', 'procurement-overview']) assert.equal(pack.reports.find(report => report.id === id).state, 'planned_unpublished');
 for (const decision of pack.decisions) assert.equal(decision.state, decision.id === 'APP-04' ? 'standing_approval_recorded' : 'pending');
});
test('EN and AR are deterministic projections with equal metric, report and approval coverage', () => {
 const rendered = renderPack(pack);
 for (const [name, text] of Object.entries(rendered)) assert.equal(readFileSync(new URL(name, business), 'utf8'), text, name);
 for (const metric of pack.metrics) {
  for (const field of ['name', 'definition', 'formula', 'aggregation', 'nullPolicy', 'signPolicy', 'refundPolicy', 'cancelPolicy', 'notes']) {
   const text = resolvedMetric(metric, pack)[field];
   assert.ok(text.en.trim(), `${metric.id}/${field}/en`); assert.match(text.ar, /[\u0600-\u06ff]/u, `${metric.id}/${field}/ar`);
  }
  for (const locale of ['en', 'ar']) assert.ok(rendered[`el-dabboos-metric-dictionary-${locale}.md`].includes(`— ${metric.id}`));
 }
 for (const report of pack.reports) for (const locale of ['en', 'ar']) assert.ok(rendered[`el-dabboos-report-catalog-${locale}.md`].includes(`(${report.id})`));
 for (const decision of pack.decisions) for (const locale of ['en', 'ar']) assert.ok(rendered[`el-dabboos-metric-approval-${locale}.md`].includes(`### ${decision.id}`));
});
test('approval binds exact bilingual meaning and source scope, and changes invalidate the fingerprint', () => {
 for (const metric of pack.metrics) {
  assert.equal(metric.definitionHash, definitionHash(metric, pack), metric.id);
  assert.equal(metric.approvalRecord.definitionVersion, metric.definitionVersion);
  if (!metric.published) { assert.equal(metric.approvalRecord.owner, null); assert.equal(metric.approvalRecord.approvalDate, null); assert.equal(metric.approvalRecord.acceptedExceptions, null); }
 }
 const metric = record('order_margin');
 assert.notEqual(definitionHash({ ...metric, formula: { ...metric.formula, ar: 'صيغة معدلة' } }, pack), metric.definitionHash);
 assert.notEqual(definitionHash({ ...metric, definitionVersion: 2 }, pack), metric.definitionHash);
});
function minorUnits(value) { const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * 100n + BigInt((whole.startsWith('-') ? '-' : '') + fraction.padEnd(2, '0')); }
test('net and gross receivable controls preserve totals, distinct missing-date policy and pending Finance approval', () => {
 const value = id => minorUnits(record(id).controlValue);
 assert.equal(value('receivables_gross_outstanding_amount') + value('credit_balances'), value('net_aged_receivable'));
 assert.equal(['aged_at_date', 'aged_1_30', 'aged_31_60', 'aged_61_90', 'aged_91_120', 'aged_over_120'].reduce((sum, id) => sum + value(id), 0n), value('net_aged_receivable'));
 assert.equal(['receivables_current_amount', 'receivables_overdue_1_30_amount', 'receivables_overdue_31_90_amount', 'receivables_overdue_over_90_amount', 'receivables_missing_due_date_amount'].reduce((sum, id) => sum + value(id), 0n), value('receivables_gross_outstanding_amount'));
 assert.match(record('aged_at_date').businessDate.en, /accounting/u);
 assert.match(record('receivables_current_amount').definition.en, /no missing-date fallback/u);
 for (const metric of pack.metrics.filter(item => item.state === 'reconciled_awaiting_approval')) { assert.equal(metric.published, false); assert.match(metric.notes.en, /unverified|verified/u); }
});
test('verified Finance identities and standing decision bind the exact published cutoff family',()=>{
 const evidence=pack.financeIdentityEvidence;
 assert.equal(evidence.identityVerified,true);assert.equal(evidence.readOnly,true);
 assert.equal(evidence.exactCases,evidence.customerCount*7);assert.equal(evidence.exactCases,15519);
 for(const field of ['deltaCases','ambiguous','unmatched','unexpected'])assert.equal(evidence[field],0);
 assert.equal(evidence.financeApproval,'standing_approval_applied_to_exact_published_family');
 assert.equal(pack.financeStandingApproval.date,'2026-10-07');
 assert.equal(pack.financeStandingApproval.approverGroup,'Finance');
 const metric=record('net_aged_receivable');assert.equal(metric.published,true);assert.equal(metric.approvalRecord.owner,'Finance');assert.equal(metric.approvalRecord.approvalDate,'2026-10-07');
});

test('canonical metric help and both dictionary projections share business meaning and formula; Finance policy retains its limits', async()=>{
 const {semanticCatalog}=await import('../../../packages/domain/src/catalog.ts');
 const rendered=renderPack(pack);
 for(const metric of pack.metrics.filter(item=>item.canonicalId)) {
  const canonical=semanticCatalog[metric.canonicalId];
  for(const locale of ['en','ar']) {
   assert.ok(rendered[`el-dabboos-metric-dictionary-${locale}.md`].includes(canonical.help.definition[locale]));
   assert.ok(rendered[`el-dabboos-metric-dictionary-${locale}.md`].includes(canonical.help.formula[locale]));
   if(metric.approval==='standing_finance'){assert.equal(metric.definition[locale],canonical.help.definition[locale]);assert.equal(metric.formula[locale],canonical.help.formula[locale]);}
  }
 }
 assert.equal(pack.financeStandingApproval.decisionType,'standing metric-design approval');
 assert.equal(pack.financeStandingApproval.limitations.en.length,4);
 assert.match(pack.financeStandingApproval.limitations.en.join(' '),/explicit Finance confirmation/u);
});
