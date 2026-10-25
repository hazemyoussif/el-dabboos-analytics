import type { OdooOrmConfig } from './config.ts';
import { ormId, ormObject } from './json.ts';
import { OdooOrmError, OdooOrmTransport } from './transport.ts';

export const ormModels = ['res.company', 'sale.order', 'sale.order.line', 'account.move', 'account.move.line',
  'res.partner', 'res.users', 'res.currency', 'res.country.state', 'business.line', 'account.account',
  'account.payment', 'account.partial.reconcile', 'account.full.reconcile', 'account.journal', 'res.partner.category',
  'product.product', 'product.template', 'product.category', 'product.brand', 'uom.uom',
  'stock.quant', 'stock.lot', 'stock.location', 'stock.warehouse', 'stock.move', 'stock.move.line',
  'purchase.order', 'purchase.order.line'] as const;
export type OdooOrmModel = typeof ormModels[number];
export type OrmDomain = readonly unknown[];
export type OrmRow = Record<string, unknown>;
const companyModels: readonly OdooOrmModel[] = ['sale.order', 'sale.order.line', 'account.move', 'account.move.line',
  'account.payment', 'account.partial.reconcile', 'account.full.reconcile', 'account.journal',
  'stock.quant', 'stock.move', 'stock.move.line', 'stock.warehouse', 'purchase.order', 'purchase.order.line'];

export class OdooOrmClient {
  private uid: number | undefined;
  private readonly transport: OdooOrmTransport;
  readonly config: OdooOrmConfig;
  constructor(config: OdooOrmConfig, fetcher: typeof fetch = fetch) {
    this.config = { ...config, companyIds: [...config.companyIds] };
    this.transport = new OdooOrmTransport(this.config, fetcher);
  }

  async authenticate(): Promise<void> {
    this.uid = undefined;
    const version = ormObject(await this.transport.call('common', 'version', []));
    if (!Array.isArray(version.server_version_info) || version.server_version_info[0] !== '18') throw new OdooOrmError('version');
    const identity = await this.transport.call('common', 'authenticate', [this.config.database, this.config.login, this.config.apiKey, {}]);
    if (identity === false) throw new OdooOrmError('authentication');
    this.uid = Number(ormId(identity));
  }

  private async execute(model: OdooOrmModel, method: string, args: unknown[], options: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.uid) throw new OdooOrmError('authentication');
    if (!ormModels.includes(model)) throw new OdooOrmError('permission');
    const context = { allowed_company_ids: this.config.companyIds.map(Number), active_test: false, lang: 'en_US', tz: 'UTC' };
    return this.transport.call('object', 'execute_kw', [this.config.database, this.uid, this.config.apiKey, model, method, args, { ...options, context }]);
  }

  async readable(model: OdooOrmModel): Promise<boolean> {
    return await this.execute(model, 'check_access_rights', ['read'], { raise_exception: false }) === true;
  }

  async fields(model: OdooOrmModel): Promise<Record<string, OrmRow>> {
    const fields = ormObject(await this.execute(model, 'fields_get', [], { attributes: ['type', 'relation', 'store', 'translate', 'company_dependent'] }));
    return Object.fromEntries(Object.entries(fields).map(([name, metadata]) => [name, ormObject(metadata)]));
  }

  private scopedDomain(model: OdooOrmModel, domain: OrmDomain): unknown[] {
    if (model === 'res.company') return [['id', 'in', this.config.companyIds.map(Number)], ...domain];
    if (companyModels.includes(model)) return [['company_id', 'in', this.config.companyIds.map(Number)], ...domain];
    return [...domain];
  }

  async searchRead(model: OdooOrmModel, domain: OrmDomain, fields: readonly string[], options: { limit?: number; afterId?: string; rawRelations?: boolean } = {}): Promise<OrmRow[]> {
    const limit = options.limit ?? this.config.batchSize;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > this.config.batchSize) throw new Error('Invalid Odoo ORM page limit');
    const scoped = this.scopedDomain(model, domain);
    if (options.afterId) scoped.push(['id', '>', Number(ormId(options.afterId))]);
    const result = await this.execute(model, 'search_read', [scoped], { fields: [...new Set(['id', ...fields])], limit, order: 'id asc', ...(options.rawRelations ? { load: null } : {}) });
    if (!Array.isArray(result) || result.length > limit) throw new OdooOrmError('response');
    return result.map(ormObject);
  }

  async count(model: OdooOrmModel, domain: OrmDomain): Promise<string> {
    const result = await this.execute(model, 'search_count', [this.scopedDomain(model, domain)]);
    if (typeof result !== 'string' || !/^\d+$/.test(result)) throw new OdooOrmError('response');
    return result;
  }

  async lastId(model: OdooOrmModel, domain: OrmDomain): Promise<string | null> {
    const result = await this.execute(model, 'search_read', [this.scopedDomain(model, domain)], { fields: ['id'], limit: 1, order: 'id desc' });
    if (!Array.isArray(result) || result.length > 1) throw new OdooOrmError('response');
    return result.length ? ormId(ormObject(result[0]).id) : null;
  }

  async aggregate(model: 'sale.order' | 'account.move', domain: OrmDomain, fields: readonly string[], groupBy: readonly string[] = []): Promise<OrmRow[]> {
    const result = await this.execute(model, 'read_group', [this.scopedDomain(model, domain), fields, groupBy], { lazy: false, limit: 5001 });
    if (!Array.isArray(result) || result.length > 5000 || (!groupBy.length && result.length > 1)) throw new OdooOrmError('response');
    return result.map(ormObject);
  }
}
