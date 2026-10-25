import type { OdooOrmClient, OdooOrmModel, OrmDomain, OrmRow } from './client.ts';
import { ormId } from './json.ts';

export interface OdooOrmRead {
  model: OdooOrmModel;
  domain: OrmDomain;
  fields: readonly string[];
  deadline: number;
  rawRelations?: boolean;
}

/** Stable ID keysets bounded by an observed upper ID. This is deliberately not SourceBatchReader:
 * separate calls cannot assert frozenRevision, sourceAsOf or complete-scope deletion evidence. */
export async function* readOdooOrmPages(client: OdooOrmClient, request: OdooOrmRead): AsyncIterable<OrmRow[]> {
  const upperId = await client.lastId(request.model, request.domain);
  if (!upperId) return;
  const domain = [...request.domain, ['id', '<=', Number(upperId)]];
  let afterId: string | undefined;
  let rowsRead = 0;
  for (;;) {
    if (Date.now() >= request.deadline) throw new Error('Odoo ORM extraction deadline exceeded');
    const rows = await client.searchRead(request.model, domain, request.fields, { ...(afterId ? { afterId } : {}), ...(request.rawRelations ? { rawRelations: true } : {}) });
    if (!rows.length) return;
    let previous = afterId ? BigInt(afterId) : 0n;
    for (const row of rows) {
      const identity = ormId(row.id);
      if (BigInt(identity) <= previous || BigInt(identity) > BigInt(upperId)) throw new Error('Invalid Odoo ORM page order');
      previous = BigInt(identity);
    }
    rowsRead += rows.length;
    if (rowsRead > client.config.maxRows) throw new Error('Odoo ORM extraction row bound exceeded');
    afterId = ormId(rows.at(-1)!.id);
    yield rows;
    if (rows.length < client.config.batchSize || afterId === upperId) return;
  }
}
