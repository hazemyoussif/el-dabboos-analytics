import assert from 'node:assert/strict';
import test from 'node:test';
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {Window} from 'happy-dom';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {semanticCatalog,tenantProfiles} from '@el-dabboos/domain';
import {tooltipPosition} from '../src/metrics/tooltip-position.ts';
import {parseWorkspaceRoute,workspaceRoutePath} from '../src/workspace-route.ts';

async function domFixture(path='/') {
 const browser=new Window({url:'https://analytics.test'+path});
 const globals={window:browser,document:browser.document,HTMLElement:browser.HTMLElement,HTMLDialogElement:browser.HTMLDialogElement,Event:browser.Event,PopStateEvent:browser.PopStateEvent,ResizeObserver:browser.ResizeObserver,IS_REACT_ACT_ENVIRONMENT:true};
 const previous=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const [key,value] of Object.entries(globals))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
 const container=browser.document.createElement('div');browser.document.body.append(container);const root=createRoot(container);
 return {browser,server,root,container,async close(){await act(async()=>root.unmount());await server.close();await browser.happyDOM.close();for(const [key,value]of previous){if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);}}};
}
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return {promise,resolve};}
const reportIds=['executive-sales-invoicing','invoice-refund-operations'];
function report(id:string){const dashboard={schemaVersion:2,id,title:{en:id,ar:id},locale:'en',filters:{},layout:{columns:1},widgets:[]};return {dashboard,execution:{dashboard,widgetResults:{},metadata:{executedAt:'2026-10-07T00:00:00Z',succeeded:0,failed:0,succeededSeries:0,failedSeries:0}}};}
async function settle(){await act(async()=>{await new Promise<void>(resolve=>setImmediate(resolve));});}

 test('report destination changes before data, survives failure and stale completion, and follows history/tenant scope',async()=>{
 const fixture=await domFixture('/reports/executive-sales-invoicing');const priorFetch=globalThis.fetch;
 const first=deferred<Response>();const second=deferred<Response>();let calls=0;const requestedTenants:string[]=[];
 globalThis.fetch=async(input,options)=>{
  const path=String(input);const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
  if(path.includes('/instantiate')){requestedTenants.push(String((options?.headers as Record<string,string>)['x-tenant-id']));calls++;if(calls===1)return first.promise;if(calls===2)return second.promise;return json(report(path.includes(reportIds[1]!)?reportIds[1]!:reportIds[0]!));}
  if(path==='/api/administration-capabilities')return json({platformPermissions:[]});
  if(path==='/api/tenant-profiles')return json({profiles:[tenantProfiles['demo-iq'],tenantProfiles['demo-eg']],defaultTenantId:'demo-iq'});
  if(path==='/api/demo-capabilities')return json({permissions:['dashboard:view','analytics:query']});
  if(path==='/api/semantic-catalog')return json({metrics:[semanticCatalog.net_invoiced_revenue],registry:[],published:{tenantId:'demo-iq',mode:'certified',releases:[]}});
  if(path==='/api/dashboard-templates')return json({templates:reportIds.map(id=>({id,name:{en:id,ar:id},availability:'available',tags:['management']})),defaultTemplateId:reportIds[0]});
  if(path==='/api/saved-dashboards')return json({dashboards:[]});
  if(path.startsWith('/api/dimensions/'))return json({values:[]});
  throw Error('Unexpected fixture request: '+path);
 };
 try {
  const {useWorkspace}=await fixture.server.ssrLoadModule('/src/hooks/useWorkspace.ts');
  const {ManagementNavigation}=await fixture.server.ssrLoadModule('/src/reports/ManagementReports.tsx');let workspace:ReturnType<typeof useWorkspace>;
  function Probe(){workspace=useWorkspace({id:'test-user',displayName:'Test',defaultTenantId:'demo-iq'});return createElement(ManagementNavigation,{templates:workspace.templates,locale:'en',activeId:workspace.activeTemplateId,published:workspace.published,onSelect:(id:string)=>void workspace.openTemplate(id,workspace.profile,'en')});}
  await act(async()=>fixture.root.render(createElement(Probe)));await settle();
  assert.equal(workspace!.loading,true);assert.equal(workspace!.activeTemplateId,reportIds[0]);
  await act(async()=>fixture.container.querySelector<HTMLAnchorElement>('a[href="/reports/invoice-refund-operations"]')!.click());
  assert.equal(workspace!.activeTemplateId,reportIds[1]);assert.equal(workspace!.loading,true);
  assert.equal(fixture.container.querySelector('[aria-current="page"]')?.textContent,reportIds[1]);
  await act(async()=>first.resolve(new Response(JSON.stringify(report(reportIds[0]!)))));await settle();
  assert.equal(workspace!.activeTemplateId,reportIds[1]);assert.equal(workspace!.document,null);
  await act(async()=>second.resolve(new Response(JSON.stringify({error:{code:'FAILED',message:'Report failed'}}),{status:503})));await settle();
  assert.equal(workspace!.loading,false);assert.equal(workspace!.error,'Report failed');assert.equal(workspace!.document,null);assert.equal(workspace!.activeTemplateId,reportIds[1]);
  await act(async()=>{fixture.browser.history.replaceState({},'','/reports/'+reportIds[0]);fixture.browser.dispatchEvent(new fixture.browser.PopStateEvent('popstate'));});await settle();
  assert.equal(workspace!.activeTemplateId,reportIds[0]);assert.equal(workspace!.document?.spec?.id,reportIds[0]);
  await act(async()=>{fixture.browser.history.replaceState({},'','/reports/'+reportIds[1]);fixture.browser.dispatchEvent(new fixture.browser.PopStateEvent('popstate'));});await settle();
  assert.equal(workspace!.document?.spec?.id,reportIds[1]);
  await act(async()=>{await workspace!.loadWorkspace('test-user','demo-eg',false);});await settle();
  assert.equal(workspace!.profile?.id,'demo-eg');assert.equal(requestedTenants.at(-1),'demo-eg');assert.equal(workspace!.activeTemplateId,reportIds[0]);
 }finally{globalThis.fetch=priorFetch;await fixture.close();}
 });

