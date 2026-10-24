import {tenantTransaction} from '../postgres/session.ts';
import {commandSyncMembers,synchronizeCommandCenter} from './command-sync.ts';
import {reviewBusinessDate} from '../review/cutoff.ts';
import {commandReportObjects} from './command-report-windows.ts';
import type {CommandBackgroundScope} from './initialization-worker.ts';

/** Initialization never runs here. Refresh one already published month using
 * the existing root discovery/scoped controls and sparse replacement path.
 */
export async function refreshCommandMonth(scope:CommandBackgroundScope,currentOnly:boolean,sweepAllocations=false){
 const members=(await commandSyncMembers(scope.mart,scope.tenantId)).filter(member=>member.mapping.mappingId==='business-purpose-v1-sales-command'&&(!sweepAllocations||member.mapping.measures.some(rule=>rule.sourceObject==='command_allocation')));
 const template=members.at(-1)?.mapping;if(!template)return false;
 const today=reviewBusinessDate(new Date().toISOString(),template.measures[0]!.timeZone),current=today.slice(0,7);
 const checked=await tenantTransaction(scope.mart,scope.tenantId,async client=>(await client.query(`SELECT to_char(month,'YYYY-MM') AS "month",max(checked_at) checked
  FROM mart.command_delta_checks WHERE tenant_id=$1 AND kind=$2 GROUP BY month`,[scope.tenantId,sweepAllocations?'allocations':'delta'])).rows,true);
 const due=members.filter(member=>(scope.sweepAllocations||commandReportObjects(today,member.month).length>0)&&(!currentOnly||member.month===current)&&
  !checked.some(record=>record.month===member.month&&Date.now()-new Date(record.checked).getTime()<(sweepAllocations?86400:(scope.freshnessTargetSeconds??600))*1000));
 due.sort((left,right)=>Number(right.month===current)-Number(left.month===current)||
  lastChecked(left.month)-lastChecked(right.month));
 const member=due[0];if(!member)return false;
 const source=await scope.openSource();
 scope.observe?.({phase:'delta',state:'started',month:member.month});
 await synchronizeCommandCenter({mart:scope.mart,...source,members:[member],initializeMissing:false,sweepAllocations,
  observe:event=>scope.observe?.({phase:'delta',month:member.month,...event})});
 await tenantTransaction(scope.mart,scope.tenantId,client=>client.query('INSERT INTO mart.command_delta_checks(tenant_id,month,kind) VALUES($1,$2,$3)',[scope.tenantId,member.month+'-01',sweepAllocations?'allocations':'delta']));
 scope.observe?.({phase:'delta',state:'completed',month:member.month});return true;
 function lastChecked(month:string){return new Date(checked.find(record=>record.month===month)?.checked??0).getTime();}
}
