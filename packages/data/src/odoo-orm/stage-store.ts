import type {Pool,PoolClient} from 'pg';
import {ownedStageDatabase,stageWriterRole,stageReaderRole} from './stage-config.ts';
import type {ObservedCopyDescriptor} from './stage-config.ts';
import {stageIdentifier,stageBridges} from './stage-manifest.ts';
import type {StageModel} from './stage-manifest.ts';
import type {OrmRow} from './client.ts';
import {stageRow,stageRelationIds} from './stage-values.ts';
import {ormId} from './json.ts';

export async function assertStageWriter(pool:Pool):Promise<void> {
 const row=(await pool.query(`SELECT current_database() database,current_user role,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole
 FROM pg_roles WHERE rolname=current_user`)).rows[0];
 if(row?.database!==ownedStageDatabase||row.role!==stageWriterRole||row.rolsuper||row.rolbypassrls||row.rolcreatedb||row.rolcreaterole)throw new Error('Dedicated owned staging writer required');
 if((await pool.query('SELECT version FROM api_catalog.version')).rows[0]?.version!==1)throw new Error('Explicit owned API staging initialization required');
}
export async function createStageSchema(pool:Pool,schema:string,models:readonly StageModel[]):Promise<void> {
 const namespace=stageIdentifier(schema);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query(`CREATE SCHEMA ${namespace}`);
  await client.query(`CREATE TABLE ${namespace}.__capture (id integer PRIMARY KEY CHECK(id=1),sealed boolean NOT NULL,manifest jsonb NOT NULL)`);
  for(const model of models){
   const columns=model.columns.map(column=>`${stageIdentifier(column.name)} ${column.type}${column.name==='id'?' PRIMARY KEY':''}`).join(',');
   await client.query(`CREATE TABLE ${namespace}.${stageIdentifier(model.table)} (${columns})`);
  }
  for(const bridge of stageBridges)await client.query(`CREATE TABLE ${namespace}.${stageIdentifier(bridge.table)} (${stageIdentifier(bridge.left)} bigint NOT NULL,${stageIdentifier(bridge.right)} bigint NOT NULL,PRIMARY KEY(${stageIdentifier(bridge.left)},${stageIdentifier(bridge.right)}))`);
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

export async function writeStagePage(client:PoolClient,scope:{schema:string;model:StageModel},rows:readonly OrmRow[]):Promise<void> {
 if(!rows.length)return;
 const namespace=stageIdentifier(scope.schema),table=stageIdentifier(scope.model.table);
 const columns=scope.model.columns.map(column=>stageIdentifier(column.name)).join(',');
 const types=scope.model.columns.map(column=>`${stageIdentifier(column.name)} ${column.type}`).join(',');
 const records=rows.map(row=>stageRow(scope.model,row));
 await client.query('BEGIN');
 try{
  await client.query(`INSERT INTO ${namespace}.${table} (${columns}) SELECT ${columns} FROM jsonb_to_recordset($1::jsonb) record(${types})`,[JSON.stringify(records)]);
  for(const bridge of stageBridges.filter(bridge=>bridge.model===scope.model.model)){
   const links=rows.flatMap(row=>stageRelationIds(row[bridge.field]).map(id=>({left:ormId(row.id),right:id})));
   if(links.length)await client.query(`INSERT INTO ${namespace}.${stageIdentifier(bridge.table)} SELECT record.left_id,record.right_id
    FROM jsonb_to_recordset($1::jsonb) record(left_id bigint,right_id bigint) ON CONFLICT DO NOTHING`,[JSON.stringify(links.map(link=>({left_id:link.left,right_id:link.right})))]);
  }
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}
}

const indexFields=['company_id','write_date','move_id','order_id','partner_id','account_id','product_id','location_id','debit_move_id','credit_move_id','invoice_date','date','date_order'];
export async function finishStageTables(pool:Pool,schema:string,models:readonly StageModel[]):Promise<void> {
 const namespace=stageIdentifier(schema);
 for(const model of models){
  const names=new Set(model.columns.map(column=>column.name));
  for(const field of indexFields.filter(field=>names.has(field))){
   const key=field==='write_date'&&names.has('id')?`${stageIdentifier(field)},id`:stageIdentifier(field);
   await pool.query(`CREATE INDEX ON ${namespace}.${stageIdentifier(model.table)} (${key})`);
  }
  await pool.query(`ANALYZE ${namespace}.${stageIdentifier(model.table)}`);
 }
 for(const bridge of stageBridges)await pool.query(`CREATE INDEX ON ${namespace}.${stageIdentifier(bridge.table)} (${stageIdentifier(bridge.right)})`);
}
export async function sealStage(pool:Pool,descriptor:ObservedCopyDescriptor,evidence:unknown):Promise<void> {
 const namespace=stageIdentifier(descriptor.schema);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query(`INSERT INTO ${namespace}.__capture VALUES(1,true,$1)`,[JSON.stringify({...descriptor,evidence})]);
  await client.query('INSERT INTO api_catalog.captures(schema_name,tenant_id,source_id,source_as_of,manifest) VALUES($1,$2,$3,$4,$5)',
   [descriptor.schema,descriptor.tenantId,descriptor.sourceId,descriptor.sourceAsOf,JSON.stringify(descriptor)]);
  await client.query(`GRANT USAGE ON SCHEMA ${namespace} TO ${stageReaderRole}`);
  await client.query(`GRANT SELECT ON ALL TABLES IN SCHEMA ${namespace} TO ${stageReaderRole}`);
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
