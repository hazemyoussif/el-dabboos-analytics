export interface OdooOrmConfig {
  url: string;
  database: string;
  login: string;
  apiKey: string;
  companyIds: readonly string[];
  timeoutMs: number;
  batchSize: number;
  maxRows: number;
}

function required(environment: Readonly<Record<string, string | undefined>>, key: string): string {
  const value = environment[key];
  if (!value || value.trim() !== value) throw new Error('Invalid Odoo ORM configuration');
  return value;
}

function bound(raw: string | undefined, fallback: number, maximum: number): number {
  const text = raw ?? String(fallback);
  if (!/^[1-9]\d*$/.test(text)) throw new Error('Invalid Odoo ORM limits');
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value > maximum) throw new Error('Invalid Odoo ORM limits');
  return value;
}

/** Operator-owned destination only. Never accepts a browser-supplied URL or a PG credential fallback. */
export function odooOrmConfig(environment: Readonly<Record<string, string | undefined>>): OdooOrmConfig {
  const url = new URL(required(environment, 'ODOO_ORM_URL'));
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Odoo ORM requires an HTTPS origin');
  }
  const companyIds = required(environment, 'ODOO_ORM_COMPANY_IDS').split(',');
  if (!companyIds.length || companyIds.length > 64 || new Set(companyIds).size !== companyIds.length ||
    companyIds.some(company => !/^[1-9]\d{0,8}$/.test(company))) throw new Error('Invalid Odoo ORM company scope');
  return {
    url: url.origin, database: required(environment, 'ODOO_ORM_DATABASE'),
    login: required(environment, 'ODOO_ORM_LOGIN'), apiKey: required(environment, 'ODOO_ORM_API_KEY'), companyIds,
    timeoutMs: bound(environment.ODOO_ORM_TIMEOUT_MS, 15000, 120000),
    batchSize: bound(environment.ODOO_ORM_BATCH_SIZE, 500, 1000),
    maxRows: bound(environment.ODOO_ORM_MAX_ROWS, 100000, 1000000),
  };
}
