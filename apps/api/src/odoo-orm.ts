import { OdooOrmClient, odooOrmConfig, discoverOdooOrm, compareOdooOrm } from '@el-dabboos/data';

function comparisonArguments(args: readonly string[]) {
  const flags = ['--from', '--to', '--time-zone', '--currency'];
  if (args.length !== 8 || flags.some((flag, index) => args[index * 2] !== flag)) {
    throw new Error('Usage: odoo:orm compare --from YYYY-MM-DD --to YYYY-MM-DD --time-zone ZONE --currency CODE');
  }
  return { from: args[1]!, to: args[3]!, timeZone: args[5]!, currency: args[7]! };
}

/** Offline operator composition only; no source/control registration, mart access or activation. */
export async function executeOdooOrmProbe(args: readonly string[], environment: Readonly<Record<string, string | undefined>>, fetcher: typeof fetch = fetch) {
  const [command, ...flags] = args;
  if (command !== 'check' && command !== 'compare') throw new Error('Expected Odoo ORM check or compare');
  if (command === 'check' && flags.length) throw new Error('Unexpected Odoo ORM check flags');
  const request = command === 'compare' ? comparisonArguments(flags) : undefined;
  const client = new OdooOrmClient(odooOrmConfig(environment), fetcher);
  if (request) return compareOdooOrm(client, request);
  return discoverOdooOrm(client);
}
