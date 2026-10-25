import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { verifyOdooSourceIdentity } from './identity.ts';
import type { OdooCredentialPolicy } from './identity.ts';
import type {ObservedCopyDescriptor} from '../odoo-orm/stage-config.ts';
import {assertOwnedLeaseScope,assertOwnedReader,readOwnedSnapshot} from '../odoo-orm/stage-lease-evidence.ts';

export class OdooSnapshotUnavailable extends Error {
  constructor(){super('Source snapshot lease lost or expired');this.name='OdooSnapshotUnavailable';}
}

export interface OdooSnapshotEvidence {
  sourceAsOf: string; frozenRevision: string; freezeReference: string;
  descriptor: string;
}
/** One dedicated owner connection. Export capability stays private and is never persisted. */
export class OdooSnapshotLease {
  readonly #token: string;
  readonly evidence: Readonly<OdooSnapshotEvidence>;
  private alive = true;
  private readonly deadline: number;
  private readonly timer: ReturnType<typeof setTimeout>;
  private closing: Promise<void> | undefined;
  private readonly onError = () => { this.alive = false; };
  private constructor(private readonly owner: PoolClient,token: string,readonly identity: Readonly<{ tenantId: string; sourceId: string }>,evidence: OdooSnapshotEvidence,durationMs: number) {
    this.#token = token;
    this.evidence = Object.freeze(evidence);
    this.deadline = performance.now()+durationMs;
    owner.on('error',this.onError);
    this.timer = setTimeout(() => { void this.close(); },durationMs);
    this.timer.unref();
  }
  static async open(pool: Pool,identity: { tenantId: string; sourceId: string },durationMs: number,credentialPolicy: OdooCredentialPolicy = 'least_privilege'): Promise<OdooSnapshotLease> {
    if (!Number.isInteger(durationMs) || durationMs<1 || durationMs>600000) throw new Error('Invalid source snapshot duration');
    await verifyOdooSourceIdentity(pool,credentialPolicy);
    const owner = await pool.connect();
    const started = performance.now();
    try {
      await owner.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      await owner.query("SELECT set_config('statement_timeout',$1,true),set_config('idle_in_transaction_session_timeout',$1,true)",[String(durationMs)]);
      const row = (await owner.query('SELECT transaction_timestamp() source_as_of,pg_export_snapshot() token,pg_current_snapshot()::text descriptor')).rows[0];
      if (!/^[0-9A-Fa-f]+-[0-9A-Fa-f]+-\d+$/.test(row.token) || typeof row.descriptor!=='string') throw new Error('Invalid PostgreSQL snapshot evidence');
      const digest = createHash('sha256').update(JSON.stringify([identity.sourceId,row.descriptor])).digest('hex');
      const remaining = durationMs-(performance.now()-started);
      if (remaining<=0) throw new Error('Source snapshot lease expired during acquisition');
      return new OdooSnapshotLease(owner,row.token,Object.freeze({ tenantId: identity.tenantId,sourceId: identity.sourceId }),{ sourceAsOf: row.source_as_of.toISOString(),descriptor: row.descriptor,frozenRevision: `pg-mvcc:${digest}`,freezeReference: `pg-lease:${randomUUID()}` },remaining);
    } catch (error) {
      try { await owner.query('ROLLBACK'); } finally { owner.release(true); }
      throw error;
    }
  }
  /** The retained snapshot is of a sealed local input copy, never claimed as an ERP-wide MVCC snapshot. */
  static async openObservedCopy(pool:Pool,identity:{tenantId:string;sourceId:string},durationMs:number,copy:ObservedCopyDescriptor):Promise<OdooSnapshotLease>{
    assertOwnedLeaseScope(identity,durationMs,copy);
    const owner=await pool.connect();
    const started=performance.now();
    try{
      await owner.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      await owner.query("SELECT set_config('statement_timeout',$1,true),set_config('idle_in_transaction_session_timeout',$1,true)",[String(durationMs)]);
      await assertOwnedReader(owner,copy.schema);
      const snapshot=await readOwnedSnapshot(owner,copy);
      const remaining=durationMs-(performance.now()-started);
      if(remaining<=0)throw new Error('Owned input lease expired');
      return new OdooSnapshotLease(owner,snapshot.token,Object.freeze({...identity}),{sourceAsOf:copy.sourceAsOf,descriptor:snapshot.descriptor,
        frozenRevision:`orm-observed-copy-v1:${copy.fingerprint}`,freezeReference:`api-copy:${copy.schema}`},remaining);
    }catch(error){try{await owner.query('ROLLBACK');}finally{owner.release(true);}throw error;}
  }
  assertScope(scope: Pick<OdooSnapshotEvidence,'sourceAsOf'|'frozenRevision'|'freezeReference'>,identity: { tenantId: string; sourceId: string }): void {
    this.requireAlive();
    if (identity.tenantId!==this.identity.tenantId || identity.sourceId!==this.identity.sourceId || ['sourceAsOf','frozenRevision','freezeReference'].some(key => scope[key as keyof typeof scope]!==this.evidence[key as keyof typeof scope])) throw new Error('Source snapshot scope conflict');
  }
  private requireAlive(): void {
    if (!this.alive || performance.now()>=this.deadline) throw new OdooSnapshotUnavailable();
  }
  /** Local deadline/error guard before a read; the result still requires a live-owner probe. */
  assertActive():void {this.requireAlive();}
  async assertAlive(): Promise<void> {
    this.requireAlive();
    try {
      const row = (await this.owner.query('SELECT pg_current_snapshot()::text descriptor')).rows[0];
      if (row.descriptor!==this.evidence.descriptor) throw new Error('Source snapshot changed');
      this.requireAlive();
    } catch { this.alive = false; throw new OdooSnapshotUnavailable(); }
  }
  /** Caller begins RR/RO first. Import is the first command before any source SELECT. */
  async importInto(client: PoolClient): Promise<void> {
    await this.assertAlive();
    await client.query(`SET TRANSACTION SNAPSHOT '${this.#token}'`);
    const row = (await client.query('SELECT pg_current_snapshot()::text descriptor')).rows[0];
    if (row.descriptor!==this.evidence.descriptor) throw new Error('Imported source snapshot mismatch');
    await this.assertAlive();
  }
  close(): Promise<void> {
    if (this.closing) return this.closing;
    this.alive = false;
    clearTimeout(this.timer);
    this.closing = this.rollbackOwner();
    return this.closing;
  }
  toJSON(): Readonly<OdooSnapshotEvidence> { return this.evidence; }
  private async rollbackOwner(): Promise<void> {
    try { await this.owner.query('ROLLBACK'); } catch { /* Lost owner is already unusable. */ }
    finally { this.owner.removeListener('error',this.onError); this.owner.release(true); }
  }
}
