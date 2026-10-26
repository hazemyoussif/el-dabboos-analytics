import {measureOperationalWork} from '../operational/progress.ts';
import type {OperationalProgressObserver} from '../operational/progress.ts';
import type {Pool} from 'pg';
import type {AllocationLinks} from '../operational/contracts.ts';
import type {OdooSourceConfig} from '../odoo/config.ts';
import type {OdooSnapshotLease} from '../odoo/snapshot.ts';
import {odooSourceIncrementalWindow} from '../odoo/source-incremental-window.ts';

export interface CommandAllocationChange {id:string;from:string;createdAt:string;updatedAt:string;links:AllocationLinks}

/** Financial facts stay in the recipe reader; this retains only actual source dependency edges. */
export async function* commandAllocationChanges(scope:{pool:Pool;config:OdooSourceConfig;lease:OdooSnapshotLease;cutoff:string;initialize?:boolean;observe?:OperationalProgressObserver}):AsyncGenerator<CommandAllocationChange[]>{
 const lower=(await odooSourceIncrementalWindow(scope.pool,scope.config,{cursor:{cutoff:scope.cutoff,objects:{}},cutoff:scope.lease.evidence.sourceAsOf})).modificationFrom;
 const client=await scope.pool.connect();let broken=false;const onError=()=>{broken=true;};client.on('error',onError);
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await scope.lease.importInto(client);
  await client.query("SELECT set_config('statement_timeout',$1,true)",[String(scope.config.statementTimeoutMs)]);
  await client.query(`DECLARE command_allocation_links NO SCROLL CURSOR FOR
   SELECT partial.id::text id,least(partial.max_date,debit.date,credit.date)::text "from",
    to_char(partial.create_date,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') "createdAt",
    to_char(partial.write_date,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') "updatedAt",
    (debit.company_id<>partial.company_id OR credit.company_id<>partial.company_id) invalid,
    jsonb_build_object('debitLineId',partial.debit_move_id::text,'creditLineId',partial.credit_move_id::text,
     'debitMoveId',debit.move_id::text,'creditMoveId',credit.move_id::text) links
   FROM account_partial_reconcile partial JOIN account_move_line debit ON debit.id=partial.debit_move_id
   JOIN account_move_line credit ON credit.id=partial.credit_move_id
   WHERE partial.company_id=ANY($1::int[]) AND ($4::boolean OR partial.write_date BETWEEN $2::timestamp AND $3::timestamptz AT TIME ZONE 'UTC')`,
   [scope.config.companyIds,lower,scope.lease.evidence.sourceAsOf,scope.initialize??false]);
  for(;;){
   const rows=(await measureOperationalWork(scope.observe,'source_allocation_dependencies',()=>client.query(`FETCH FORWARD ${scope.config.batchSize} FROM command_allocation_links`))).rows;
   await scope.lease.assertAlive();if(!rows.length)break;
   if(rows.some(row=>row.invalid!==false))throw new Error('Allocation dependency company scope conflict');
   yield rows as CommandAllocationChange[];
  }
 }finally{try{await client.query('ROLLBACK');}catch{broken=true;}finally{client.removeListener('error',onError);client.release(broken);}}
}

/** Recipes and their shared dependency graph can advance independently. */
export function commandAllocationDiscoveryCutoff(recipeCutoff:string,graphCutoff:Date|null){
 return new Date(Math.min(Date.parse(recipeCutoff),graphCutoff?.getTime()??Date.parse(recipeCutoff))).toISOString();
}
