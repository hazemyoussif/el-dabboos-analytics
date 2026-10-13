import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import writeExcelFile from 'write-excel-file/universal';
import { semanticCatalog, tenantProfiles } from '@el-dabboos/domain';
import type { DashboardSpec } from '@el-dabboos/domain';
import type { DashboardExecutionResult, WidgetExecution } from '@el-dabboos/application';
import { dashboardWorkbook, tableWorkbook } from '../src/export/excel-data.ts';

const widget: DashboardSpec['widgets'][number] = { id: 'table', type: 'table', dimension: 'customer', title: { en: "=SUM(A1) / [customers]", ar: 'العملاء' }, series: [{ id: 'revenue', metric: 'revenue' }, { id: 'profit', metric: 'gross_profit' }] };
const entry: WidgetExecution = {
  status: 'partial', seriesResults: { revenue: { status: 'success', result: { metric: 'revenue', groupBy: 'customer', rows: [], metadata: { sourceId: 'synthetic', executedAt: '2026-10-13T00:00:00Z', metricType: 'currency', semantics: 'additive', dimensionLabels: { customer1: '=HYPERLINK("https://example.test")' }, snapshotAsOf: '2026-09-30' } } }, profit: { status: 'error', error: { code: 'SERIES_EXECUTION_FAILED', message: 'SELECT secret FROM table' } } },
  alignedRows: [{ key: 'customer1', series: { revenue: { value: 1234.56789, comparisonValue: 1000, absoluteChange: 234.56789, percentageChange: 23.456789, rank: 1 }, profit: null } }, { key: null, series: { revenue: { value: 0 }, profit: null } }],
};
const dashboard: DashboardSpec = { schemaVersion: 2, locale: 'en', layout: { columns: 3 }, id: 'export', title: { en: 'Dashboard', ar: 'لوحة' }, filters: {}, widgets: [widget] };
const execution: DashboardExecutionResult = { dashboard, widgetResults: { table: entry }, metadata: { executedAt: '2026-10-13T00:00:00Z', succeeded: 1, failed: 0, succeededSeries: 1, failedSeries: 1, effectiveFilters: { dateRange: { from: '2026-01-01', to: '2026-10-13' }, dimensions: [{ dimension: 'customer', values: ['customer1'] }] } } };
const context = { catalog: semanticCatalog, locale: 'en' as const, profile: tenantProfiles['demo-iq']!, exportMetadata: execution.metadata };

test('Excel export preserves precise numbers, blanks, comparison data, labels, active dates and partial status', async () => {
  const original = structuredClone(execution);
  const result = tableWorkbook(widget, entry, context);
  assert.ok(result.data[0]!.some(row => row.includes('2026-01-01 — 2026-10-13')));
  assert.ok(result.data[0]!.some(row => row.includes('customer1')));
  assert.ok(result.data[0]!.some(row => row.includes('Partial')));
  assert.ok(result.data[0]!.some(row => row.includes('2026-09-30')));
  const values = result.data[0]!.find(row => row[0] === '=HYPERLINK("https://example.test")')!;
  assert.deepEqual(values.slice(1), [1234.56789, 1000, 234.56789, 23.456789, 1, null]);
  assert.ok(!JSON.stringify(result).includes('SELECT secret'));
  assert.deepEqual(execution, original);
  const blob = await writeExcelFile(result.data, { sheets: result.sheets, rightToLeft: result.rightToLeft });
  assert.equal(blob.type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.equal(Buffer.from(await blob.arrayBuffer()).subarray(0, 2).toString(), 'PK');
});

test('dashboard workbook retains empty and failed cards, one safe dashboard sheet and Arabic direction', () => {
  const spec = { ...dashboard, widgets: [widget, { ...widget, id: 'empty' }, { ...widget, id: 'failed' }] };
  const result = dashboardWorkbook({ ...execution, widgetResults: { table: entry, empty: { status: 'success', seriesResults: {}, alignedRows: [] } } }, spec, { ...context, locale: 'ar' });
  assert.equal(result.data.length, 1); assert.equal(result.sheets.length, 1);
  assert.ok(result.sheets.every(name => name.length <= 31 && !/[\\/:?*[\]]/.test(name)));
  assert.equal(result.rightToLeft, true);
  assert.equal(result.data[0]!.filter(row => row.length === 1 && row[0] === 'العملاء').length, 3);
  assert.ok(result.data[0]!.some(row => row.includes('لا توجد صفوف')));
  assert.ok(result.data[0]!.some(row => row.includes('غير متاح')));
  assert.equal(result.fileName, 'لوحة.xlsx');
});

test('renderers expose localized Excel controls and hide empty table exports', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { WidgetCard, DashboardRenderer } = await server.ssrLoadModule('/src/Renderer.tsx');
    for (const locale of ['en', 'ar'] as const) {
      const props = { locale, catalog: semanticCatalog, profile: tenantProfiles['demo-iq'], widget, entry };
      const markup = renderToStaticMarkup(createElement(WidgetCard, props));
      assert.ok(markup.includes(locale === 'ar' ? 'تصدير الجدول إلى Excel' : 'Export table to Excel'));
      const empty = renderToStaticMarkup(createElement(WidgetCard, { ...props, entry: { ...entry, alignedRows: [] } }));
      assert.ok(!empty.includes('Export table to Excel'));
      const full = renderToStaticMarkup(createElement(DashboardRenderer, { ...props, execution }));
      assert.ok(full.includes(locale === 'ar' ? 'تصدير اللوحة إلى Excel' : 'Export dashboard to Excel'));
    }
  } finally { await server.close(); }
});


