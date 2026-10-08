import type {Pool,PoolClient} from 'pg';
const fields=['area','latitude','partner_latitude','longitude','partner_longitude','gps_shop_location','shop_gps_location'] as const;
const projections=new WeakMap<Pool,Promise<readonly string[]>>();
/** Closed optional presentation vocabulary, scoped to the adapter's source pool. */
export function odooPartnerProjection(pool:Pool,client:PoolClient):Promise<readonly string[]> {
 let projection=projections.get(pool);
 if(!projection){
  projection=client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='res_partner' AND column_name=ANY($1::text[])",[fields]).then(result=>result.rows.map(row=>String(row.column_name)).filter(name=>(fields as readonly string[]).includes(name)));
  projections.set(pool,projection);
  void projection.catch(()=>projections.delete(pool));
 }
 return projection;
}
