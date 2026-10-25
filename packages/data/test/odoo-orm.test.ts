import assert from 'node:assert/strict';
import test from 'node:test';
import { odooOrmConfig } from '../src/odoo-orm/config.ts';
import { OdooOrmClient } from '../src/odoo-orm/client.ts';
import { ormDecimal, parseOdooJson } from '../src/odoo-orm/json.ts';
import { OdooOrmTransport } from '../src/odoo-orm/transport.ts';
import { readOdooOrmPages } from '../src/odoo-orm/pages.ts';
import { odooOrmPeriod } from '../src/odoo-orm/period.ts';
import { compareOdooOrm } from '../src/odoo-orm/comparison.ts';

const environment = { ODOO_ORM_URL: 'https://synthetic.invalid/', ODOO_ORM_DATABASE: 'synthetic',
  ODOO_ORM_LOGIN: 'synthetic-reader', ODOO_ORM_API_KEY: 'SYNTHETIC_SECRET_ONLY', ODOO_ORM_COMPANY_IDS: '1' };
const config = odooOrmConfig(environment);
interface RpcRequest { id: string; params: { service: string; method: string; args: unknown[] } }
function fakeOdoo(handle: (request: RpcRequest) => unknown): typeof fetch {
  return (async (_url, options) => {
    const request = JSON.parse(String(options?.body)) as RpcRequest;
    const result = handle(request);
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }));
  }) as typeof fetch;
}
function authenticated(handle: (args: unknown[]) => unknown): typeof fetch {
  return fakeOdoo(request => {
    if (request.params.method === 'version') return { server_version_info: [18, 0] };
    if (request.params.method === 'authenticate') return 7;
    return handle(request.params.args);
  });
}

test('ORM config requires HTTPS, distinct API credentials and explicit bounded companies', () => {
  assert.equal(config.url, 'https://synthetic.invalid');
  for (const url of ['http://synthetic.invalid', 'https://user:secret@synthetic.invalid', 'https://synthetic.invalid/?key=secret', 'https://synthetic.invalid/path']) {
    assert.throws(() => odooOrmConfig({ ...environment, ODOO_ORM_URL: url }));
  }
  assert.throws(() => odooOrmConfig({ ...environment, ODOO_ORM_COMPANY_IDS: '1,1' }));
  assert.throws(() => odooOrmConfig({ ...environment, ODOO_ORM_BATCH_SIZE: '1001' }));
  assert.throws(() => odooOrmConfig({ ODOO_SOURCE_PASSWORD: 'PG_SECRET' }));
});

test('wire numeric tokens retain large money and exponent values without JS rounding', () => {
  const result = parseOdooJson('{"amount":123456789012345678.123456,"small":1e-6,"id":7}') as Record<string, unknown>;
  assert.equal(ormDecimal(result.amount), '123456789012345678.123456');
  assert.equal(ormDecimal(result.small), '0.000001');
  assert.equal(result.id, '7');
  assert.equal(ormDecimal('-0.00'), '0.000000');
  assert.equal(ormDecimal('1.23e2'), '123.000000');
  for (const value of ['1.0000001', '1e100', 'NaN', 'Infinity', false, null, 123]) assert.throws(() => ormDecimal(value));
});

test('remote faults and transport errors never expose remote text or credentials', async () => {
  const faults: typeof fetch[] = [
    async () => { throw new Error(environment.ODOO_ORM_API_KEY); },
    async () => new Response('secret', { status: 502 }),
    async () => new Response(JSON.stringify({ error: { data: environment.ODOO_ORM_API_KEY } })),
    async () => new Response('x'.repeat(10), { headers: { 'content-length': '9000000' } }),
    fakeOdoo(() => { throw new Error(environment.ODOO_ORM_API_KEY); }),
  ];
  for (const fetcher of faults) {
    await assert.rejects(new OdooOrmTransport(config, fetcher).call('common', 'version', []), error => {
      assert.ok(error instanceof Error);
      assert.doesNotMatch(String(error), /SYNTHETIC_SECRET_ONLY/);
      return true;
    });
  }
});

