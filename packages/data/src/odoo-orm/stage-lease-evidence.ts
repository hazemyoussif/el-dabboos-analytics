import type {PoolClient} from 'pg';
import {ownedStageDatabase,stageReaderRole} from './stage-config.ts';
import type {ObservedCopyDescriptor} from './stage-config.ts';

export function assertOwnedLeaseScope(identity:{tenantId:string;sourceId:string},durationMs:number,copy:ObservedCopyDescriptor):void{
 if(!Number.isInteger(durationMs)||durationMs<1||durationMs>600000||!/^api_[a-f0-9]{32}$/.test(copy.schema)||!/^[a-f0-9]{64}$/.test(copy.fingerprint))throw new Error('Invalid owned input lease');
 if(copy.tenantId!==identity.tenantId||copy.sourceId!==identity.sourceId||copy.companyIds.join(',')!=='1')throw new Error('Owned input scope conflict');
}
export async function assertOwnedReader(owner:PoolClient,schema:string):Promise<void>{
 const role=(await owner.query('SELECT current_database() database,current_user role,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user')).rows[0];
 if(role?.database!==ownedStageDatabase||role.role!==stageReaderRole||role.rolsuper||role.rolbypassrls||role.rolcreatedb||role.rolcreaterole)throw new Error('Dedicated owned input reader required');
 const access=(await owner.query(`SELECT has_schema_privilege(current_user,$1,'CREATE') writable_schema,
 EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=$1 AND has_table_privilege(current_user,quote_ident(table_schema)||'.'||quote_ident(table_name),'INSERT,UPDATE,DELETE,TRUNCATE')) writable_table`,[schema])).rows[0];
 if(access.writable_schema||access.writable_table)throw new Error('Owned input reader must have no write privileges');
}
export async function readOwnedSnapshot(owner:PoolClient,copy:ObservedCopyDescriptor):Promise<{token:string;descriptor:string}>{
 await owner.query('SELECT pg_advisory_xact_lock_shared(hashtextextended($1,7415))',[copy.schema]);
 const row=(await owner.query(`SELECT manifest FROM "${copy.schema}".__capture WHERE id=1 AND sealed`)).rows[0];
 if(!row||row.manifest.fingerprint!==copy.fingerprint||row.manifest.tenantId!==copy.tenantId||row.manifest.sourceId!==copy.sourceId||row.manifest.sourceAsOf!==copy.sourceAsOf)throw new Error('Sealed owned input evidence required');
 const snapshot=(await owner.query('SELECT pg_export_snapshot() token,pg_current_snapshot()::text descriptor')).rows[0];
 if(!/^[0-9A-Fa-f]+-[0-9A-Fa-f]+-\d+$/.test(snapshot.token)||typeof snapshot.descriptor!=='string')throw new Error('Invalid owned input snapshot');
 return snapshot;
}
