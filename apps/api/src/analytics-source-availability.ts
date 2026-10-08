import type {AnalyticsSourceAvailability} from '@el-dabboos/domain';
type Probe=()=>Promise<{relayAvailable:boolean;sourceAvailable:boolean}>;
/** Background connectivity checks are independent of HTTP reads and trusted-serving readiness. */
export class CachedSourceAvailability {
 private state:AnalyticsSourceAvailability={relayAvailable:false,sourceAvailable:false,checkedAt:null,lastSuccessfulConnection:null};
 private pending:Promise<void>|undefined;
 private timer:ReturnType<typeof setInterval>|undefined;
 private stopped=false;
 constructor(private readonly tenantId:string,private readonly probe:Probe,private readonly clock:()=>number=Date.now){}
 start(){void this.refresh();this.timer=setInterval(()=>{void this.refresh();},30000);this.timer.unref();}
 snapshot(tenantId:string):AnalyticsSourceAvailability {
  if(tenantId!==this.tenantId)return {relayAvailable:false,sourceAvailable:false,checkedAt:null,lastSuccessfulConnection:null};
  const stale=!this.state.checkedAt||this.clock()-Date.parse(this.state.checkedAt)>75000;
  return {...this.state,sourceAvailable:!stale&&this.state.sourceAvailable};
 }
 refresh():Promise<void> {
  if(this.stopped)return Promise.resolve();
  if(!this.pending)this.pending=this.check().finally(()=>{this.pending=undefined;});
  return this.pending;
 }
 async close(){this.stopped=true;clearInterval(this.timer);await this.pending;}
 private async check(){
  let result={relayAvailable:false,sourceAvailable:false};
  try{result=await this.probe();}catch{/* Connectivity failures are governed availability, never API readiness failures. */}
  if(this.stopped)return;
  const checkedAt=new Date(this.clock()).toISOString();
  this.state={...result,checkedAt,lastSuccessfulConnection:result.sourceAvailable?checkedAt:this.state.lastSuccessfulConnection};
 }
}