test('client requires Odoo 18 authentication and enforces company scope plus read-only methods', async () => {
  const seen: unknown[][] = [];
  const client = new OdooOrmClient(config, authenticated(args => { seen.push(args); return [{ id: 1, company_id: [1, 'Synthetic'] }]; }));
  await assert.rejects(client.count('sale.order', []), /authentication/);
  await client.authenticate();
  await client.searchRead('sale.order', [['state', '=', 'sale']], ['amount_total']);
  const call = seen[0]!;
  assert.equal(call[4], 'search_read');
  assert.deepEqual(call[5], [[['company_id', 'in', [1]], ['state', '=', 'sale']]]);
  assert.deepEqual((call[6] as Record<string, unknown>).context, { allowed_company_ids: [1], active_test: false, lang: 'en_US', tz: 'UTC' });
  await assert.rejects(new OdooOrmClient(config, fakeOdoo(() => ({ server_version_info: [19] }))).authenticate(), /version/);
  await assert.rejects(new OdooOrmClient(config, fakeOdoo(request => request.params.method === 'version' ? { server_version_info: [18] } : false)).authenticate(), /authentication/);
});

test('keyset extraction rejects repeated/out-of-bound IDs and rows beyond configured capacity', async () => {
  for (const ids of [[2, 1], [1, 1], [1, 4]]) {
    const client = new OdooOrmClient({ ...config, batchSize: 2 }, authenticated(args => {
      const options = args[6] as Record<string, unknown>;
      return options.order === 'id desc' ? [{ id: 3 }] : ids.map(id => ({ id }));
    }));
    await client.authenticate();
    await assert.rejects(async () => { for await (const page of readOdooOrmPages(client, { model: 'sale.order', domain: [], fields: [], deadline: Date.now() + 1000 })) void page; }, /page order/);
  }
  const client = new OdooOrmClient({ ...config, batchSize: 2, maxRows: 1 }, authenticated(args =>
    (args[6] as Record<string, unknown>).order === 'id desc' ? [{ id: 2 }] : [{ id: 1 }, { id: 2 }]));
  await client.authenticate();
  await assert.rejects(async () => { for await (const page of readOdooOrmPages(client, { model: 'sale.order', domain: [], fields: [], deadline: Date.now() + 1000 })) void page; }, /row bound/);
});

test('business calendar converts Baghdad midnight to UTC and refuses invalid/unbounded periods', () => {
  assert.deepEqual(odooOrmPeriod('2026-09-01', '2026-09-30', 'Asia/Baghdad'), {
    from: '2026-09-01', to: '2026-09-30', orderFrom: '2026-08-31 21:00:00', orderBefore: '2026-09-30 21:00:00',
  });
  assert.throws(() => odooOrmPeriod('2026-09-31', '2026-10-01', 'UTC'));
  assert.throws(() => odooOrmPeriod('2024-01-01', '2026-10-01', 'UTC'));
});

test('comparison detects changes and never claims freeze, storage precision or certification', async () => {
  let scan = 0;
  const client = new OdooOrmClient(config, authenticated(args => {
    const [,,, model, method] = args;
    if (model === 'res.currency') return [{ id: 87, name: 'IQD' }];
    if (method === 'search_count') return 1;
    if (method === 'read_group') return [{ amount_total: 100, amount_untaxed_signed: 100 }];
    if ((args[6] as Record<string, unknown>).order === 'id desc') return [{ id: 1 }];
    scan++;
    return [{ id: 1, company_id: [1, 'Synthetic'], currency_id: [87, 'IQD'], company_currency_id: [87, 'IQD'],
      amount_total: scan === 2 ? 101 : 100, amount_untaxed_signed: 100, write_date: '2026-09-01 00:00:00' }];
  }));
  const result = await compareOdooOrm(client, { from: '2026-09-01', to: '2026-09-30', timeZone: 'Asia/Baghdad', currency: 'IQD' });
  assert.equal(result.observedChecksPassed, false);
  assert.equal(result.checks[0]!.repeatedReadStable, false);
  assert.equal(result.certifiedIngestion, false);
  assert.equal(result.consistency, 'independent_requests');
  assert.equal(result.monetaryPrecision, 'wire_preserved_storage_unproven');
});
