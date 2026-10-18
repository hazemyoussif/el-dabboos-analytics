import {measurePreparedStep} from './diagnostics.ts';
import type {PoolClient} from 'pg';
import type {PreparedBuildBounds,PreparedBuildScope,PreparedConfiguration} from './contracts.ts';

const defaultPopulationRows=1_000_000;

/** Only controlled database operations own transaction-private intermediate data. */
export async function buildPreparedWorkspace(client:PoolClient,scope:PreparedBuildScope,config:PreparedConfiguration,bounds:PreparedBuildBounds){
 const parameters=[scope.tenantId,scope.revisionId,JSON.stringify(config)];
 await measurePreparedStep(scope,{step:'population'},()=>client.query('SELECT mart.prepared_work_start($1,$2,$3,$4,$5)',[...parameters,bounds.maxCellsPerChunk,bounds.maxPopulationRows??defaultPopulationRows]));
 await measurePreparedStep(scope,{step:'aggregation'},()=>client.query('SELECT mart.prepared_work_generate($1,$2,$3)',parameters));
 for(const grain of config.grains){
  for(const step of ['expand','numeric','labels','attach','compare']){
   await measurePreparedStep(scope,{step:'validation',grain:grain.id,validationStep:step},()=>client.query('SELECT mart.prepared_work_validate($1,$2,$3,$4,$5)',[...parameters,grain.id,step]));
  }
 }
 await measurePreparedStep(scope,{step:'workspace_seal'},()=>client.query('SELECT mart.prepared_work_seal($1,$2,$3)',parameters));
}
