import type { Pool } from 'pg';
import { requiredMeasures, semanticCatalog } from '@el-dabboos/domain';
import type { AnalyticsPartition,FactMeasureId } from '@el-dabboos/domain';
import type { OdooSourceConfig } from '../odoo/config.ts';
import type { OdooSnapshotLease } from '../odoo/snapshot.ts';
import type { ExactControl,OperationalBaseline } from './contracts.ts';
const sourceControlGroupLimit=5000;
const measures:Partial<Record<FactMeasureId,{object:'sale_order'|'account_move';condition:string;value:string}>>={
 order_revenue:{object:'sale_order',condition:"record.state='sale'",value:'record.amount_total'},
 order_count:{object:'sale_order',condition:"record.state='sale'",value:'1'},cancelled_orders:{object:'sale_order',condition:"record.state='cancel'",value:'1'},
 invoiced_revenue:{object:'account_move',condition:"record.state='posted' AND record.move_type='out_invoice'",value:'record.amount_untaxed_signed'},
 refund_value:{object:'account_move',condition:"record.state='posted' AND record.move_type='out_refund'",value:'-record.amount_untaxed_signed'},
 net_invoiced_revenue:{object:'account_move',condition:"record.state='posted' AND record.move_type IN ('out_invoice','out_refund')",value:'record.amount_untaxed_signed'},
 invoice_count:{object:'account_move',condition:"record.state='posted' AND record.move_type='out_invoice'",value:'1'},
 refund_count:{object:'account_move',condition:"record.state='posted' AND record.move_type='out_refund'",value:'1'},
};
function dimensionExpression(partition:AnalyticsPartition,object:'sale_order'|'account_move') {
 const scope="$4::text||':'";
 const expressions:Record<string,string>={customer:`CASE WHEN record.partner_id IS NULL THEN 'unassigned' ELSE ${scope}||record.partner_id END`,salesperson:`CASE WHEN record.${object==='sale_order'?'user_id':'invoice_user_id'} IS NULL THEN 'unassigned' ELSE ${scope}||record.${object==='sale_order'?'user_id':'invoice_user_id'} END`,business_line:`CASE WHEN record.business_line_id IS NULL THEN 'unassigned' ELSE ${scope}||record.company_id||':'||record.business_line_id END`,city:"coalesce(nullif(btrim(partner.city),''),'unassigned')",state:`CASE WHEN partner.state_id IS NULL THEN 'unassigned' ELSE ${scope}||partner.state_id END`};
 if(partition.dimension && !expressions[partition.dimension])throw new Error('Unapproved control dimension');
 return partition.dimension?expressions[partition.dimension]!:'NULL::text';
}
interface ControlRequest {partition:AnalyticsPartition;measure:FactMeasureId;rule:NonNullable<typeof measures[FactMeasureId]>;timeZone:string}
/** Independent grouped controls read each affected measure/month/grouping once, including zero groups. */
export async function readExactEventControls(pool:Pool,lease:OdooSnapshotLease,config:OdooSourceConfig,baseline:OperationalBaseline,partitions:readonly AnalyticsPartition[]):Promise<ExactControl[]> {
 const requests=controlRequests(baseline,partitions),client=await pool.connect();
 try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await lease.importInto(client);
  await client.query("SELECT set_config('statement_timeout',$1,true)",[String(config.statementTimeoutMs)]);
  const controls:ExactControl[]=[];
  for(const group of requests.values())for(let offset=0;offset<group.length;offset+=sourceControlGroupLimit)controls.push(...await readControlGroup(client,config,baseline,group.slice(offset,offset+sourceControlGroupLimit)));
  await lease.assertAlive();await client.query('COMMIT');return controls;
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
function controlRequests(baseline:OperationalBaseline,partitions:readonly AnalyticsPartition[]) {
 const groups=new Map<string,ControlRequest[]>(),seen=new Set<string>();
 for(const partition of partitions)for(const measure of requiredMeasures(partition.metric)) {
  const key=JSON.stringify([partition.month,partition.dimension,partition.identity,measure]);if(seen.has(key))continue;seen.add(key);
  const rule=measures[measure];if(!rule||semanticCatalog[partition.metric].semantics.kind==='snapshot')throw new Error('Snapshot reconciliation adapter required');
  const mapping=baseline.mappings.find(mapping=>mapping.measures.some(item=>item.measureId===measure));if(!mapping)throw new Error('Approved control mapping required');
  const groupKey=JSON.stringify([partition.dimension,measure]);const group=groups.get(groupKey)??[];
  group.push({partition,measure,rule,timeZone:mapping.measures[0]!.timeZone});groups.set(groupKey,group);
 }
 return groups;
}
async function readControlGroup(client:import('pg').PoolClient,config:OdooSourceConfig,baseline:OperationalBaseline,requests:ControlRequest[]) {
 if(requests.length>sourceControlGroupLimit)throw new Error('Source control group bound');
 const {partition,rule,timeZone}=requests[0]!,key=dimensionExpression(partition,rule.object);
 const date=rule.object==='sale_order'?"((record.date_order AT TIME ZONE 'UTC') AT TIME ZONE $6)::date":'record.invoice_date';
 const month=`to_char(${date},'YYYY-MM')`,months=requests.map(request=>request.partition.month).sort();
 const group=partition.dimension?`AND ${key}=ANY($5::text[]) GROUP BY ${month},${key}`:`AND $5::text[] IS NULL GROUP BY ${month}`;
 const result=await client.query(`SELECT ${month} AS period,${key} key,coalesce(sum(${rule.value}),0)::numeric(30,6)::text value,count(*)::text count FROM ${rule.object} record LEFT JOIN res_partner partner ON partner.id=record.partner_id
 WHERE record.company_id=ANY($1::int[]) AND ${date}>=$2::date AND ${date}<$3::date AND ${rule.condition} AND $4::text IS NOT NULL AND $6::text IS NOT NULL ${group}`,[config.companyIds,`${months[0]}-01`,nextMonth(months.at(-1)!),baseline.sourceId,partition.dimension?requests.map(request=>request.partition.identity):null,timeZone]);
 const values=new Map(result.rows.map(row=>[JSON.stringify([row.period,row.key]),row]));
 return requests.map(request=>({partition:request.partition,measure:request.measure,value:values.get(JSON.stringify([request.partition.month,request.partition.identity]))?.value??'0.000000',count:values.get(JSON.stringify([request.partition.month,request.partition.identity]))?.count??'0'}));
}
function nextMonth(month:string){const date=new Date(`${month}-01T00:00:00Z`);date.setUTCMonth(date.getUTCMonth()+1);return date.toISOString().slice(0,10);}
