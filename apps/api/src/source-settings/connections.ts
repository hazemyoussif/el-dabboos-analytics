import type { TenantSourceConnectionOption, TenantSourceSettings } from '@el-dabboos/domain';
import { validateSourceDefinition } from '@el-dabboos/domain';
import type { OdooSourceConfig } from '@el-dabboos/data';
import { odooSourceConfig } from '@el-dabboos/data';

interface RegisteredConnection extends TenantSourceConnectionOption {
  tenantId: string; host: string; port: number; database: string; user: string; passwordEnv: string;
}
function parseConnection(value: unknown): RegisteredConnection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid tenant source connection registry');
  const connection = value as RegisteredConnection;
  const keys = ['tenantId', 'sourceId', 'connectionRef', 'companyIds', 'host', 'port', 'database', 'user', 'passwordEnv'];
  if (Object.keys(value).sort().join(',') !== keys.sort().join(',')) throw new Error('Invalid tenant source connection registry');
  validateSourceDefinition({ sourceId: connection.sourceId, tenantId: connection.tenantId, connectionRef: connection.connectionRef, companyIds: connection.companyIds, type: 'odoo-postgres', enabled: true });
  if (!['host', 'database', 'user'].every(key => typeof connection[key as 'host'] === 'string' && /^[a-zA-Z0-9_.:/-]{1,200}$/.test(connection[key as 'host']))) throw new Error('Invalid tenant source destination');
  if (!Number.isSafeInteger(connection.port) || connection.port < 1 || connection.port > 65535 || !/^[A-Z][A-Z0-9_]{0,99}$/.test(connection.passwordEnv)) throw new Error('Invalid tenant source credentials reference');
  return connection;
}
/** Operator-owned destinations and secrets. Browser drafts can select only exact tenant/source references. */
export class TenantSourceConnections {
  private readonly registered: RegisteredConnection[];
  constructor(private readonly environment: Readonly<Record<string, string | undefined>>) {
    const input: unknown = JSON.parse(environment.TENANT_SOURCE_CONNECTIONS ?? '[]');
    if (!Array.isArray(input) || input.length > 100) throw new Error('Invalid tenant source connection registry');
    this.registered = input.map(parseConnection);
    const references = this.registered.map(connection => `${connection.tenantId}:${connection.connectionRef}`);
    if (new Set(references).size !== references.length) throw new Error('Duplicate tenant source connection reference');
  }
  options(tenantId: string): TenantSourceConnectionOption[] {
    const options = this.registered.filter(connection => connection.tenantId === tenantId).map(connection => ({ connectionRef: connection.connectionRef, sourceId: connection.sourceId, companyIds: [...connection.companyIds] }));
    if (!options.some(option => option.connectionRef === 'odoo-staging-main') && this.environment.ANALYTICS_SOURCE_TENANT_ID === tenantId && this.environment.ANALYTICS_SOURCE_ID) {
      const sourceId = this.environment.ANALYTICS_SOURCE_ID, companyIds = this.environment.ODOO_SOURCE_COMPANY_IDS?.split(',') ?? [];
      validateSourceDefinition({ tenantId, sourceId, connectionRef: 'odoo-staging-main', companyIds, type: 'odoo-postgres', enabled: true });
      options.push({ connectionRef: 'odoo-staging-main', sourceId, companyIds });
    }
    return options;
  }
  resolve(tenantId: string, settings: TenantSourceSettings): OdooSourceConfig {
    const option = this.options(tenantId).find(connection => connection.connectionRef === settings.connectionRef && connection.sourceId === settings.sourceId);
    if (!option || settings.companyIds.some(company => !option.companyIds.includes(company))) throw new Error('Source connection unavailable');
    const registered = this.registered.find(connection => connection.tenantId === tenantId && connection.connectionRef === settings.connectionRef);
    const config = registered ? this.registeredConfig(registered, settings) : odooSourceConfig(this.environment, { tenantId, sourceId: settings.sourceId });
    return { ...config, companyIds: [...settings.companyIds], ...settings.parameters, connection: { ...config.connection, connectionTimeoutMillis: settings.parameters.connectTimeoutMs } };
  }
  private registeredConfig(connection: RegisteredConnection, settings: TenantSourceSettings): OdooSourceConfig {
    const password = this.environment[connection.passwordEnv];
    if (!password) throw new Error('Source credentials unavailable');
    return { tenantId: connection.tenantId, sourceId: connection.sourceId, companyIds: [...settings.companyIds], ...settings.parameters,
      connection: { host: connection.host, port: connection.port, database: connection.database, user: connection.user, password, max: 1,
        connectionTimeoutMillis: settings.parameters.connectTimeoutMs, idleTimeoutMillis: 1000, options: '-c default_transaction_read_only=on -c idle_in_transaction_session_timeout=5000' } };
  }
}
