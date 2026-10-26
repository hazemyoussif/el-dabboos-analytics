import type {Pool} from 'pg';
import type {CustomerProductPopulationBasis} from '@el-dabboos/domain';
import type {OdooSourceConfig} from '../odoo/config.ts';
import {tenantTransaction} from '../postgres/session.ts';
import {commandSyncMembers} from './command-sync.ts';
import {captureCommandRecipe} from './initialization-capture.ts';
import {customerCoverageObject,withCustomerCoverageMapping} from './customer-coverage-mapping.ts';

/** Explicit operator capture only; the existing background worker prepares and publishes it. */
export async function captureCustomerCoverage(scope:{mart:Pool;owner:Pool;reader:Pool;config:OdooSourceConfig;month:string;population:CustomerProductPopulationBasis}){
 const member=(await commandSyncMembers(scope.mart,scope.config.tenantId)).find(candidate=>candidate.month===scope.month);
 if(!member)throw new Error('Accepted Business month required');
 const mapping=withCustomerCoverageMapping(member.mapping,scope.population);
 const baseRevision=await tenantTransaction(scope.mart,scope.config.tenantId,async client=>(await client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',[scope.config.tenantId])).rows[0].revision_id as string,true);
 return captureCommandRecipe({...scope,mapping,object:customerCoverageObject,baseRevision,basePartition:member.partitionId});
}
