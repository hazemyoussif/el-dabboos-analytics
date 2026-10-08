import assert from 'node:assert/strict';
import type { AnalystAudit, AnalystConversation, AnalystConversationRepository, RequestContext } from '@el-dabboos/domain';
export const conversationFixture=(id='conversation'):AnalystConversation=>({id,tenantId:'demo-iq',userId:'demo-iq-admin',createdAt:'2026-10-08T12:00:00.000Z',updatedAt:'2026-10-08T12:00:00.000Z',expiresAt:'2026-11-07T12:00:00.000Z',version:1,messages:[]});
export const auditFixture=(id='question'):AnalystAudit=>({conversationId:'conversation',messageId:id,tenantId:'demo-iq',userId:'demo-iq-admin',membershipId:'iq-admin',timestamp:'2026-10-08T12:00:00.000Z',effectivePeriods:[],capabilityStatus:'DATA_NOT_READY',executionStatus:'DATA_NOT_READY',references:[]});
export async function verifyConversationStorage(repository:AnalystConversationRepository,actor:RequestContext) {
 const conversation=conversationFixture(),owner={tenantId:conversation.tenantId,userId:conversation.userId},now=conversation.updatedAt;
 await repository.create(conversation);
 assert.deepEqual(await repository.get(owner,conversation.id,now),conversation);
 assert.equal(await repository.get({...owner,tenantId:'demo-eg'},conversation.id,now),null);
 assert.equal(await repository.get({...owner,userId:'demo-iq-analyst'},conversation.id,now),null);
 const next={...conversation,version:2},results=await Promise.all([repository.append(next,1,auditFixture('first'),actor),repository.append(next,1,auditFixture('second'),actor)]);
 assert.deepEqual([...results].sort(),[false,true]);assert.equal((await repository.get(owner,conversation.id,now))!.version,2);
 await assert.rejects(repository.append({...next,version:3},2,auditFixture(results[0]?'first':'second'),actor));
 assert.equal((await repository.get(owner,conversation.id,now))!.version,2);
 assert.equal(await repository.get(owner,conversation.id,conversation.expiresAt),null);
 assert.equal((await repository.list(owner,now)).length,1);
}
