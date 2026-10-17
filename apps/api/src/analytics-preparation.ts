import {createMartPool} from '@el-dabboos/data';
import {activatePreparedRevision,preparePublishedRevision} from '../../../packages/data/src/prepared/operator.ts';
import {assertHostedMartUrl} from './hosted-mart-url.ts';
/** Explicit protected operator action. It never migrates schemas or opens an Odoo connection. */
export async function executeAnalyticsPreparation(command:'prepare'|'activate-prepared',tenantId:string,extra:string[],environment:NodeJS.ProcessEnv){
 const options=parsePreparationOptions(extra);
 const connection=assertHostedMartUrl(command==='prepare'?environment.MART_INGESTOR_URL:environment.MART_MIGRATOR_URL,environment,'Protected preparation identity required');
 if(decodeURIComponent(new URL(connection).pathname)!=='/'+options.database)throw new Error('Intended preparation database mismatch');
 const pool=createMartPool(connection,1),scope={tenantId,...options};
 try{return command==='prepare'?await preparePublishedRevision(pool,scope,chunk=>process.stdout.write(JSON.stringify({stage:'prepared chunk',...chunk})+'\n')):await activatePreparedRevision(pool,scope);}
 finally{await pool.end();}
}
export function parsePreparationOptions(extra:string[]){
 if(extra.length!==8||extra[0]!=='--database'||extra[2]!=='--revision'||extra[4]!=='--max-cells'||extra[6]!=='--max-chunks')throw new Error('Use --database DATABASE --revision REVISION --max-cells INTEGER --max-chunks INTEGER');
 const database=extra[1]!,revisionId=extra[3]!,maxCellsPerChunk=Number(extra[5]),maxChunks=Number(extra[7]);
 if(!database.trim()||!revisionId.trim()||!Number.isSafeInteger(maxCellsPerChunk)||maxCellsPerChunk<1||!Number.isSafeInteger(maxChunks)||maxChunks<1)throw new Error('Explicit finite preparation bounds required');
 return {database,revisionId,bounds:{maxCellsPerChunk,maxChunks}};
}

export function isAnalyticsPreparationCommand(command:string|undefined):command is 'prepare'|'activate-prepared'{return command==='prepare'||command==='activate-prepared';}
