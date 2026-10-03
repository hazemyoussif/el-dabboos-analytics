import { parentPort, workerData } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';
import { migrateMetadata } from '../../src/metadata/migrations.ts';
const db = new DatabaseSync(workerData.path);
try {
    migrateMetadata(db);
    parentPort?.postMessage('ready');
}
finally {
    db.close();
}
