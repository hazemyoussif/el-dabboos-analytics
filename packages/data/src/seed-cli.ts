import { DatabaseSync } from 'node:sqlite';
import { createSqliteSchema, insertFacts } from './sqlite.ts';
import { generateSeedFacts } from './seed.ts';
import { getTenantProfile, tenantProfiles } from '@el-dabboos/domain';

const path = process.argv[2] ?? 'demo.db';
const requestedTenant = process.argv[3];
if (requestedTenant && !getTenantProfile(requestedTenant)) throw new Error('Unknown demo tenant');
const tenantIds = requestedTenant ? [requestedTenant as keyof typeof tenantProfiles] : Object.keys(tenantProfiles) as Array<keyof typeof tenantProfiles>;
const db = new DatabaseSync(path);
try {
  createSqliteSchema(db);
  for (const tenantId of tenantIds) {
    const count = Number(db.prepare('SELECT count(*) AS total FROM analytics_facts WHERE tenant_id = ?').get(tenantId)?.total ?? 0);
    if (count !== 0) throw new Error(`Tenant ${tenantId} already has ${count} facts; choose a fresh database or tenant`);
  }
  for (const tenantId of tenantIds) {
    const facts = generateSeedFacts(tenantId);
    insertFacts(db, facts);
    process.stdout.write(`Seeded ${facts.length} facts for tenant ${tenantId} in ${path}\n`);
  }
} finally { db.close(); }
