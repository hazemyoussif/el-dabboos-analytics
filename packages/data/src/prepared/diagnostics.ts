import type {PreparedBuildScope,PreparedStepEvent} from './contracts.ts';

type Step = Pick<PreparedStepEvent,'step'|'grain'|'validationStep'>;
/** Opt-in operator evidence. SQL, parameters, error messages and customer data never enter events. */
export async function measurePreparedStep<Result>(scope:PreparedBuildScope,step:Step,operation:()=>Promise<Result>):Promise<Result>{
 if(!scope.observeStep)return operation();
 const started=performance.now();
 scope.observeStep({...step,status:'started'});
 try{
  const result=await operation();
  scope.observeStep({...step,status:'completed',elapsedMs:performance.now()-started});
  return result;
 }catch(error){
  const code=error&&typeof error==='object'&&'code' in error&&typeof error.code==='string'&&/^[A-Z0-9]{5}$/.test(error.code)?error.code:undefined;
  const reason=code==='57014'?(error instanceof Error&&error.message==='canceling statement due to statement timeout'?'statement_timeout':'query_cancelled'):'other';
  scope.observeStep({...step,status:'failed',elapsedMs:performance.now()-started,...(code?{code}:{}),reason});
  throw error;
 }
}