test('shared metric hint portals outside a clipped card, supports focus/Escape and preserves modal/drag isolation',async()=>{
 const fixture=await domFixture();
 try {
  const {MetricInfo}=await fixture.server.ssrLoadModule('/src/metrics/MetricDefinition.tsx');let selected=0;
  const overlays=fixture.browser.document.createElement('div');overlays.id='app-overlays';fixture.browser.document.body.append(overlays);
  await act(async()=>fixture.root.render(createElement('div',{style:{overflow:'hidden'},onClick:()=>selected++,onPointerDown:()=>selected++},createElement(MetricInfo,{metric:semanticCatalog.net_invoiced_revenue,locale:'ar'}))));
  const button=fixture.container.querySelector('button')!;
  await act(async()=>button.focus());
  const hint=overlays.querySelector('[role="tooltip"]')!;
  assert.equal(hint.getAttribute('dir'),'rtl');assert.equal(hint.hasAttribute('hidden'),false);assert.equal(button.getAttribute('aria-describedby'),hint.id);
  await act(async()=>button.dispatchEvent(new fixture.browser.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  assert.equal(hint.hasAttribute('hidden'),true);
  await act(async()=>{button.dispatchEvent(new fixture.browser.PointerEvent('pointerdown',{bubbles:true}));button.click();});
  assert.equal(selected,0);assert.ok(fixture.browser.document.body.querySelector('dialog'));assert.equal(button.getAttribute('aria-haspopup'),'dialog');
 }finally{await fixture.close();}
});

test('tooltip geometry preserves RTL alignment, flips at the lower edge and clamps narrow viewports',()=>{
 const anchor={left:260,right:296,top:190,bottom:226};
 assert.deepEqual(tooltipPosition(anchor,{width:280,height:80},{width:320,height:240},true),{left:16,top:102});
 assert.deepEqual(tooltipPosition({left:20,right:56,top:20,bottom:56},{width:120,height:40},{width:400,height:300},false),{left:20,top:64});
 assert.deepEqual(parseWorkspaceRoute('/reports/invoice-refund-operations'),{kind:'report',id:'invoice-refund-operations'});
 assert.equal(workspaceRoutePath({kind:'saved',id:'record/one'}),'/dashboards/record%2Fone');
 assert.deepEqual(parseWorkspaceRoute('/dashboards/record%2Fone'),{kind:'saved',id:'record/one'});
 assert.deepEqual(parseWorkspaceRoute('/reports/%invalid'),{kind:'workspace'});
});

test('shared filters display governed bilingual names while changes and restored state retain distinct IDs',async()=>{
 const fixture=await domFixture();
 try {
  const {DimensionFilterControl}=await fixture.server.ssrLoadModule('/src/DimensionFilterControl.tsx');
  const {AccountControls}=await fixture.server.ssrLoadModule('/src/auth/AccountControls.tsx');
  for(const locale of ['en','ar']) {
   const name=locale==='ar'?'مندوب المبيعات':'Salesperson name';const options=[{id:'source:2045',label:name},{id:'source:2046',label:name},{id:'unassigned',label:'unassigned'}];let selected:string[]=[];
   await act(async()=>fixture.root.render(createElement(DimensionFilterControl,{dimension:'salesperson',values:['source:2046'],options,locale,onChange:(values:string[])=>{selected=values;}})));
   const select=fixture.container.querySelector('select')!;
   assert.equal(select.selectedOptions[0]!.textContent,name);assert.equal(select.querySelectorAll('option').length,4);assert.ok(!fixture.container.textContent?.includes('source:'));
   await act(async()=>{select.value=JSON.stringify(['source:2045']);select.dispatchEvent(new fixture.browser.Event('change',{bubbles:true}));});assert.deepEqual(selected,['source:2045']);
   assert.ok(fixture.container.textContent?.includes(locale==='ar'?'غير مسند':'Unassigned'));
   await act(async()=>fixture.root.render(createElement(DimensionFilterControl,{dimension:'customer',values:['source:missing'],options:[],locale,onChange:()=>{}})));assert.ok(!fixture.container.textContent?.includes('source:missing'));
   const logouts:Array<boolean|undefined>=[];
   await act(async()=>fixture.root.render(createElement(AccountControls,{user:{id:'test',displayName:'Test'},locale,userId:'test',demoUsers:[],onIdentity:()=>{},onLogout:(all?:boolean)=>logouts.push(all)})));
   await act(async()=>{for(const button of fixture.container.querySelectorAll('button')){assert.ok(button.getAttribute('aria-label'));button.click();}});assert.deepEqual(logouts,[undefined,true]);
  }
 }finally{await fixture.close();}
});

test('customer discovery opens lazily, hydrates saved selections and follows bounded continuation',async()=>{
 const fixture=await domFixture();try {
  const {CustomerFilterControl,CustomerDiscoveryContext}=await fixture.server.ssrLoadModule('/src/CustomerFilterControl.tsx');
  const calls:import('@el-dabboos/domain').DimensionDiscoveryRequest[]=[];
  const load=async(query:import('@el-dabboos/domain').DimensionDiscoveryRequest)=>{calls.push(query);return {values:[{id:query.cursor?'source:second':'source:first',label:query.cursor?'Second customer':'First customer'}],selected:query.selectedIds?.length?[{id:'source:saved',label:'Saved customer'}]:[],...(query.cursor?{}:{nextCursor:'continuation'})};};
  const render=(values:string[])=>createElement(CustomerDiscoveryContext.Provider,{value:load},createElement(CustomerFilterControl,{locale:'en',values,onChange:()=>{}}));
  await act(async()=>fixture.root.render(render([])));await settle();assert.equal(calls.length,0);
  await act(async()=>fixture.container.querySelector('button')!.click());await settle();assert.equal(calls.length,1);assert.equal(calls[0]!.limit,50);
  const more=[...fixture.container.querySelectorAll('button')].find(button=>button.textContent==='Load more')!;
  await act(async()=>more.click());await settle();assert.equal(calls[1]!.cursor,'continuation');assert.ok(fixture.container.textContent?.includes('Second customer'));
  await act(async()=>fixture.root.render(render(['source:saved'])));await settle();assert.equal(calls.at(-1)!.limit,1);assert.deepEqual(calls.at(-1)!.selectedIds,['source:saved']);assert.ok(fixture.container.textContent?.includes('Saved customer'));assert.ok(!fixture.container.textContent?.includes('source:saved'));
 }finally{await fixture.close();}
});

test('shared discovery hydrates restored IDs outside initial options in EN/AR without changing selections',async()=>{
 const fixture=await domFixture();try {
  const {DimensionFilterControl}=await fixture.server.ssrLoadModule('/src/DimensionFilterControl.tsx');
  const {DimensionDiscoveryContext}=await fixture.server.ssrLoadModule('/src/DimensionDiscoveryContext.ts');
  const calls:Array<{dimension:string;query:import('@el-dabboos/domain').DimensionDiscoveryRequest}>=[];
  const load=async(dimension:string,query:import('@el-dabboos/domain').DimensionDiscoveryRequest)=>{calls.push({dimension,query});return {values:[{id:'source:first',label:'Initial name'}],selected:[{id:'source:saved',label:dimension==='business_line'?'No Sugar':'Saved actual name'}]};};
  for(const locale of ['en','ar'])for(const dimension of ['customer','salesperson','business_line','branch','region']){
   let changed=false;
   await act(async()=>fixture.root.render(createElement(DimensionDiscoveryContext.Provider,{value:load},createElement(DimensionFilterControl,{dimension,locale,values:['source:saved'],options:[],onChange:()=>{changed=true;}}))));await settle();
   assert.equal(changed,false);assert.equal(calls.at(-1)?.dimension,dimension);assert.deepEqual(calls.at(-1)?.query.selectedIds,['source:saved']);assert.equal(calls.at(-1)?.query.limit,1);
   assert.ok(fixture.container.textContent?.includes(dimension==='business_line'?(locale==='ar'?'بدون سكر':'No Sugar'):'Saved actual name'));assert.ok(!fixture.container.textContent?.includes('source:'));
   if(dimension!=='customer')assert.equal(fixture.container.querySelector('select')!.value,JSON.stringify(['source:saved']));
  }
 }finally{await fixture.close();}
});

test('report links retain native modified-click actions and run guarded navigation only for an ordinary click',async()=>{
 const fixture=await domFixture();
 try{
  const {WorkspaceLink}=await fixture.server.ssrLoadModule('/src/WorkspaceLink.tsx');let opened=0;
  await act(async()=>fixture.root.render(createElement(WorkspaceLink,{route:{kind:'report',id:'customer-debt-aging'},onNavigate:()=>{opened++;},children:'Debt report'})));
  const link=fixture.container.querySelector('a')!;assert.equal(link.getAttribute('href'),'/reports/customer-debt-aging');
  for(const options of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1},{button:2}]){
   const event=new fixture.browser.MouseEvent('click',{bubbles:true,cancelable:true,...options});await act(async()=>{link.dispatchEvent(event);});assert.equal(event.defaultPrevented,false);assert.equal(opened,0);
  }
  const ordinary=new fixture.browser.MouseEvent('click',{bubbles:true,cancelable:true,button:0});await act(async()=>{link.dispatchEvent(ordinary);});assert.equal(ordinary.defaultPrevented,true);assert.equal(opened,1);
  await act(async()=>fixture.root.render(createElement(WorkspaceLink,{route:{kind:'report',id:'restricted'},disabled:true,onNavigate:()=>{opened++;},children:'Restricted'})));
  assert.equal(fixture.container.querySelector('a'),null);assert.equal(fixture.container.querySelector('button')?.disabled,true);
 }finally{await fixture.close();}
});

