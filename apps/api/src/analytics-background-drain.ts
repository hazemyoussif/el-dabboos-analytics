/** Bound cheap replay/binding work per process. Newly materialized data,
 * source capture and publication return control to the scheduler immediately.
 */
export async function drainCommandBackgroundUnits<Result extends {phase:string}>(runUnit:()=>Promise<Result>,now:()=>number=()=>performance.now()){
 const began=now();let units=1;
 let result=await runUnit();
 while(units<10&&now()-began<10000&&(result.phase.startsWith('canonical_')||result.phase==='prepared_binding')){
  result=await runUnit();units++;
 }
 return {...result,units,durationMs:Math.round(now()-began)};
}
