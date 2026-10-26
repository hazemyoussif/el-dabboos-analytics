import {useEffect,useRef,useState} from 'react';
import type {CustomerProductCoverageInput,CustomerProductCoverageResult} from '@el-dabboos/domain';
import {getCustomerProductCoverage} from '../api/client.ts';
import type {ApiSession} from '../api/client.ts';
export function useCustomerProductCoverage(session:ApiSession){
 const [result,setResult]=useState<CustomerProductCoverageResult|null>(null),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 const active=useRef<AbortController|null>(null),generation=useRef(0);
 const selection=useRef<CustomerProductCoverageInput>({});
 const reload=async(input:CustomerProductCoverageInput)=>{
  selection.current=input;
  active.current?.abort();const controller=new AbortController();active.current=controller;
  const owner=++generation.current;setBusy(true);setFailed(false);setResult(null);
  try{const next=await getCustomerProductCoverage(session,input,controller.signal);if(owner===generation.current)setResult(next);}
  catch{if(owner===generation.current&&!controller.signal.aborted)setFailed(true);}
  finally{if(owner===generation.current)setBusy(false);}
 };
 useEffect(()=>{void reload({...selection.current,cursor:undefined});return()=>{generation.current++;active.current?.abort();};},[session.userId,session.tenantId,session.locale]);
 return {result,busy,failed,reload};
}