test('large table pages bound mounted rows, preserve loaded results and keep all rows in Excel export',async()=>{
 const fixture=await domFixture();
 try{
  const {WidgetCard}=await fixture.server.ssrLoadModule('/src/Renderer.tsx');
  const {tableWorkbook}=await fixture.server.ssrLoadModule('/src/export/excel-data.ts');
  const widget={id:'synthetic-large',type:'table',dimension:'customer',series:[{id:'value',metric:'period_net_sales'}]};
  const rows=Array.from({length:10000},(_,index)=>({key:'synthetic-'+index,series:{value:{value:index}}}));
  const entry={status:'success',alignedRows:rows,seriesResults:{value:{status:'success',result:{metric:'period_net_sales',groupBy:'customer',rows:rows.map(row=>({key:row.key,value:row.series.value.value})),metadata:{sourceId:'synthetic',executedAt:'2026-10-15',metricType:'currency',semantics:'additive'}}}}};
  await act(async()=>fixture.root.render(createElement(WidgetCard,{widget,entry,catalog:semanticCatalog,locale:'en',profile:tenantProfiles['demo-iq']})));
  assert.equal(fixture.container.querySelectorAll('tbody tr').length,100);assert.equal(fixture.container.querySelector('table')?.getAttribute('aria-rowcount'),'10001');
  const next=[...fixture.container.querySelectorAll('button')].find(button=>button.textContent==='Next')!;
  await act(async()=>next.click());assert.equal(fixture.container.querySelector('tbody tr')?.getAttribute('aria-rowindex'),'102');
  const search=fixture.container.querySelector<HTMLInputElement>('input[aria-label="Search row labels"]')!;
  await act(async()=>{Object.getOwnPropertyDescriptor(fixture.browser.HTMLInputElement.prototype,'value')!.set!.call(search,'synthetic-9999');search.dispatchEvent(new fixture.browser.Event('input',{bubbles:true}));});
  assert.equal(fixture.container.querySelectorAll('tbody tr').length,1);assert.ok(fixture.container.querySelector('tbody')?.textContent.includes('synthetic-9999'));
  assert.equal(entry.alignedRows.length,10000);
  const workbook=tableWorkbook(widget,entry,{catalog:semanticCatalog,locale:'en',profile:tenantProfiles['demo-iq']});
  assert.equal(workbook.data[0].filter((row:unknown[])=>String(row[0]).startsWith('synthetic-')).length,10000);
 }finally{await fixture.close();}
});

test('bar presentation preserves explicit bottom/Pareto order and temporal order while ranking ordinary categories',async()=>{
 const fixture=await domFixture();
 try{
  const {orderedBarRows}=await fixture.server.ssrLoadModule('/src/rendering/BarContent.tsx');
  const rows=[{label:'low',value__amount:1,_row:0},{label:'high',value__amount:9,_row:1}];
  const widget={id:'synthetic',type:'bar',dimension:'customer',series:[{id:'amount',metric:'period_net_sales'}]};
  const field=(await fixture.server.ssrLoadModule('/src/rendering/shared.ts')).valueKey('amount');
  const data=rows.map(row=>({...row,[field]:row.value__amount}));
  assert.equal(orderedBarRows(widget,data)[0]._row,1);assert.equal(data[0]._row,0);
  assert.equal(orderedBarRows({...widget,series:[{...widget.series[0],analysis:{topN:{direction:'bottom',limit:2}}}]},data),data);
  assert.equal(orderedBarRows({...widget,series:[{...widget.series[0],analysis:{pareto:true}}]},data),data);
  assert.equal(orderedBarRows({...widget,dimension:'month'},data),data);
 }finally{await fixture.close();}
});
