import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import type { AnalyticsContext, AnalyticsQuery, AnalyticsRepository, AnalyticsResult, DimensionId, MetricId } from '@el-dabbous/domain';
import { validateQuery } from '@el-dabbous/domain';
import { executeFacts } from './engine.ts';
import type { AnalyticsFact } from './facts.ts';

export function createSqliteSchema(db: DatabaseSync): void {
  db.exec(readFileSync(fileURLToPath(new URL('./schema.sql', import.meta.url)), 'utf8'));
}
export function insertFacts(db: DatabaseSync, facts: readonly AnalyticsFact[]): void {
  const insert = db.prepare('INSERT INTO analytics_facts (tenant_id, metric_id, event_date, value, dimensions_json) VALUES (?, ?, ?, ?, ?)');
  db.exec('BEGIN');
  try {
    for (const fact of facts) insert.run(fact.tenantId, fact.metricId, fact.date, fact.value, JSON.stringify(fact.dimensions));
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
export class SqliteAnalyticsRepository implements AnalyticsRepository {
  private readonly select;
  constructor(private readonly db: DatabaseSync) {
    this.select = db.prepare('SELECT tenant_id, metric_id, event_date, value, dimensions_json FROM analytics_facts WHERE tenant_id = ? AND metric_id = ?');
  }
  async execute(query: AnalyticsQuery, context: AnalyticsContext): Promise<AnalyticsResult> {
    validateQuery(query, context);
    const facts = this.select.all(context.tenantId, query.metric).map(row => ({
      tenantId: String(row.tenant_id), metricId: String(row.metric_id) as MetricId,
      date: String(row.event_date), value: Number(row.value),
      dimensions: JSON.parse(String(row.dimensions_json)) as Partial<Record<DimensionId, string>>,
    }));
    return executeFacts(facts, query, context);
  }
}
