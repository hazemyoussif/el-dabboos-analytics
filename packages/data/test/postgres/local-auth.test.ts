import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { createLocalAuth,BetterAuthLocalProvider } from '../../../../apps/api/src/auth/local-provider.ts';
import { openLocalAuthentication } from '../../../../apps/api/src/auth/runtime.ts';
import { buildApi } from '../../../../apps/api/src/app.ts';
import { provisionLocalIdentity,resolveAuthenticatedPrincipal,resolveTenantAccess,createAdministration } from '../../../application/src/index.ts';
import { PostgresAdministrationStore } from '../../src/control/administration.ts';
import { PostgresAuthenticationDirectory,PostgresLocalIdentityProvisioner,createAuthenticationPool } from '../../src/auth/control-authentication.ts';
import { MockAnalyticsRepository } from '../../src/index.ts';
import { controlDatabase } from './control-support.ts';
import { enabled } from './support.ts';
const config = { baseUrl: 'http://localhost:8088',secret: 'isolated-test-secret-only-00000000000000000000000000',secure: false,origins: ['http://localhost:8088'] };
const password = `long synthetic passphrase ${randomBytes(32).toString('hex')}`;
async function fixture() {
    const database = await controlDatabase(), store = new PostgresAdministrationStore(database.app);
    const metadata = { version: 1,createdAt: '2026-10-06',updatedAt: '2026-10-06' };
    await store.write(async transaction => {
        await transaction.provisioning.initializeProtectedRoles(metadata.createdAt);
        await transaction.customers.createCustomer({ ...metadata,id: 'test-customer',name: 'Synthetic customer',status: 'active' });
        for (const id of ['tenant-a','tenant-b']) await transaction.customers.createTenant({ ...metadata,id,customerId: 'test-customer',name: 'Synthetic tenant',status: 'active',configuration: { countryCode: 'IQ',reportingCurrency: 'IQD',timeZone: 'Asia/Baghdad',arabicDialect: 'iq',defaultLocale: 'en' } });
        for (const id of ['login-user','no-membership']) await transaction.users.createUser({ ...metadata,id,displayName: 'Synthetic user',preferredLocale: 'en',status: 'invited' });
        await transaction.users.createUser({ ...metadata,id:'platform-admin-user',displayName:'Platform Admin',preferredLocale:'en',status:'active' });
        await transaction.users.bindIdentity({ id:'platform-admin-binding',userId:'platform-admin-user',provider:'synthetic',providerSubject:'platform-admin',status:'active' });
        await transaction.users.provisionPlatformAssignment({ ...metadata,userId:'platform-admin-user',roleIds:['platform-admin'],status:'active' },null);
        await transaction.tenants.createMembership({ ...metadata,id: 'membership-a',userId: 'login-user',tenantId: 'tenant-a',status: 'active',roleIds: ['viewer'],dataScopes: [{ dimension: 'branch',values: ['baghdad'] }] });
    });
    const runtime = await openLocalAuthentication(database.appUrl,config), analytics = new MockAnalyticsRepository([]);
    const app = await buildApi({ analyticsRepository: analytics,dimensionValues: analytics,planner: null,
        administration: { provisionEmployee:runtime.provisionEmployee,provisionWorkspaceEmployee:runtime.provisionWorkspaceEmployee,unitOfWork: store,directory: store.directory,profiles: store.profiles,dataReady: async () => true,authenticate: async headers => (await runtime.principal(headers)).binding.id },readiness: { persistence: runtime.ready } },{ localAuth: runtime,identityMode: 'local',corsOrigins: config.origins });
    const hash = (await runtime.auth.$context).password.hash;
    const provision = (userId = 'login-user',email = 'synthetic@example.test') => provisionLocalIdentity(new PostgresLocalIdentityProvisioner(database.migrator),{ userId,email,operatorReference: 'isolated-test',expectedUserVersion: 1,activateUser: true,enableIdentity: true },password,hash);
    return { database,store,runtime,app,provision,async close() { await app.close(); await runtime.close(); await database.close(); } };
}
function login(app: Awaited<ReturnType<typeof fixture>>['app'],email = 'synthetic@example.test',value = password) {
    return app.inject({ method: 'POST',url: '/api/auth/login',headers: { origin: config.baseUrl },payload: { email,password: value } });
}
function cookies(response: { headers: Record<string,unknown> }): string {
    const raw = response.headers['set-cookie'];
    return (Array.isArray(raw) ? raw : [raw]).map(value => String(value).split(';')[0]).join('; ');
}
test('platform admin can atomically create a login-ready employee without exposing the password', { skip: !enabled },async () => {
    const system = await fixture();
    try {
        const created = await system.runtime.provisionEmployee('platform-admin-binding',{ displayName:'New Employee',preferredLocale:'ar',email:'employee@example.test',password });
        assert.equal(created.status,'active'); assert.equal(created.identity.loginHint,'employee@example.test');
        assert.equal((await system.database.app.query('SELECT count(*)::int count FROM control.users WHERE id=$1',[created.id])).rows[0].count,1);
        const account=(await system.database.admin.query('SELECT password FROM auth.account JOIN auth."user" ON auth."user".id=auth.account."userId" WHERE auth."user".email=$1',['employee@example.test'])).rows[0];
        assert.ok(account.password.length>64); assert.notEqual(account.password,password);
        const signedIn=await login(system.app,'employee@example.test'); assert.equal(signedIn.statusCode,200);
        const before=(await system.database.admin.query('SELECT count(*)::int count FROM control.users')).rows[0].count;
        await assert.rejects(system.runtime.provisionEmployee('platform-admin-binding',{ displayName:'Duplicate',preferredLocale:'en',email:'employee@example.test',password }));
        assert.equal((await system.database.admin.query('SELECT count(*)::int count FROM control.users')).rows[0].count,before);
        const audit=await system.database.admin.query("SELECT * FROM control.authentication_security_events WHERE user_id=$1 AND event='local_identity_provisioned'",[created.id]);
        assert.equal(audit.rowCount,1); assert.ok(!JSON.stringify(audit.rows).includes(password));
        await assert.rejects(system.runtime.provisionEmployee('missing-binding',{ displayName:'Denied',preferredLocale:'en',email:'denied@example.test',password }));
    } finally { await system.close(); }
});
test('local auth: stable subject, reviewed hashing, safe login failures and no signup/linking', { skip: !enabled },async () => {
    const system = await fixture();
    try {
        const binding = await system.provision();
        assert.notEqual(binding.subject,'synthetic@example.test');
        const account = (await system.database.admin.query('SELECT password FROM auth.account')).rows[0];
        assert.notEqual(account.password,password); assert.ok(account.password.length>64);
        const success = await login(system.app); assert.equal(success.statusCode,200); assert.ok(!success.body.includes('token'));
        const cookie = cookies(success); assert.match(String(success.headers['set-cookie']),/HttpOnly/i); assert.match(cookie,/dabboos/);
        assert.match(String(success.headers['set-cookie']),/SameSite=Lax/);
        const me = await system.app.inject({ url: '/api/auth/me',headers: { cookie,'x-demo-user-id': 'no-membership','x-product-user-id': 'no-membership' } });
        assert.equal(me.json().user.id,'login-user');
        const known = await login(system.app,'synthetic@example.test','incorrect password'),unknown = await login(system.app,'unknown@example.test','incorrect password');
        assert.equal(known.statusCode,401); assert.equal(unknown.statusCode,401); assert.deepEqual(known.json(),unknown.json());
        for (const route of ['sign-up/email','sign-in/social','link-social','request-password-reset']) assert.equal((await system.app.inject({ method: 'POST',url: `/api/auth/${route}`,payload: {},headers: { origin: config.baseUrl } })).statusCode,404);
        assert.equal((await system.app.inject({ url: '/api/auth/me',headers: { 'x-demo-user-id': 'login-user' } })).statusCode,401);
        const duplicate = new PostgresLocalIdentityProvisioner(system.database.migrator);
        const hash = (await system.runtime.auth.$context).password.hash;
        await assert.rejects(provisionLocalIdentity(duplicate,{ userId: 'no-membership',email: 'synthetic@example.test',operatorReference: 'test',expectedUserVersion: 1,activateUser: true,enableIdentity: true },password,hash));
        assert.equal((await system.database.app.query("SELECT count(*)::int count FROM control.identities WHERE user_id='no-membership'")).rows[0].count,0);
        assert.equal((await system.database.admin.query('SELECT count(*)::int count FROM auth."user"')).rows[0].count,1);
    } finally { await system.close(); }
});
test('sessions: persistence, expiry, logout, revocation and disabled product/binding on next request', { skip: !enabled },async () => {
    const system = await fixture();
    try {
        const binding = await system.provision();
        let cookie = cookies(await login(system.app));
        const frameworkPool = createAuthenticationPool(system.database.appUrl);
        try {
            const provider = new BetterAuthLocalProvider(createLocalAuth(frameworkPool,new PostgresAuthenticationDirectory(system.database.app),config));
            assert.equal((await resolveAuthenticatedPrincipal(provider,system.runtime.directory,cookie))?.user.id,'login-user');
        } finally { await frameworkPool.end(); }
        await system.database.app.query("UPDATE control.users SET status='suspended' WHERE id='login-user'");
        assert.equal((await system.app.inject({ url: '/api/auth/me',headers: { cookie } })).statusCode,401);
        assert.equal((await login(system.app)).statusCode,401);
        await system.database.app.query("UPDATE control.users SET status='active' WHERE id='login-user'");
        await system.database.app.query("UPDATE control.identities SET status='disabled' WHERE id=$1",[binding.identityId]);
        assert.equal((await system.app.inject({ url: '/api/auth/me',headers: { cookie } })).statusCode,401);
        assert.equal((await login(system.app)).statusCode,401);
        await system.database.app.query("UPDATE control.identities SET status='active' WHERE id=$1",[binding.identityId]);
        await system.database.admin.query('UPDATE auth.session SET "expiresAt"=now()-interval \'1 second\'');
        assert.equal((await system.app.inject({ url: '/api/auth/me',headers: { cookie } })).statusCode,401);
        cookie=cookies(await login(system.app));
        assert.equal((await system.app.inject({ method: 'POST',url: '/api/auth/logout',headers: { cookie,origin: config.baseUrl },payload: {} })).statusCode,200);
        assert.equal((await system.app.inject({ url: '/api/auth/me',headers: { cookie } })).statusCode,401);
        cookie=cookies(await login(system.app));
        const second=cookies(await login(system.app));
        assert.equal((await system.app.inject({ method: 'POST',url: '/api/auth/revoke-sessions',headers: { cookie,origin: config.baseUrl },payload: {} })).statusCode,200);
        for (const revoked of [cookie,second]) assert.equal((await system.app.inject({ url: '/api/auth/me',headers: { cookie: revoked } })).statusCode,401);
        assert.equal((await system.database.admin.query('SELECT count(*)::int count FROM auth.session')).rows[0].count,0);
    } finally { await system.close(); }
});
test('authorization remains fresh: membership, cross-tenant, roles and scopes; login grants no membership', { skip: !enabled },async () => {
    const system = await fixture();
    try {
        const binding = await system.provision(); await system.provision('no-membership','none@example.test');
        const cookie=cookies(await login(system.app));
        const headers = { cookie,'x-tenant-id': 'tenant-a','x-locale': 'en' };
        assert.equal((await system.app.inject({ url: '/api/tenant-profile',headers })).statusCode,200);
        assert.equal((await system.app.inject({ url: '/api/tenant-profile',headers: { ...headers,'x-tenant-id': 'tenant-b' } })).statusCode,403);
        const noAccess = cookies(await login(system.app,'none@example.test'));
        assert.equal((await system.app.inject({ url: '/api/tenant-profile',headers: { ...headers,cookie: noAccess } })).statusCode,403);
        assert.ok(!(await system.app.inject({ url: '/api/demo-capabilities',headers })).json().permissions.includes('dashboard:create'));
        await system.database.app.query("UPDATE control.membership_roles SET role_id='analyst' WHERE membership_id='membership-a'");
        assert.ok((await system.app.inject({ url: '/api/demo-capabilities',headers })).json().permissions.includes('dashboard:create'));
        await system.database.app.query("UPDATE control.membership_scopes SET value='basra' WHERE membership_id='membership-a'");
        const snapshot = await system.store.directory.tenantAccess(binding.identityId,'tenant-a');
        assert.ok(JSON.stringify(resolveTenantAccess(snapshot!,binding.identityId,'tenant-a','en')).includes('basra'));
        assert.ok(!JSON.stringify(resolveTenantAccess(snapshot!,binding.identityId,'tenant-a','en')).includes('baghdad'));
        await system.database.app.query("UPDATE control.memberships SET status='suspended' WHERE id='membership-a'");
        assert.equal((await system.app.inject({ url: '/api/tenant-profile',headers })).statusCode,403);
    } finally { await system.close(); }
});
test('authentication boundaries: CSRF, bounded account failures, fixed secure cookies and no audit secrets', { skip: !enabled },async () => {
    const system = await fixture();
    try {
        await system.provision();
        assert.equal((await system.app.inject({ method: 'POST',url: '/api/auth/login',headers: { origin: 'https://evil.example.test' },payload: { email: 'synthetic@example.test',password } })).statusCode,403);
        for (let attempt=0; attempt<8; attempt++) assert.equal((await login(system.app,'synthetic@example.test','bad passphrase')).statusCode,401);
        assert.equal((await login(system.app)).statusCode,429);
        const audit = (await system.database.admin.query('SELECT * FROM control.authentication_security_events')).rows;
        assert.ok(!JSON.stringify(audit).includes(password)); assert.ok(!JSON.stringify(audit).includes('synthetic@example.test'));
        const pool = createAuthenticationPool(system.database.appUrl);
        try {
            const secureAuth = createLocalAuth(pool,system.runtime.directory,{ ...config,baseUrl: 'https://analytics.example.test',origins: ['https://analytics.example.test'],secure: true });
            const response = await secureAuth.handler(new Request('https://analytics.example.test/api/auth/sign-in/email',{ method: 'POST',headers: { 'content-type': 'application/json',origin: 'https://analytics.example.test' },body: JSON.stringify({ email: 'synthetic@example.test',password }) }));
            assert.equal(response.status,200); assert.match(response.headers.getSetCookie().join(';'),/Secure/); assert.match(response.headers.getSetCookie().join(';'),/HttpOnly/);
        } finally { await pool.end(); }
    } finally { await system.close(); }
});

