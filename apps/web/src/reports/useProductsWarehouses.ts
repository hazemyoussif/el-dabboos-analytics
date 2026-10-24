import {useEffect,useRef,useState} from 'react';
import type {ProductsWarehousesInput,ProductsWarehousesResult} from '@el-dabboos/application';
import {getProductsWarehouses} from '../api/client.ts';
import type {ApiSession} from '../api/client.ts';

export function useProductsWarehouses(session:ApiSession){
 const [result,setResult]=useState<ProductsWarehousesResult|null>(null),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 const input=useRef<ProductsWarehousesInput>({}),active=useRef<AbortController|null>(null),owner=useRef(0);
 const reload=async(next=input.current)=>{
  input.current=next;active.current?.abort();const controller=new AbortController();active.current=controller;
  const generation=++owner.current;setResult(null);setBusy(true);setFailed(false);
  try{const response=await getProductsWarehouses(session,next,controller.signal);if(generation===owner.current)setResult(response);}
  catch{if(generation===owner.current&&!controller.signal.aborted)setFailed(true);}
  finally{if(generation===owner.current)setBusy(false);}
 };
 useEffect(()=>{void reload();return()=>{owner.current++;active.current?.abort();};},[session.userId,session.tenantId,session.locale]);
 return {result,busy,failed,reload};
}
