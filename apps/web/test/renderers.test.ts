import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { semanticCatalog, tenantProfiles, widgetTypes } from '@el-dabboos/domain';
import type { DashboardWidget } from '@el-dabboos/domain';
import type { WidgetExecution } from '@el-dabboos/application';

test('every renderer has EN/AR titles and accessible chart values; composition rejects negative areas', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { WidgetCard } = await server.ssrLoadModule('/src/Renderer.tsx');
    for (const locale of ['en', 'ar'] as const) for (const type of widgetTypes) {
      const widget: DashboardWidget = { id: 'chart', type, title: { en: 'Revenue chart', ar: 'رسم الإيرادات' }, series: [{ id: 'revenue', metric: 'revenue' }], ...(type !== 'kpi' ? { dimension: type === 'area' ? 'month' : 'branch' } : {}) };
      if (type === 'combo') widget.series.push({ id: 'profit', metric: 'gross_profit' });
      const entry: WidgetExecution = { status: 'success', seriesResults: {}, alignedRows: [{ key: 'branch-1', series: { revenue: { value: 100 }, profit: { value: 30 } } }] };
      const html = renderToStaticMarkup(createElement(WidgetCard, { widget, entry, locale, catalog: semanticCatalog, profile: tenantProfiles['demo-iq'] }));
      assert.ok(html.includes(locale === 'ar' ? 'رسم الإيرادات' : 'Revenue chart')); assert.ok(html.includes(`widget-${type}`)); assert.ok(html.includes('aria-haspopup="dialog"')); assert.ok(html.includes(semanticCatalog.revenue.help.shortDefinition[locale]));
      if (!['kpi', 'table'].includes(type)) assert.ok(html.includes(locale === 'ar' ? 'عرض قيم الرسم' : 'View chart values'));
      if (['pie', 'treemap'].includes(type)) {
        entry.alignedRows[0]!.series.revenue = { value: -10 };
        const rejected = renderToStaticMarkup(createElement(WidgetCard, { widget, entry, locale, catalog: semanticCatalog, profile: tenantProfiles['demo-iq'] }));
        assert.ok(rejected.includes('role="status"')); assert.ok(!rejected.includes('recharts-responsive-container'));
      }
    }
  } finally { await server.close(); }
});