test('employee authority is checked before hashing and checked again after concurrent revocation',{skip:!enabled},async()=>{
 const system=await fixture();
 const context=await system.runtime.auth.$context,original=context.password.hash;
 let hashes=0;
 try {
  context.password.hash=async value=>{hashes++;return original(value);};
  await assert.rejects(system.runtime.provisionEmployee('missing-binding',{displayName:'Denied',preferredLocale:'en',email:'denied@example.test',password}),/PLATFORM_FORBIDDEN/);
  assert.equal(hashes,0);
  context.password.hash=async value=>{
   hashes++;
   await system.database.app.query("UPDATE control.platform_assignments SET status='suspended' WHERE user_id='platform-admin-user'");
   return original(value);
  };
  const before=(await system.database.admin.query('SELECT count(*)::int count FROM control.users')).rows[0].count;
  await assert.rejects(system.runtime.provisionEmployee('platform-admin-binding',{displayName:'Revoked',preferredLocale:'en',email:'revoked@example.test',password}),/PLATFORM_FORBIDDEN/);
  assert.equal(hashes,1);
  assert.equal((await system.database.admin.query('SELECT count(*)::int count FROM control.users')).rows[0].count,before);
  assert.equal((await system.database.admin.query("SELECT count(*)::int count FROM auth.\"user\" WHERE email='revoked@example.test'")).rows[0].count,0);
 }finally{context.password.hash=original;await system.close();}
});
test('candidate provisioning is idempotent; membership grants access, viewer cannot create users and suspension takes effect',{skip:!enabled},async()=>{
 const system=await fixture();
 try {
  const created=await system.runtime.provisionEmployee('platform-admin-binding',{displayName:'New Employee',preferredLocale:'ar',email:'employee@example.test',password});
  const administration=createAdministration(system.store);
  for(let attempt=0;attempt<2;attempt++)await administration.provisionUserForTenant('platform-admin-binding',{userId:created.id,tenantId:'tenant-a'});
  assert.equal((await system.database.admin.query('SELECT count(*)::int count FROM control.tenant_assignment_candidates WHERE user_id=$1',[created.id])).rows[0].count,1);
  const cookie=cookies(await login(system.app,'employee@example.test'));
  const headers={cookie,'x-tenant-id':'tenant-a','x-locale':'ar'};
  assert.equal((await system.app.inject({url:'/api/tenant-profile',headers})).statusCode,403);
  await system.store.write(transaction=>transaction.tenants.createMembership({id:'employee-membership',userId:created.id,tenantId:'tenant-a',status:'active',roleIds:['viewer'],dataScopes:[{dimension:'branch',values:['baghdad']}],version:1,createdAt:'2026-10-12',updatedAt:'2026-10-12'}));
  assert.equal((await system.app.inject({url:'/api/tenant-profile',headers})).statusCode,200);
  const denied=await system.app.inject({method:'POST',url:'/api/platform/users',headers:{...headers,origin:config.baseUrl},payload:{displayName:'Denied',preferredLocale:'en',email:'denied@example.test',password}});
  assert.equal(denied.statusCode,403);
  await system.database.app.query("UPDATE control.users SET status='suspended' WHERE id=$1",[created.id]);
  assert.equal((await system.app.inject({url:'/api/auth/me',headers})).statusCode,401);
  assert.equal((await login(system.app,'employee@example.test')).statusCode,401);
 }finally{await system.close();}
});