test('percentage contribution exports use percent units rather than the underlying revenue currency', () => {
  const revenue = entry.seriesResults.revenue;
  assert.equal(revenue?.status, 'success');
  if (revenue?.status !== 'success') throw new Error('Synthetic fixture required');
  const contribution = { ...entry, seriesResults: { ...entry.seriesResults, revenue: { ...revenue, result: { ...revenue.result, metadata: { ...revenue.result.metadata, metricType: 'percentage' as const, unit: '%' } } } } };
  const result = tableWorkbook(widget, contribution, context);
  assert.ok(result.data[0]!.some(row => row.includes('Revenue (%)')));
  assert.ok(!result.data[0]!.some(row => row.includes('Revenue (IQD)')));
});

test('every additional table exposes Excel export in both languages, including loaded drill details', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { DetailTable } = await server.ssrLoadModule('/src/DrillDetails.tsx');
    const { AdministrationTable } = await server.ssrLoadModule('/src/admin/controls.tsx');
    const { AnswerVisual } = await server.ssrLoadModule('/src/analyst/AnswerVisual.tsx');
    const { ManagementInfo } = await server.ssrLoadModule('/src/reports/ManagementReports.tsx');
    const page = { rows: [{ date: '2026-09-30', customer: '=customer', salesperson: null, businessLine: null, documentType: null, status: null, measure: 'revenue', amount: '123456789012345678.123456789', currency: 'IQD' }], hasMore: true, nextCursor: 'next', release: 'release', grain: 'customer_snapshot', bases: {}, value: null };
    for (const locale of ['en', 'ar'] as const) {
      const profile = tenantProfiles['demo-iq'];
      const controls = [
        createElement(DetailTable, { page, locale, profile }),
        createElement(AdministrationTable, { locale }, createElement('tr', {}, createElement('td', {}, 'Synthetic user'))),
        createElement(AnswerVisual, { locale, profile, panel: { query: { metric: 'revenue', groupBy: 'customer' }, form: 'ranking', result: { rows: [{ key: 'one', value: 1 }, { key: 'two', value: null }], metadata: { metricType: 'currency' } }, omittedRows: 3 } }),
        createElement(ManagementInfo, { page: 'data-status', locale, profile, published: { mode: 'certified', releases: [{ datasetId: 'synthetic', certificationReference: 'test', capabilities: [{ metric: 'revenue', dimensions: [] }] }] }, metadata: null, review: null, reviewLoading: false, reviewError: false, onRetry() {} }),
      ];
      for (const control of controls) assert.ok(renderToStaticMarkup(control).includes(locale === 'ar' ? 'تصدير الجدول إلى Excel' : 'Export table to Excel'));
      assert.ok(renderToStaticMarkup(controls[0]!).includes(locale === 'ar' ? 'الصفوف المحملة' : 'Exports loaded rows'));
    }
  } finally { await server.close(); }
});
