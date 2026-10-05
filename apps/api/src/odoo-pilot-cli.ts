import { readFileSync } from 'node:fs';
import { executeOdooPilot, validateOdooPilotManifest } from './odoo-pilot.ts';

try {
  const [command,path,...extra] = process.argv.slice(2);
  if (!command || !path || extra.length) throw new Error('Usage: odoo:pilot register|run|status manifest.json');
  const manifest = validateOdooPilotManifest(JSON.parse(readFileSync(path,'utf8')));
  process.stdout.write(`${JSON.stringify(await executeOdooPilot(command,manifest,process.env))}\n`);
} catch {
  // Driver errors can contain source identifiers or connection values. Do not print them.
  process.stderr.write('Pilot command failed. Check local configuration, manifest and persisted checkpoint; no approval or serving operation was performed.\n');
  process.exitCode = 1;
}