async function workspaceAdministrator(system:Awaited<ReturnType<typeof fixture>>,provision=true) {
 if(provision)await system.provision();
 await system.store.write(async transaction=>{
  const membership=(await transaction.tenants.getMembership('tenant-a','membership-a'))!;
  await transaction.tenants.updateMembership({...membership,roleIds:['admin'],dataScopes:[]},membership.version);
 });
 return {cookie:cookies(await login(system.app)),origin:config.baseUrl,'x-tenant-id':'tenant-a'};
}
test('workspace Create User saves credentials and roles together; a tenant admin without platform authority creates an immediately usable login',{skip:!enabled},async()=>{
 const system=await fixture();try {
  const headers=await workspaceAdministrator(system);
  const payload={displayName:'Workspace Employee',preferredLocale:'ar',email:'workspace@example.test',password,roleIds:['viewer']};
  const created=await system.app.inject({method:'POST',url:'/api/tenants/tenant-a/admin/users',headers,payload});
  assert.equal(created.statusCode,200,created.body);
  const {user,membership}=created.json();assert.equal(user.status,'active');assert.deepEqual(membership.roleIds,['viewer']);assert.equal(membership.tenantId,'tenant-a');
  assert.ok(!created.body.includes(password));assert.ok(!created.body.includes('passwordHash'));
  const signedIn=await login(system.app,'workspace@example.test');assert.equal(signedIn.statusCode,200);
  const employeeHeaders={cookie:cookies(signedIn),'x-tenant-id':'tenant-a'};
  assert.equal((await system.app.inject({url:'/api/tenant-profile',headers:employeeHeaders})).statusCode,200);
  assert.equal((await system.app.inject({url:'/api/tenant-profile',headers:{...employeeHeaders,'x-tenant-id':'tenant-b'}})).statusCode,403);
  assert.equal((await system.database.app.query('SELECT count(*)::int count FROM control.tenant_assignment_candidates WHERE user_id=$1',[user.id])).rows[0].count,0);
  assert.equal((await system.database.app.query('SELECT count(*)::int count FROM control.platform_assignments WHERE user_id=$1',[user.id])).rows[0].count,0);
  const duplicate=await system.app.inject({method:'POST',url:'/api/tenants/tenant-a/admin/users',headers,payload});assert.equal(duplicate.statusCode,409);
  assert.equal((await system.database.admin.query('SELECT count(*)::int count FROM auth."user" WHERE email=$1',[payload.email])).rows[0].count,1);
 }finally{await system.close();}
});
test('workspace creation rejects viewer, cross-tenant and platform roles before hashing and rechecks concurrent role revocation',{skip:!enabled},async()=>{
 const system=await fixture(),context=await system.runtime.auth.$context,original=context.password.hash;let hashes=0;
 try {
  await system.provision();const binding=(await system.database.app.query("SELECT id FROM control.identities WHERE user_id='login-user' AND provider='local'")).rows[0].id;
  const actor={identityId:binding,tenantId:'tenant-a',locale:'en' as const},input={displayName:'Denied',preferredLocale:'en' as const,email:'denied-workspace@example.test',password,roleIds:['viewer']};
  context.password.hash=async value=>{hashes++;return original(value);};
  await assert.rejects(system.runtime.provisionWorkspaceEmployee(actor,input),/ADMIN_FORBIDDEN/);
  await assert.rejects(system.runtime.provisionWorkspaceEmployee({...actor,tenantId:'tenant-b'},input));assert.equal(hashes,0);
  await workspaceAdministrator(system,false);
  await assert.rejects(system.runtime.provisionWorkspaceEmployee(actor,{...input,roleIds:['platform-admin']}));assert.equal(hashes,0);
  context.password.hash=async value=>{
   hashes++;
   await system.store.write(async transaction=>{
    const membership=(await transaction.tenants.getMembership('tenant-a','membership-a'))!;
    await transaction.tenants.updateMembership({...membership,roleIds:['viewer']},membership.version);
   });
   return original(value);
  };
  await assert.rejects(system.runtime.provisionWorkspaceEmployee(actor,input));assert.equal(hashes,1);
  assert.equal((await system.database.admin.query('SELECT count(*)::int count FROM auth."user" WHERE email=$1',[input.email])).rows[0].count,0);
 }finally{context.password.hash=original;await system.close();}
});
test('workspace user creation rolls back product user, credential, identity and membership when final audit fails',{skip:!enabled},async()=>{
 const system=await fixture();try {
  await workspaceAdministrator(system);
  const binding=(await system.database.app.query("SELECT id FROM control.identities WHERE user_id='login-user' AND provider='local'")).rows[0].id;
  const count=async()=>Object.fromEntries(await Promise.all(['control.users','auth."user"','auth.account','control.identities','control.memberships','control.authentication_security_events'].map(async table=>[table,(await system.database.admin.query(`SELECT count(*)::int count FROM ${table}`)).rows[0].count])));
  const before=await count();
  const failing=createAdministration({write:operation=>system.store.write(transaction=>operation({...transaction,appendAudit:async()=>{throw new Error('Synthetic audit failure');}}))});
  await assert.rejects(failing.createWorkspaceUser({identityId:binding,tenantId:'tenant-a',locale:'en'},{displayName:'Rollback',preferredLocale:'en',email:'rollback-workspace@example.test',roleIds:['viewer']},{subject:crypto.randomUUID(),passwordHash:'synthetic-hash'}),/Synthetic audit failure/);
  assert.deepEqual(await count(),before);
 }finally{await system.close();}
});
test('workspace creation retains role delegation and data-scope ceilings',{skip:!enabled},async()=>{
 const system=await fixture(),context=await system.runtime.auth.$context,original=context.password.hash;let hashes=0;
 try {
  const headers=await workspaceAdministrator(system);
  const binding=(await system.database.app.query("SELECT id FROM control.identities WHERE user_id='login-user' AND provider='local'")).rows[0].id;
  const actor={identityId:binding,tenantId:'tenant-a',locale:'en' as const};
  const input={displayName:'Denied',preferredLocale:'en' as const,email:'scope-denied@example.test',password,roleIds:['admin']};
  context.password.hash=async value=>{hashes++;return original(value);};
  await system.store.write(async transaction=>{
   await transaction.tenants.createCustomRole({id:'limited-manager',name:'Manager',description:'Synthetic limited manager',scope:'tenant',tenantId:'tenant-a',protected:false,permissions:['users:view','users:manage','roles:view','roles:manage'],metricDomains:['sales'],version:1,createdAt:'2026-10-12',updatedAt:'2026-10-12'});
   const membership=(await transaction.tenants.getMembership('tenant-a','membership-a'))!;
   await transaction.tenants.updateMembership({...membership,roleIds:['limited-manager']},membership.version);
  });
  await assert.rejects(system.runtime.provisionWorkspaceEmployee(actor,input),/ROLE_ESCALATION/);
  await system.store.write(async transaction=>{
   const membership=(await transaction.tenants.getMembership('tenant-a','membership-a'))!;
   await transaction.tenants.updateMembership({...membership,roleIds:['admin'],dataScopes:[{dimension:'branch',values:['baghdad']}]},membership.version);
  });
  await assert.rejects(system.runtime.provisionWorkspaceEmployee(actor,{...input,roleIds:['viewer']}),/SCOPE/);
  const emptyRoles=await system.app.inject({method:'POST',url:'/api/tenants/tenant-a/admin/users',headers,payload:{...input,roleIds:[]}});assert.equal(emptyRoles.statusCode,400);
  const wrongTenant=await system.app.inject({method:'POST',url:'/api/tenants/tenant-b/admin/users',headers,payload:input});assert.equal(wrongTenant.statusCode,403);
  assert.equal(hashes,0);
  assert.equal((await system.database.admin.query('SELECT count(*)::int count FROM auth."user" WHERE email=$1',[input.email])).rows[0].count,0);
 }finally{context.password.hash=original;await system.close();}
});
