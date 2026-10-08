import { resolve } from 'node:path';
import { historicalMonths } from './historical-months.ts';

/** Operator inputs only; SQL, attribution and mapper semantics remain adapter-owned. */
export function historicalJobOptions(args: readonly string[]) {
  if (args[0] !== 'backfill') throw new Error('Usage: odoo:history backfill --tenant el-dabboos-iq --from YYYY-MM-01 --to YYYY-MM-DD --checkpoint-dir PATH [--retry-incomplete]');
  const values = new Map<string,string>();
  let retryIncomplete = false;
  for (let index=1;index<args.length;index++) {
    const key = args[index]!;
    if (key === '--retry-incomplete') { if (retryIncomplete) throw new Error('Duplicate retry option'); retryIncomplete=true; continue; }
    if (!['--tenant','--from','--to','--checkpoint-dir'].includes(key) || values.has(key) || !args[index+1] || args[index+1]!.startsWith('--')) throw new Error('Invalid historical job option');
    values.set(key,args[++index]!);
  }
  const tenantId=values.get('--tenant');
  if (tenantId !== 'el-dabboos-iq') throw new Error('Historical source mapping is approved only for el-dabboos-iq');
  const from=values.get('--from'),to=values.get('--to'),directory=values.get('--checkpoint-dir');
  if (!from || !to || !directory) throw new Error('Explicit complete-month range and checkpoint directory required');
  const periods=historicalMonths(from,to);
  return {tenantId,periods,outputDirectory:resolve(directory),retryIncomplete};
}
