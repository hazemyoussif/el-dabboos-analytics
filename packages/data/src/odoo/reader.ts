import type { Pool } from 'pg';
import type { SourceBatch, SourceBatchReader, SourceReadRequest } from '@el-dabboos/domain';
import { validDateRange } from '@el-dabboos/domain';
import type { OdooSourceConfig } from './config.ts';
import type { OdooSourceRow } from './rows.ts';
import { odooCursor, odooRevision, parseOdooCursor, sourceTimestamp } from './cursor.ts';
import { odooTransactionSql } from './sql.ts';
export interface OdooReadScope {
  object: 'sale_order'|'account_move'; from: string; to: string; timeZone: string;
  sourceAsOf: string; frozenRevision: string; mode?: 'backfill'|'incremental';
  /** Operator-certified immutable replica/snapshot. Must survive process restarts. */
  freezeReference: string;
}
/** Source is SELECT-only, one bounded read-only transaction per page. Tunnel ownership stays external. */
export class OdooPostgresSourceBatchReader implements SourceBatchReader<OdooSourceRow> {
  constructor(private readonly pool: Pool,private readonly config: OdooSourceConfig,private readonly scope: OdooReadScope) {
    if (!validDateRange({ from: scope.from,to: scope.to }) || !scope.freezeReference.trim() || !Number.isFinite(Date.parse(scope.sourceAsOf))) throw new Error('Certified source freeze and period required');
  }
  async readBatch(request: SourceReadRequest): Promise<SourceBatch<OdooSourceRow>> {
    this.validateRequest(request);
    const tokenStart = request.cursor ?? request.watermark;
    const cursor = tokenStart ? parseOdooCursor(tokenStart) : { writeDate: '1970-01-01 00:00:00.000000',id: '0' };
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      await client.query("SELECT set_config('statement_timeout',$1,true),set_config('TimeZone','UTC',true)",[String(this.config.statementTimeoutMs)]);
      const result = await client.query(odooTransactionSql(this.scope.object),[request.companyIds,this.scope.from,this.scope.to,cursor.writeDate,cursor.id,request.limit+1,this.scope.timeZone,this.scope.mode==='incremental']);
      const rows = result.rows.slice(0,request.limit).map(row => ({ ...row,object: this.scope.object } as OdooSourceRow));
      if (rows.some(row => !request.companyIds.includes(row.company_id))) throw new Error('Source company isolation failure');
      await client.query('COMMIT');
      const last = rows.at(-1);
      const token = last ? odooCursor(last.write_date,last.id) : request.cursor;
      return { tenantId: request.tenantId,sourceId: request.sourceId,companyIds: request.companyIds,sourceAsOf: this.scope.sourceAsOf,frozenRevision: this.scope.frozenRevision,
        rows: rows.map(row => ({ object: row.object,recordId: row.id,version: row.write_date,revision: odooRevision(row.write_date),sourceUpdatedAt: sourceTimestamp(row.write_date),change: 'upsert',payload: row })),
        completeness: this.scope.mode==='incremental' ? 'incremental' : 'complete_scope',deletionEvidence: 'unavailable',...(result.rows.length>request.limit && token ? { nextCursor: token } : token ? { watermarkEnd: token } : {}) };
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  private validateRequest(request: SourceReadRequest): void {
    if (request.tenantId!==this.config.tenantId || request.sourceId!==this.config.sourceId || !request.companyIds.length || request.companyIds.some(company => !this.config.companyIds.includes(company))) throw new Error('Unauthorized Odoo source scope');
    if (!Number.isInteger(request.limit) || request.limit<1 || request.limit>this.config.batchSize || request.limit>1000) throw new Error('Invalid Odoo page limit');
    if (request.frozenRevision!==this.scope.frozenRevision || request.watermark!==undefined && this.scope.mode!=='incremental') throw new Error('Source freeze mismatch or unsupported extraction mode');
  }
}
