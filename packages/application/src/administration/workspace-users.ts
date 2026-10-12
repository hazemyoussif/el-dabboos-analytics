import type {AdministrationTransaction,ManagedMembership} from '@el-dabboos/domain';
import {authorizeMembershipAssignment} from '../access-control.ts';
import type {AdministrationActor} from './commands.ts';
import {AdministrationRuntime,fail,found} from './runtime.ts';
export interface WorkspaceUserInput {displayName:string;preferredLocale:'en'|'ar';email:string;roleIds:readonly string[]}
export function normalizeWorkspaceUser(input:WorkspaceUserInput):WorkspaceUserInput {
 const displayName=input.displayName.trim(),email=input.email.trim().toLowerCase();
 if(!displayName||displayName.length>200||!['en','ar'].includes(input.preferredLocale)||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('INVALID_ADMIN_INPUT');
 return {displayName,email,preferredLocale:input.preferredLocale,roleIds:[...input.roleIds]};
}
async function authorizeCreation(runtime:AdministrationRuntime,transaction:AdministrationTransaction,actorInput:AdministrationActor,roleIds:readonly string[],userId:string) {
 const actor=await runtime.tenantActor(transaction,actorInput);
 const roles=await transaction.tenants.listRoles(actorInput.tenantId);
 const selected=roleIds.map(id=>found(roles.find(role=>role.id===id)??null));
 const membership:ManagedMembership={...runtime.metadata(),id:crypto.randomUUID(),userId,tenantId:actorInput.tenantId,status:'active',roleIds:[...roleIds],dataScopes:[]};
 authorizeMembershipAssignment(actor,membership,selected);
 return {actor,membership};
}
/** Check delegation before expensive hashing; creation checks it again under the writer lock. */
export async function authorizeWorkspaceUserCreation(runtime:AdministrationRuntime,actor:AdministrationActor,roleIds:readonly string[]) {
 await runtime.uow.write(async transaction=>{await authorizeCreation(runtime,transaction,actor,roleIds,'new-user');});
}
export async function createWorkspaceUser(runtime:AdministrationRuntime,actorInput:AdministrationActor,input:WorkspaceUserInput,credential:{subject:string;passwordHash:string}) {
 const normalized=normalizeWorkspaceUser(input);
 return runtime.tenantWrite({actor:actorInput,action:'membership.created',targetId:actorInput.tenantId},async transaction=>{
  const userId=crypto.randomUUID();
  const {actor,membership}=await authorizeCreation(runtime,transaction,actorInput,normalized.roleIds,userId);
  if(!transaction.localCredentials)fail('ADMIN_UNAVAILABLE');
  const user=await transaction.users.createUser({...runtime.metadata(),id:userId,displayName:normalized.displayName,preferredLocale:normalized.preferredLocale,status:'active'});
  await transaction.localCredentials.create({userId,subject:credential.subject,displayName:user.displayName,email:normalized.email,passwordHash:credential.passwordHash});
  await transaction.users.bindIdentity({id:crypto.randomUUID(),userId,provider:'local',providerSubject:credential.subject,loginHint:normalized.email,status:'active'});
  const created=await transaction.tenants.createMembership(membership);
  await runtime.audit(transaction,actor,'user.updated',userId);
  await runtime.audit(transaction,actor,'membership.created',created.id);
  return {user,membership:created};
 });
}
