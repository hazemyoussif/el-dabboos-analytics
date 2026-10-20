import type {AnalyticsOperationPhase} from '@el-dabboos/application';
import type {OperationalProgress,OperationalProgressObserver,OperationalStep} from '@el-dabboos/data';

/** Operator stderr only. Totals overlap (mart_page includes its SQL steps), so
 * they are attribution timings, not independent values to sum into elapsed time.
 */
export function analyticsJobObservation() {
 const began=performance.now(),active=new Map<OperationalStep,number>();
 const totals=new Map<OperationalStep,{completed:number;failed:number;durationMs:number}>();
 let phase:AnalyticsOperationPhase|undefined,phaseBegan=began,lastProgress=began;
 const write=(record:object)=>process.stderr.write(JSON.stringify(record)+'\n');
 const flush=()=>{
  const now=performance.now();lastProgress=now;
  write({stage:'analytics-progress',elapsedMs:Math.round(now-began),activeSteps:[...active].filter(([,count])=>count>0).map(([step])=>step),timings:[...totals].map(([step,total])=>({step,...total,durationMs:Math.round(total.durationMs)}))});
 };
 const progress:OperationalProgressObserver=(event:OperationalProgress)=>{
  if(event.step==='mart_candidate_changes') {
   const {groups,...counts}=event.summary;
   write({stage:'analytics-candidate-changes',candidateOnly:true,elapsedMs:Math.round(performance.now()-began),classificationMs:Math.round(event.durationMs),...counts});
   for(const group of groups)write({stage:'analytics-candidate-change-group',candidateOnly:true,...group});
   return;
  }
  // Emit each refresh boundary immediately: a killed client may never call finish().
  if(event.step.startsWith('refresh_'))write({stage:'analytics-refresh',candidateOnly:true,step:event.step,state:event.state,
   elapsedMs:Math.round(performance.now()-began),...(event.durationMs===undefined?{}:{durationMs:Math.round(event.durationMs)}),
   ...(event.month===undefined?{}:{month:event.month}),...(event.monthIndex===undefined?{}:{monthIndex:event.monthIndex,totalMonths:event.totalMonths})});
  if(event.state==='started')active.set(event.step,(active.get(event.step)??0)+1);
  else {
   active.set(event.step,Math.max(0,(active.get(event.step)??0)-1));
   const total=totals.get(event.step)??{completed:0,failed:0,durationMs:0};
   total[event.state]++;total.durationMs+=event.durationMs??0;totals.set(event.step,total);
  }
  if(event.state==='failed'||performance.now()-lastProgress>=30000)flush();
 };
 return {progress,finish:flush,phase:(next:AnalyticsOperationPhase)=>{
  const now=performance.now();
  write({stage:'analytics-operation',phase:next,elapsedMs:Math.round(now-began),...(phase?{completedPhase:phase,phaseDurationMs:Math.round(now-phaseBegan)}:{})});
  phase=next;phaseBegan=now;flush();
 }};
}
