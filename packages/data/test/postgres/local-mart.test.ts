import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { provisionLocalMartRoles, localMartLogins } from '../../src/postgres/local-mart.ts';
import { verifyMartRuntimeRole } from '../../src/postgres/session.ts';
import { database, enabled } from './support.ts';

test('local role provisioning: repeatable, safely quotes generated passwords and refuses existing overlapping membership atomically', { skip: !enabled },async () => {
  const fixture = await database(false);
  // Random values include SQL punctuation to exercise server-side literal escaping, never logged.
  const passwords = Object.fromEntries(Object.keys(localMartLogins).map(identity => [identity,`${randomBytes(32).toString('hex')}'\\;`])) as Record<keyof typeof localMartLogins,string>;
  try {
    await provisionLocalMartRoles(fixture.admin,passwords);
    await provisionLocalMartRoles(fixture.admin,passwords);
    for (const [identity,login] of Object.entries(localMartLogins)) {
      const url = new URL(process.env.PG_TEST_ADMIN_URL!);
      // Match the isolated fixture database while keeping its randomly generated credential private.
      url.pathname=(await fixture.admin.query('SELECT current_database() name')).rows[0].name;
      url.username=login; url.password=passwords[identity as keyof typeof passwords];
      const pool = new Pool({ connectionString: url.toString() });
      try {
        const row = (await pool.query('SELECT current_user identity,pg_has_role(current_user,$1,\'MEMBER\') member',[`dabboos_${identity}`])).rows[0];
        assert.equal(row.identity,login); assert.equal(row.member,true);
        if (identity==='runtime') await verifyMartRuntimeRole(pool);
      } finally { await pool.end(); }
    }
    for (const group of ['dabboos_runtime','pg_monitor']) {
      await fixture.admin.query(`GRANT ${group} TO mart_ingestor_login`);
      try { await assert.rejects(provisionLocalMartRoles(fixture.admin,passwords),/Unsafe local mart role boundary/); }
      finally { await fixture.admin.query(`REVOKE ${group} FROM mart_ingestor_login`); }
    }
    await provisionLocalMartRoles(fixture.admin,passwords);
  } finally {
    await fixture.close();
  }
});
