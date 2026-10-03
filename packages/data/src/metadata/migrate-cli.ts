import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { migrateMetadata, metadataSchemaVersion } from './migrations.ts';
import { seedDemoAdministration } from './demo-seed.ts';
const [path, mode, ...extra] = process.argv.slice(2);
if (!path || extra.length || (mode !== undefined && mode !== '--demo'))
    throw new Error('Usage: metadata:migrate <metadata-db-path> [--demo]. Back up the metadata file before upgrade.');
const db = new DatabaseSync(resolve(path));
try {
    migrateMetadata(db, mode === '--demo' ? { reconcile: seedDemoAdministration } : {});
    process.stdout.write(`Metadata schema ${metadataSchemaVersion} ready.\n`);
}
finally {
    db.close();
}
