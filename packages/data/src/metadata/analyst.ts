import { analystWriteAllowed } from './analyst-access.ts';
import type { AnalystAudit, AnalystConversation, AnalystConversationRepository, AnalystOwner, RequestContext } from '@el-dabboos/domain';
import type { MetadataConnection } from './administration/connection.ts';
type Transaction = <Output>(write:boolean,operation:(connection:MetadataConnection)=>Promise<Output>)=>Promise<Output>;
/** Private control-plane records; every read/write includes the actor and workspace predicates. */
export class MetadataAnalystConversations implements AnalystConversationRepository {
  constructor(private readonly transaction:Transaction) {}
  create(conversation:AnalystConversation) {
    return this.transaction(true,async connection=>{
      await connection.run('DELETE FROM analyst_conversations WHERE expires_at<=?',conversation.createdAt);
      const records=await connection.all('SELECT id FROM analyst_conversations WHERE tenant_id=? AND user_id=? ORDER BY updated_at DESC',conversation.tenantId,conversation.userId);
      for(const record of records.slice(19)) await connection.run('DELETE FROM analyst_conversations WHERE id=? AND tenant_id=? AND user_id=?',String(record.id),conversation.tenantId,conversation.userId);
      await connection.run('INSERT INTO analyst_conversations(id,tenant_id,user_id,version,created_at,updated_at,expires_at,document) VALUES (?,?,?,?,?,?,?,?)',conversation.id,conversation.tenantId,conversation.userId,conversation.version,conversation.createdAt,conversation.updatedAt,conversation.expiresAt,JSON.stringify(conversation));
    });
  }
  get(owner:AnalystOwner,id:string,now:string) {
    return this.transaction(false,async connection=>{
      const row=await connection.one('SELECT document FROM analyst_conversations WHERE id=? AND tenant_id=? AND user_id=? AND expires_at>?',id,owner.tenantId,owner.userId,now);
      return row?JSON.parse(String(row.document)) as AnalystConversation:null;
    });
  }
  list(owner:AnalystOwner,now:string) {
    return this.transaction(false,async connection=>(await connection.all('SELECT id,created_at,updated_at FROM analyst_conversations WHERE tenant_id=? AND user_id=? AND expires_at>? ORDER BY updated_at DESC LIMIT 20',owner.tenantId,owner.userId,now)).map(row=>({id:String(row.id),createdAt:String(row.created_at),updatedAt:String(row.updated_at)})));
  }
  append(conversation:AnalystConversation,expectedVersion:number,audit:AnalystAudit,actor:RequestContext) {
    return this.transaction(true,async connection=>{
      if(!await analystWriteAllowed(connection,actor))return false;
      const result=await connection.run('UPDATE analyst_conversations SET version=?,updated_at=?,document=? WHERE id=? AND tenant_id=? AND user_id=? AND version=? AND expires_at>?',conversation.version,conversation.updatedAt,JSON.stringify(conversation),conversation.id,conversation.tenantId,conversation.userId,expectedVersion,conversation.updatedAt);
      if(!result.changes)return false;
      await connection.run('DELETE FROM analyst_question_audit WHERE timestamp<?',new Date(Date.parse(audit.timestamp)-90*86400000).toISOString());
      await connection.run('INSERT INTO analyst_question_audit(message_id,tenant_id,user_id,conversation_id,timestamp,document) VALUES (?,?,?,?,?,?)',audit.messageId,audit.tenantId,audit.userId,audit.conversationId,audit.timestamp,JSON.stringify(audit));
      return true;
    });
  }
}
