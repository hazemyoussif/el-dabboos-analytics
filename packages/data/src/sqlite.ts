import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import type { AnalyticsContext, AnalyticsQuery, AnalyticsRepository, AnalyticsResult, DimensionId, FactMeasureId } from '@el-dabboos/domain';
import { categoricalDimensions, isFactMeasureId, requiredMeasures, semanticCatalog, validDateRange, validateQuery } from '@el-dabboos/domain';
import { executeFacts } from './engine.ts';
import type { AnalyticsFact } from './facts.ts';
import type { RepositoryMetadataOptions } from './mock.ts';

const snapshotMeasures = new Set(Object.values(semanticCatalog).flatMap(m => m.semantics.kind === 'snapshot' ? [m.semantics.measure] : []));
export function createSqliteSchema(db: DatabaseSync): void {
  db.exec(readFileSync(fileURLToPath(new URL('./schema.sql', import.meta.url)), 'utf8'));
}
export function insertFacts(db: DatabaseSync, facts: readonly AnalyticsFact[]): void {
  const insert = db.prepare('INSERT INTO analytics_facts (tenant_id, measure_id, event_date, value, entity_id, dimensions_json) VALUES (?, ?, ?, ?, ?, ?)');
  db.exec('BEGIN');
  try {
    for (const fact of facts) {
      if (!fact.tenantId.trim() || !isFactMeasureId(fact.measureId) ||
        !validDateRange({ from: fact.date, to: fact.date }) || !Number.isFinite(fact.value) ||
        (snapshotMeasures.has(fact.measureId) && !fact.entityId?.trim())) throw new Error('Invalid canonical fact');
      insert.run(fact.tenantId, fact.measureId, fact.date, fact.value, fact.entityId ?? null, JSON.stringify(fact.dimensions));
    }
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
export class SqliteAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly db: DatabaseSync, private readonly options: RepositoryMetadataOptions = {}) {}
  async listDimensionValues(dimension: DimensionId, context: AnalyticsContext): Promise<string[]> {
    if (!context.tenantId.trim() || !categoricalDimensions.includes(dimension)) throw new Error('Unsupported dimension');
    const clauses = (context.enforcedFilters ?? []).map(filter => { if (!categoricalDimensions.includes(filter.dimension)) throw new Error('Unsupported policy dimension'); return `json_extract(dimensions_json, '$.${filter.dimension}') IN (${filter.values.map(() => '?').join(', ') || 'NULL'})`; });
    const sql = `SELECT DISTINCT json_extract(dimensions_json, ?) AS value FROM analytics_facts WHERE tenant_id = ? AND json_extract(dimensions_json, ?) IS NOT NULL ${clauses.map(clause => `AND ${clause}`).join(' ')} ORDER BY value`;
    const rows = this.db.prepare(sql).all(`$.${dimension}`, context.tenantId, `$.${dimension}`, ...(context.enforcedFilters ?? []).flatMap(filter => filter.values));
    return rows.map(row => String(row.value));
  }
  async execute(query: AnalyticsQuery, context: AnalyticsContext): Promise<AnalyticsResult> {
    validateQuery(query, context);
    const measures = requiredMeasures(query.metric);
    const placeholders = measures.map(() => '?').join(', ');
    const select = this.db.prepare(`SELECT tenant_id, measure_id, event_date, value, entity_id, dimensions_json FROM analytics_facts WHERE tenant_id = ? AND measure_id IN (${placeholders})`);
    const facts = select.all(context.tenantId, ...measures).map(row => ({
      tenantId: String(row.tenant_id), measureId: String(row.measure_id) as FactMeasureId,
      date: String(row.event_date), value: Number(row.value),
      ...(row.entity_id === null ? {} : { entityId: String(row.entity_id) }),
      dimensions: JSON.parse(String(row.dimensions_json)) as Partial<Record<DimensionId, string>>,
    }));
    return executeFacts(facts, query, context, {
      sourceId: 'sqlite', executedAt: (this.options.clock?.() ?? new Date()).toISOString(),
      ...(this.options.sourceAsOf ? { sourceAsOf: this.options.sourceAsOf } : {}),
    });
  }
}
