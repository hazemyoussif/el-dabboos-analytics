import {executeOdooOrmRefresh} from './odoo-orm-refresh.ts';
import { executeOdooOrmStage } from './odoo-orm-stage.ts';
import { executeOdooOrmProbe } from './odoo-orm.ts';
import { OdooOrmError, OwnedStageCaptureError } from '@el-dabboos/data';
import { executeOdooOrmSync } from './odoo-orm-sync.ts';

async function credentialsFromStdin(): Promise<Record<string, string>> {
  let input = '';
  for await (const chunk of process.stdin) {
    input += String(chunk);
    if (input.length > 16384) throw new Error('Odoo ORM credential input exceeds limit');
  }
  const parsed: unknown = JSON.parse(input);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid Odoo ORM credential input');
  const entries = Object.entries(parsed);
  if (entries.some(([key, value]) => !/^ODOO_ORM_[A-Z_]+$/.test(key) || typeof value !== 'string')) throw new Error('Invalid Odoo ORM credential input');
  return Object.fromEntries(entries);
}

async function main() {
  const args = process.argv.slice(2);
  const useStdin = args[0] === '--credentials-stdin';
  const environment = useStdin ? { ...process.env, ...await credentialsFromStdin() } : process.env;
  const command = useStdin ? args.slice(1) : args;
  const result = command[0] === 'refresh' ? await executeOdooOrmRefresh(command.slice(1),environment) : command[0]?.startsWith('stage:') ? await executeOdooOrmStage(command,environment) : command[0] === 'sync' ? await executeOdooOrmSync(command.slice(1), environment) : await executeOdooOrmProbe(command, environment);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if ('schemaCompatible' in result && !result.schemaCompatible) process.exitCode = 1;
  if ('observedChecksPassed' in result && !result.observedChecksPassed) process.exitCode = 1;
  if ('status' in result && result.status === 'failed') process.exitCode = 1;
}

try { await main(); } catch (error) {
  const code = error instanceof OwnedStageCaptureError ? `${error.phase}:${error.code}` : error instanceof OdooOrmError ? error.code : 'configuration_or_validation';
  process.stderr.write(`Odoo ORM check failed (${code}). Inspect the job status before retrying.\n`);
  process.exitCode = 1;
}
