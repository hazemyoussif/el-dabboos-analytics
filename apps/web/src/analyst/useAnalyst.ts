import { useEffect, useRef, useState } from 'react';
import type { AnalystConversation, AnalyticsIntent, MetricId } from '@el-dabboos/domain';
import type { ApiSession } from '../api/client.ts';
import { createConversation, getConversation, listConversations, sendQuestion } from './client.ts';
export function useAnalyst(session:ApiSession,id:string|undefined,onNavigate:(id:string)=>void) {
 const [conversation,setConversation]=useState<AnalystConversation|null>(null),[history,setHistory]=useState<Array<Pick<AnalystConversation,'id'|'createdAt'|'updatedAt'>>>([]);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(false),generation=useRef(0);
 async function load() {
  const request=++generation.current;setLoading(true);setBusy(false);setError(false);setConversation(null);
  try{const records=await listConversations(session);if(request!==generation.current)return;setHistory(records.conversations);if(id){const result=await getConversation(session,id);if(request===generation.current)setConversation(result);}}
  catch{if(request===generation.current)setError(true);}finally{if(request===generation.current)setLoading(false);}
 }
 useEffect(()=>{void load();return()=>{generation.current++;};},[session.tenantId,session.userId,session.locale,id]);
 async function send(question:string,pageContext:AnalyticsIntent['context'],choice?:MetricId) {
  const request=generation.current;setBusy(true);setError(false);
  try{
   const active=conversation??await createConversation(session);
   const updated=await sendQuestion(session,active.id,{expectedVersion:active.version,...(choice?{choice}:{question,pageContext})});
   if(request===generation.current){setConversation(updated);if(!id)onNavigate(updated.id);return true;}
  }catch{if(request===generation.current)setError(true);}finally{if(request===generation.current)setBusy(false);}
  return false;
 }
 return {conversation,history,busy,loading,error,send,reload:load};
}
