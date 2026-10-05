import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { provisionLocalMart, verifyLocalMart } from '../../../packages/data/src/postgres/local-mart.ts';

async function compose(command: 'up'|'stop'|'start'|'down'): Promise<void> {
  if (!process.env.MART_LOCAL_ADMIN_PASSWORD) throw new Error('Local mart bootstrap configuration required');
  const file = fileURLToPath(new URL('../../../infra/postgres/compose.mart.yml',import.meta.url));
  const args = ['compose','-f',file,command,...(command==='up' ? ['-d','--wait'] : [])];
  await new Promise<void>((resolve,reject) => {
    // Never print Compose interpolation/configuration or raw Docker errors.
    const child = spawn('docker',args,{ stdio: 'ignore',env: process.env });
    child.on('error',() => reject(new Error('Local mart Docker operation failed')));
    child.on('close',code => code===0 ? resolve() : reject(new Error('Local mart Docker operation failed')));
  });
}
try {
  const [command,...extra] = process.argv.slice(2);
  if (extra.length) throw new Error('Unexpected local mart arguments');
  if (command==='bootstrap') await provisionLocalMart(process.env);
  else if (command==='verify') process.stdout.write(`${JSON.stringify(await verifyLocalMart(process.env))}\n`);
  else if (command==='up' || command==='stop' || command==='start' || command==='down') await compose(command);
  else throw new Error('Use up, bootstrap, verify, stop, start or down');
  if (command!=='verify') process.stdout.write(`Local mart ${command} completed; persistent volume retained.\n`);
} catch {
  process.stderr.write('Local mart operation failed. Check local configuration, Docker availability and role/schema boundaries; credentials are not printed.\n');
  process.exitCode = 1;
}
