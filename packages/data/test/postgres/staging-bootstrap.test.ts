import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { bootstrapStaging } from '../../../application/src/staging-bootstrap.ts';
import { PostgresStagingBootstrap } from '../../src/control/staging-bootstrap.ts';
import { PostgresAdministrationStore } from '../../src/control/administration.ts';
import { createAdministration } from '../../../application/src/index.ts';
import { validateStagingBootstrap } from '../../../domain/src/staging-bootstrap.ts';
import { controlDatabase } from './control-support.ts';
import { enabled } from './support.ts';
const manifest = JSON.parse(await readFile(new URL('../../../../infra/staging/bootstrap.example.json',import.meta.url),'utf8'));
test('staging manifest rejects unknown secrets, unsafe identities and missing tenant admins', () => {
    validateStagingBootstrap(manifest);
    for (const value of [{ ...manifest,password: 'secret' },{ ...manifest,platformOperator: { ...manifest.platformOperator,provider: 'synthetic' } },{ ...manifest,tenantUsers: manifest.tenantUsers.filter(user => !user.roleIds.includes('admin')) },{ ...manifest,sources: [{ ...manifest.sources[0],connectionRef: 'postgres://secret' }] },{ ...manifest,sources: [{ ...manifest.sources[0],companyIds: [] }] },{ ...manifest,sources: [{ ...manifest.sources[0],password: 'secret' }] }]) assert.throws(() => validateStagingBootstrap(value));
});
test('fresh staging bootstrap is atomic, concurrent idempotent and inactive', { skip: !enabled },async () => {
    const database = await controlDatabase();
    try {
        const bootstrap = new PostgresStagingBootstrap(database.app);
        const results = await Promise.all([bootstrapStaging(bootstrap,manifest),bootstrapStaging(bootstrap,manifest)]);
        assert.deepEqual(results.map(result => result.status).sort(),['already_provisioned','provisioned']);
        assert.equal((await database.app.query('SELECT count(*)::int count FROM control.customers')).rows[0].count,1);
        assert.equal((await database.app.query("SELECT count(*)::int count FROM control.identities WHERE status='disabled'")).rows[0].count,4);
        assert.equal((await database.app.query("SELECT count(*)::int count FROM control.memberships WHERE status='suspended'")).rows[0].count,3);
        assert.equal((await database.app.query('SELECT count(*)::int count FROM control.source_mappings')).rows[0].count,0);
        await assert.rejects(bootstrapStaging(bootstrap,{ ...manifest,customer: { ...manifest.customer,name: 'Conflicting' } }));
        await assert.rejects(bootstrapStaging(bootstrap,{ ...manifest,bootstrapId: 'another-id' }));
        await assert.rejects(createAdministration(new PostgresAdministrationStore(database.app)).resolvePlatform(manifest.platformOperator.identityId));
        await assert.rejects(database.app.query('DELETE FROM control.deployment_bootstraps'));
    } finally { await database.close(); }
});
test('bootstrap source failure rolls back users, tenant, roles, audit and receipt', { skip: !enabled },async () => {
    const database = await controlDatabase();
    try {
        await database.admin.query("CREATE FUNCTION control.fail_bootstrap_source() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected source failure'; END $$; CREATE TRIGGER fail_source BEFORE INSERT ON control.source_definitions FOR EACH ROW EXECUTE FUNCTION control.fail_bootstrap_source()");
        await assert.rejects(bootstrapStaging(new PostgresStagingBootstrap(database.app),manifest));
        for (const table of ['customers','tenants','users','identities','roles','admin_audit_events','deployment_bootstraps','bootstrap_state']) assert.equal((await database.app.query(`SELECT count(*)::int count FROM control.${table}`)).rows[0].count,0);
    } finally { await database.close(); }
});

test('bootstrap refuses unrelated metadata even without a completed bootstrap flag', { skip: !enabled },async () => {
    const database = await controlDatabase();
    try {
        await database.app.query("INSERT INTO control.customers VALUES ('unrelated','Existing','active',1,'2026-01-01','2026-01-01')");
        await assert.rejects(bootstrapStaging(new PostgresStagingBootstrap(database.app),manifest),/empty control metadata/);
        assert.equal((await database.app.query('SELECT count(*)::int count FROM control.customers')).rows[0].count,1);
        assert.equal((await database.app.query('SELECT count(*)::int count FROM control.deployment_bootstraps')).rows[0].count,0);
    } finally { await database.close(); }
});
