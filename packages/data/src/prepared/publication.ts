import type {PoolClient} from 'pg';
import type {PreparedBuildScope} from './contracts.ts';
import {prepareRevision} from './preparation.ts';
/** Existing publication transaction/tenant lock owns this work. No activation means no behavior change. */
export async function prepareActivatedPublication(client:PoolClient,scope:PreparedBuildScope){
 // Forward-migration rehearsal may publish legacy evidence before the additive registry exists.
 if(!(await client.query("SELECT to_regclass('mart.prepared_activation') registry")).rows[0].registry)return;
 const activation=(await client.query<{max_cells_per_chunk:string;max_chunks:number}>('SELECT max_cells_per_chunk::text,max_chunks FROM mart.prepared_activation WHERE tenant_id=$1',[scope.tenantId])).rows[0];
 if(!activation)return;
 // Complete-history proofs run only in this owning background transaction.
 // Restore the caller's deadline before promotion; serving limits stay separate.
 const previous=(await client.query<{timeout:string}>("SELECT current_setting('statement_timeout') timeout")).rows[0]!.timeout;
 await client.query("SELECT set_config('statement_timeout','600000',true)");
 const chunks=await prepareRevision(client,scope,{maxCellsPerChunk:Number(activation.max_cells_per_chunk),maxChunks:activation.max_chunks});
 await client.query("SELECT set_config('statement_timeout',$1,true)",[previous]);
 return chunks;
}
