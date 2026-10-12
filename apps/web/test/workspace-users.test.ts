import test from 'node:test';
import assert from 'node:assert/strict';
import {act,createElement} from 'react';
import {Window} from 'happy-dom';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
async function fixture() {
 const browser=new Window({url:'http://analytics.test/'}),previous=new Map<string,PropertyDescriptor|undefined>();
 for(const [key,value] of Object.entries({window:browser,document:browser.document,HTMLElement:browser.HTMLElement,Event:browser.Event,FormData:browser.FormData,IS_REACT_ACT_ENVIRONMENT:true})){
  previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
 }
 const {createRoot}=await import('react-dom/client');
 const server=await createServer({configFile:false,envDir:'/tmp/el-dabboos-no-env-files',plugins:[react()],root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true},appType:'custom'});
 const container=browser.document.createElement('div');browser.document.body.append(container);const root=createRoot(container);
 return {browser,container,root,server,async close(){await act(async()=>root.unmount());await server.close();await browser.happyDOM.close();for(const [key,value] of previous){if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);}}};
}
for(const locale of ['en','ar'] as const)test(`workspace ${locale} creates a password user and role in one form without any candidates`,async()=>{
 const ui=await fixture(),original=globalThis.fetch,writes:Array<{path:string;body:unknown}>=[];
 globalThis.fetch=async(input,init)=>{
  const path=String(input);
  if(init?.method==='POST'){writes.push({path,body:JSON.parse(String(init.body))});return new Response('{}');}
  const items=path.endsWith('/roles')?[{id:'viewer',name:'Viewer',permissions:['dashboard:view'],metricDomains:['sales']}]:[];
  return new Response(JSON.stringify({items}));
 };
 try {
  const {MembershipsPage}=await ui.server.ssrLoadModule('/src/admin/MembershipsPage.tsx');
  const props={session:{userId:'tenant-admin',tenantId:'tenant-a',locale},permissions:['users:view','users:manage','roles:view','roles:manage'],platformPermissions:[]};
  await act(async()=>{ui.root.render(createElement(MembershipsPage,props));});
  const create=Array.from(ui.container.querySelectorAll('button')).find(button=>button.textContent===(locale==='en'?'Create user':'إنشاء مستخدم'))!;assert.ok(create);
  await act(async()=>create.click());
  const form=ui.container.querySelector('form')!;assert.ok(form);assert.equal(form.querySelector('[name="userId"]'),null);
  for(const [name,value] of Object.entries({displayName:'New Employee',email:'employee@example.test',password:'synthetic-password-only'})){
   const input=form.querySelector(`input[name="${name}"]`)!;input.value=value;assert.equal(input.required,true);
  }
  assert.equal(form.querySelector('input[name="password"]')?.type,'password');
  assert.equal(form.querySelector('input[name="password"]')?.autocomplete,'new-password');
  await act(async()=>{form.dispatchEvent(new ui.browser.Event('submit',{bubbles:true,cancelable:true}));});
  assert.equal(writes.length,0);
  assert.ok(form.querySelector('input[name="role"]')!.validationMessage);
  await act(async()=>form.querySelector('input[name="role"]')!.click());
  await act(async()=>{form.dispatchEvent(new ui.browser.Event('submit',{bubbles:true,cancelable:true}));});
  assert.deepEqual(writes,[{path:'/api/tenants/tenant-a/admin/users',body:{displayName:'New Employee',preferredLocale:locale,email:'employee@example.test',password:'synthetic-password-only',roleIds:['viewer']}}]);
  assert.equal(ui.container.querySelector('form'),null);assert.ok(ui.container.textContent?.includes(locale==='en'?'Saved.':'تم الحفظ.'));
  const {PlatformUsersPage}=await ui.server.ssrLoadModule('/src/admin/PlatformUsersPage.tsx');
  await act(async()=>ui.root.render(createElement(PlatformUsersPage,{...props,platformPermissions:['platform:users:view','platform:users:manage']})));
  assert.ok(ui.container.textContent?.includes(locale==='en'?'Create users and assign their roles under Workspace':'أنشئ المستخدمين وحدد أدوارهم'));
  assert.ok(!Array.from(ui.container.querySelectorAll('button')).some(button=>button.textContent===(locale==='en'?'Create user':'إنشاء مستخدم')));
 }finally{globalThis.fetch=original;await ui.close();}
});

for(const locale of ['en','ar'] as const)test(`workspace ${locale} resets roles and password fields when switching creation modes`,async()=>{
 const ui=await fixture(),original=globalThis.fetch;let writes=0;
 globalThis.fetch=async(input,init)=>{
  if(init?.method==='POST')writes++;
  const path=String(input),items=path.endsWith('/roles')?[{id:'viewer',name:'Viewer'}]:path.endsWith('/candidates')?[{id:'existing',displayName:'Existing synthetic user'}]:[];
  return new Response(JSON.stringify({items}));
 };
 try {
  const {MembershipsPage}=await ui.server.ssrLoadModule('/src/admin/MembershipsPage.tsx');
  await act(async()=>ui.root.render(createElement(MembershipsPage,{session:{userId:'tenant-admin',tenantId:'tenant-a',locale},permissions:['users:view','users:manage','roles:view','roles:manage'],platformPermissions:[]})));
  const button=(name:string)=>Array.from(ui.container.querySelectorAll('button')).find(button=>button.textContent===name)!;
  await act(async()=>button(locale==='en'?'Create user':'إنشاء مستخدم').click());
  const first=ui.container.querySelector('form')!;
  first.querySelector('input[name="password"]')!.value='synthetic-password-only';
  await act(async()=>first.querySelector('input[name="role"]')!.click());
  await act(async()=>button(locale==='en'?'Assign existing user':'تعيين مستخدم موجود').click());
  const existing=ui.container.querySelector('form')!;
  assert.notEqual(existing,first);assert.ok(existing.querySelector('select[name="userId"]'));
  assert.equal(existing.querySelector('input[name="role"]')!.checked,false);assert.equal(existing.querySelector('input[name="password"]'),null);
  await act(async()=>existing.querySelector('input[name="role"]')!.click());
  await act(async()=>button(locale==='en'?'Create user':'إنشاء مستخدم').click());
  const next=ui.container.querySelector('form')!;
  assert.notEqual(next,existing);assert.equal(next.querySelector('input[name="role"]')!.checked,false);assert.equal(next.querySelector('input[name="password"]')!.value,'');
  assert.equal(writes,0);
 }finally{globalThis.fetch=original;await ui.close();}
});
