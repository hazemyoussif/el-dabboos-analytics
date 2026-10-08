import { link,open,unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';

/** Publish only a fully written, fsynced file; exclusive link refuses replacement. */
export async function writeHistoricalCheckpoint(path: string,value: unknown) {
  const temporary = `${path}.${randomUUID()}.pending`;
  const file = await open(temporary,'wx',0o600);
  try { await file.writeFile(JSON.stringify(value,null,2)+'\n'); await file.sync(); }
  finally { await file.close(); }
  try {
    await link(temporary,path);
    const directory = await open(dirname(path),'r');
    try { await directory.sync(); } finally { await directory.close(); }
  } finally { await unlink(temporary); }
}
