import { DatabaseSync } from 'node:sqlite';
import { createSqliteSchema, insertFacts } from './sqlite.ts';
import { generateSeedFacts } from './seed.ts';

const path = process.argv[2] ?? 'demo.db';
const tenantId = process.argv[3] ?? 'demo';
if (!tenantId.trim()) throw new Error('tenantId must not be empty');
const db = new DatabaseSync(path);
try {
  createSqliteSchema(db);
  const count = Number(db.prepare('SELECT count(*) AS total FROM analytics_facts WHERE tenant_id = ?').get(tenantId)?.total ?? 0);
  if (count !== 0) throw new Error(`Tenant ${tenantId} already has ${count} facts; choose a new database or tenant`);
  const facts = generateSeedFacts(tenantId);
  insertFacts(db, facts);
  process.stdout.write(`Seeded ${facts.length} facts for tenant ${tenantId} in ${path}\n`);
} finally { db.close(); }
