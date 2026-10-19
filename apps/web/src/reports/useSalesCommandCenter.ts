import {useEffect,useRef,useState} from 'react';
import type {SalesCommandInput,SalesCommandResult} from '@el-dabboos/application';
import {getSalesCommandCenter} from '../api/client.ts';
import type {ApiSession} from '../api/client.ts';

export function useSalesCommandCenter(session:ApiSession){
 const [result,setResult]=useState<SalesCommandResult|null>(null),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 const workspace=useRef({userId:session.userId,tenantId:session.tenantId});
 const input=useRef<SalesCommandInput>({}),active=useRef<AbortController|null>(null),owner=useRef(0);
 const reload=async(next=input.current)=>{
  input.current=next;active.current?.abort();const controller=new AbortController();active.current=controller;
  const generation=++owner.current;setResult(null);setBusy(true);setFailed(false);
  try{const response=await getSalesCommandCenter(session,next,controller.signal);if(generation===owner.current)setResult(response);}
  catch{if(generation===owner.current&&!controller.signal.aborted)setFailed(true);}
  finally{if(generation===owner.current)setBusy(false);}
 };
 useEffect(()=>{const changed=workspace.current.userId!==session.userId||workspace.current.tenantId!==session.tenantId;workspace.current={userId:session.userId,tenantId:session.tenantId};void reload(changed?{}:input.current);return()=>{owner.current++;active.current?.abort();};},[session.userId,session.tenantId,session.locale]);
 return {result,busy,failed,reload};
}
