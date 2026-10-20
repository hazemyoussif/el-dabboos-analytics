import type { Pool } from 'pg';
import type { SourceBatch, SourceBatchReader, SourceReadRequest } from '@el-dabboos/domain';
import { validDateRange } from '@el-dabboos/domain';
import type { OdooSourceConfig } from './config.ts';
import type { OdooSourceRow } from './rows.ts';
import {odooLookupRoles} from './lookup-types.ts';
import type {OdooLookupChanges} from './lookup-types.ts';
import { odooCursor, odooRevision, parseOdooCursor, sourceTimestamp } from './cursor.ts';
import {odooPartnerProjection} from './partner-projection.ts';
import { odooTransactionSql } from './sql.ts';
import type { OdooSnapshotLease } from './snapshot.ts';
export interface OdooReadScope {
  object: 'sale_order'|'account_move'; from: string; to: string; timeZone: string;
  sourceAsOf: string; frozenRevision: string; mode?: 'backfill'|'incremental';
  /** Durable identity of the actual source snapshot; never an import token. */
  freezeReference: string;
  /** Trusted job window; inclusive overlap lower bound, unrelated to business dates. */
  modificationFrom?: string;
  lookupChanges?:OdooLookupChanges;
}
/** SELECT-only source reads: checkpointed pages or a transaction-scoped stream. Connection routing stays external. */
export class OdooPostgresSourceBatchReader implements SourceBatchReader<OdooSourceRow> {
  constructor(private readonly pool: Pool,private readonly config: OdooSourceConfig,private readonly scope: OdooReadScope,private readonly snapshot: OdooSnapshotLease) {
    if(scope.modificationFrom) {
      parseOdooCursor(odooCursor(scope.modificationFrom,'1'));
      if(Date.parse(sourceTimestamp(scope.modificationFrom))>Date.parse(scope.sourceAsOf))throw new Error('Incremental window exceeds source cutoff');
    }
    if (!validDateRange({ from: scope.from,to: scope.to }) || !scope.freezeReference.trim() || !Number.isFinite(Date.parse(scope.sourceAsOf))) throw new Error('Certified source freeze and period required');
  }
  async readBatch(request: SourceReadRequest): Promise<SourceBatch<OdooSourceRow>> {
    this.validateRequest(request);
    this.snapshot.assertScope(this.scope,this.config);
    const tokenStart = request.cursor ?? request.watermark;
    const cursor = tokenStart ? parseOdooCursor(tokenStart) : { writeDate: this.scope.modificationFrom ?? '1970-01-01 00:00:00.000000',id: '0' };
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      await this.snapshot.importInto(client);
      await client.query("SELECT set_config('statement_timeout',$1,true),set_config('TimeZone','UTC',true)",[String(this.config.statementTimeoutMs)]);
      const partnerFields=await odooPartnerProjection(this.pool,client);
      const result = await client.query(odooTransactionSql(this.scope.object,partnerFields,'page',!!this.scope.lookupChanges),[request.companyIds,this.scope.from,this.scope.to,cursor.writeDate,cursor.id,request.limit+1,this.scope.timeZone,this.scope.mode==='incremental',this.scope.sourceAsOf,...this.lookupParameters()]);
      const rows = result.rows.slice(0,request.limit).map(row => ({ ...row,object: this.scope.object } as OdooSourceRow));
      if (rows.some(row => !request.companyIds.includes(row.company_id))) throw new Error('Source company isolation failure');
      await this.snapshot.assertAlive();
      await client.query('COMMIT');
      const last = rows.at(-1);
      const token = last ? odooCursor(last.write_date,last.id) : request.cursor;
      return { tenantId: request.tenantId,sourceId: request.sourceId,companyIds: request.companyIds,sourceAsOf: this.scope.sourceAsOf,frozenRevision: this.scope.frozenRevision,
        rows: rows.map(row => ({ object: row.object,recordId: row.id,version: row.write_date,revision: odooRevision(row.write_date),sourceUpdatedAt: sourceTimestamp(row.write_date),change: 'upsert',payload: row })),
        completeness: this.scope.mode==='incremental' ? 'incremental' : 'complete_scope',deletionEvidence: 'unavailable',...(result.rows.length>request.limit && token ? { nextCursor: token } : token ? { watermarkEnd: token } : {}) };
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  /** Execute discovery once, then fetch bounded pages within the same RR/RO snapshot.
   * The transaction-scoped cursor is never retained across jobs or source leases.
   */
  async *readBatches(request:SourceReadRequest):AsyncGenerator<SourceBatch<OdooSourceRow>> {
    this.validateRequest(request);
    this.snapshot.assertScope(this.scope,this.config);
    const tokenStart=request.cursor??request.watermark;
    const cursor=tokenStart?parseOdooCursor(tokenStart):{writeDate:this.scope.modificationFrom??'1970-01-01 00:00:00.000000',id:'0'};
    const client=await this.pool.connect();let committed=false;
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      await this.snapshot.importInto(client);
      await client.query("SELECT set_config('statement_timeout',$1,true),set_config('TimeZone','UTC',true)",[String(this.config.statementTimeoutMs)]);
      const partnerFields=await odooPartnerProjection(this.pool,client);
      await client.query(`DECLARE odoo_source_records NO SCROLL CURSOR WITHOUT HOLD FOR ${odooTransactionSql(this.scope.object,partnerFields,'stream',!!this.scope.lookupChanges)}`,
        [request.companyIds,this.scope.from,this.scope.to,cursor.writeDate,cursor.id,this.scope.timeZone,this.scope.mode==='incremental',this.scope.sourceAsOf,...this.lookupParameters()]);
      let pending:OdooSourceRow[]=[];
      let position=tokenStart;
      while(true) {
        await this.snapshot.assertAlive();
        // FETCH accepts an integer literal. The validated request bounds it to 1..1001.
        const result=await client.query(`FETCH FORWARD ${request.limit+1-pending.length} FROM odoo_source_records`);
        const fetched=[...pending,...result.rows.map(row=>({...row,object:this.scope.object} as OdooSourceRow))];
        if(fetched.some(row=>!request.companyIds.includes(row.company_id)))throw new Error('Source company isolation failure');
        const rows=fetched.slice(0,request.limit),more=fetched.length>request.limit;
        pending=fetched.slice(request.limit);
        await this.snapshot.assertAlive();
        const last=rows.at(-1);
        if(last)position=odooCursor(last.write_date,last.id);
        yield {tenantId:request.tenantId,sourceId:request.sourceId,companyIds:request.companyIds,sourceAsOf:this.scope.sourceAsOf,frozenRevision:this.scope.frozenRevision,
          rows:rows.map(row=>({object:row.object,recordId:row.id,version:row.write_date,revision:odooRevision(row.write_date),sourceUpdatedAt:sourceTimestamp(row.write_date),change:'upsert',payload:row})),
          completeness:this.scope.mode==='incremental'?'incremental':'complete_scope',deletionEvidence:'unavailable',
          ...(position?more?{nextCursor:position}:{watermarkEnd:position}:{})};
        if(!more)break;
      }
      await this.snapshot.assertAlive();await client.query('COMMIT');committed=true;
    }finally{
      try{if(!committed)await client.query('ROLLBACK');}finally{client.release();}
    }
  }
  private lookupParameters(){return this.scope.lookupChanges?odooLookupRoles.map(role=>this.scope.lookupChanges![role]):[];}
  private validateRequest(request: SourceReadRequest): void {
    if (request.tenantId!==this.config.tenantId || request.sourceId!==this.config.sourceId || !request.companyIds.length || request.companyIds.some(company => !this.config.companyIds.includes(company))) throw new Error('Unauthorized Odoo source scope');
    if (!Number.isInteger(request.limit) || request.limit<1 || request.limit>this.config.batchSize || request.limit>1000) throw new Error('Invalid Odoo page limit');
    if (request.frozenRevision!==this.scope.frozenRevision || request.watermark!==undefined && this.scope.mode!=='incremental') throw new Error('Source freeze mismatch or unsupported extraction mode');
  }
}
