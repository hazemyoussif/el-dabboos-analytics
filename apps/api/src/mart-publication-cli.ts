import { readFileSync } from 'node:fs';
import { executeMartPublication } from './mart-publication.ts';
try {
  const [command,path,...extra] = process.argv.slice(2);
  if (!command || !path || extra.length) throw new Error('Usage: mart:publication certify|certify-derived|approve|promote|bind|activate-local manifest.json');
  process.stdout.write(`${JSON.stringify(await executeMartPublication(command,JSON.parse(readFileSync(path,'utf8')),process.env))}\n`);
} catch {
  process.stderr.write('Publication operation failed. Inspect governed evidence and target state using protected operator configuration. No source extraction was performed.\n');
  process.exitCode = 1;
}
