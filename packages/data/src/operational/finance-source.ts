import type {Pool} from 'pg';
import type {OdooSnapshotLease} from '../odoo/snapshot.ts';
import type {OdooSourceConfig} from '../odoo/config.ts';
import {receivableMeasures} from '../receivable-aging.ts';
import {receivableSummarySql,receivableReportBaseSql} from './receivable-summary-sql.ts';
import {receivablesControlBaseSql} from './receivable-control-sql.ts';
import {odooAgedReportBaseSql} from './receivable-report-sql.ts';
import {validateSnapshotQuality} from './receivables.ts';
import type {FinanceSnapshotCustomer} from './finance-publication.ts';
const actualSql=receivableSummarySql.replace('SELECT coalesce','SELECT partner_id::text customer_id,count(*)::text component_count,coalesce')+' WHERE residual<>0 GROUP BY partner_id ORDER BY partner_id';
const buckets=['true',"bucket='current'","bucket='1_30'","bucket='31_60'","bucket='61_90'","bucket='91_120'","bucket='older'","bucket<>'current'",'residual>0','residual<0'];
const expectedSql=odooAgedReportBaseSql.replace(receivablesControlBaseSql,receivableReportBaseSql)+` SELECT partner_id::text customer_id,count(*)::text component_count,
 ${receivableMeasures.map((measure,index)=>`coalesce(sum(residual) FILTER(WHERE ${buckets[index]}),0)::numeric(30,6)::text ${measure}`).join(',')}
 FROM report_components GROUP BY partner_id ORDER BY partner_id`;
/** Explicit operator extraction; both independent reconstructions share one retained RR/RO source snapshot. */
export async function readFinanceCustomers(pool:Pool,lease:OdooSnapshotLease,config:OdooSourceConfig,cutoff:string):Promise<FinanceSnapshotCustomer[]> {
 if(config.companyIds.join(',')!=='1')throw new Error('Approved Finance company scope required');
 await validateSnapshotQuality(pool,lease,config,cutoff);
 const client=await pool.connect();
 try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await lease.importInto(client);
  await client.query("SELECT set_config('statement_timeout',$1,true)",[String(config.statementTimeoutMs)]);
  const actual=(await client.query(actualSql,[1,cutoff])).rows,expected=(await client.query(expectedSql,[1,cutoff])).rows;
  if(actual.length!==expected.length||actual.length>50000)throw new Error('Complete bounded Finance customer controls required');
  const labels=(await client.query('SELECT id::text id,name FROM res_partner WHERE id=ANY($1::bigint[]) AND (company_id IS NULL OR company_id=$2::int)',[actual.flatMap(row=>row.customer_id===null?[]:[row.customer_id]),1])).rows;
  const labelById=new Map(labels.map(row=>[row.id,typeof row.name==='string'?row.name:JSON.stringify(row.name)]));
  const expectedById=new Map(expected.map(row=>[row.customer_id,row]));
  const customers=actual.map(row=>{
   const control=expectedById.get(row.customer_id);if(!control||control.component_count!==row.component_count)throw new Error('Exact Finance customer population required');
   const identity=row.customer_id===null?'unassigned':`${config.sourceId}:${row.customer_id}`;
   return {id:identity,...(labelById.has(row.customer_id)?{label:labelById.get(row.customer_id)!}:{}),actual:Object.fromEntries(receivableMeasures.map(measure=>[measure,row[measure]])),expected:Object.fromEntries(receivableMeasures.map(measure=>[measure,control[measure]]))};
  });
  await lease.assertAlive();await client.query('COMMIT');return customers;
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

/** Independent company reconstruction imports the SAME retained source snapshot as customer controls. */
export async function readFinanceCompanySummary(pool:Pool,lease:OdooSnapshotLease,config:OdooSourceConfig,cutoff:string):Promise<Record<string,string>> {
 if(config.companyIds.join(',')!=='1')throw new Error('Approved Finance company scope required');
 const client=await pool.connect();
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await lease.importInto(client);
  await client.query("SELECT set_config('statement_timeout',$1,true)",[String(config.statementTimeoutMs)]);
  const sql=odooAgedReportBaseSql.replace(receivablesControlBaseSql,receivableReportBaseSql)+` SELECT
   ${receivableMeasures.map((measure,index)=>`coalesce(sum(residual) FILTER(WHERE ${buckets[index]}),0)::numeric(30,6)::text ${measure}`).join(',')}
   FROM report_components`;
  const totals=(await client.query(sql,[1,cutoff])).rows[0];
  await lease.assertAlive();await client.query('COMMIT');return totals;
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
