import {captureOwnedOdooStage,ownedStageConfig,odooOrmConfig} from '@el-dabboos/data';
import {initializeOwnedOdooStage} from '@el-dabboos/data';
import {assertOrmSourceRegistration} from './source-connections.ts';

/** Explicit operator work; every diagnostic is a phase, model identifier or count. */
export async function executeOdooOrmStage(args:readonly string[],environment:NodeJS.ProcessEnv){
 const [command,...flags]=args;
 if(!['stage:init','stage:capture'].includes(command??'')||![2,3].includes(flags.length)||flags[0]!=='--tenant'||(flags[2]!==undefined&&flags[2]!=='--accept-observed'))throw new Error('Usage: odoo:orm stage:init|stage:capture --tenant ID');
 const tenantId=flags[1]!,sourceId=environment.ODOO_ORM_SOURCE_ID;
 if(tenantId!==environment.ODOO_ORM_TENANT_ID||!sourceId)throw new Error('Explicit API copy scope required');
 await assertOrmSourceRegistration(environment,{tenantId,sourceId,companyIds:['1']});
 const stage=ownedStageConfig(environment);
 if(command==='stage:init'){await initializeOwnedOdooStage(stage);return {initialized:true};}
 const copy=await captureOwnedOdooStage({tenantId,sourceId,stage,api:odooOrmConfig(environment),observe:event=>process.stderr.write(`${JSON.stringify(event)}\n`)});
 return {schema:copy.schema,sourceAsOf:copy.sourceAsOf,fingerprint:copy.fingerprint,consistency:'api_observed'};
}
