import { compileMembershipScopes } from '@el-dabboos/domain';
import type { RequestContext, TenantAccessRole } from '@el-dabboos/domain';
import type { MetadataConnection } from './administration/connection.ts';
import { metadataRows } from './administration/mappers.ts';
/** Recheck the persisted actor inside the same control transaction as CAS and audit. */
export async function analystWriteAllowed(connection:MetadataConnection,actor:RequestContext):Promise<boolean> {
 const tenantId=actor.tenant.tenantId,userId=actor.principal.userId,rows=metadataRows(connection);
 const membership=await rows.getMembership(tenantId,actor.principal.membershipId),user=await rows.getUser(userId),tenant=await rows.getTenant(tenantId);
 if(!membership||membership.userId!==userId||membership.status!=='active'||user?.status!=='active'||tenant?.status!=='active')return false;
 const customer=await rows.getCustomer(tenant.customerId);
 if(customer?.status!=='active')return false;
 const roles:TenantAccessRole[]=[];
 for(const roleId of membership.roleIds) {
  const record=await connection.one("SELECT * FROM roles WHERE id=? AND scope='tenant' AND (protected=1 OR tenant_id=?)",roleId,tenantId);
  if(!record)return false;roles.push(await rows.getRole(record) as TenantAccessRole);
 }
 const permissions=new Set(roles.flatMap(role=>role.permissions)),domains=new Set(roles.flatMap(role=>role.metricDomains));
 const scope=(filters:RequestContext['authorization']['enforcedFilters'])=>JSON.stringify(filters.map(filter=>({dimension:filter.dimension,values:[...filter.values].sort()})).sort((left,right)=>left.dimension.localeCompare(right.dimension)));
 return permissions.has('analytics:query')&&permissions.has('ai:generate')&&actor.authorization.permissions.every(permission=>permissions.has(permission))&&actor.authorization.metricDomains.every(domain=>domains.has(domain))&&scope(compileMembershipScopes(membership.dataScopes))===scope(actor.authorization.enforcedFilters);
}
