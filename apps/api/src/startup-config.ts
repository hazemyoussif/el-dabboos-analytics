/** Explicit startup allowlist: never serialize process.env or provider requests. */
export function startupSummary(config: { analyticsProvider: string; dashboardPath: string; plannerMode: string;
  modelId?: string | undefined; baseUrl?: string | undefined; diagnostics: boolean; port: number }, apiKey?: string): string {
  const safe = (value: string) => {
    let result = value.replace(/[\r\n\t]/gu, ' ');
    if (apiKey) result = result.split(apiKey).join('[redacted]');
    return result.slice(0, 240);
  };
  const endpoint = (value?: string) => {
    if (!value) return undefined;
    try { const url = new URL(value); return safe(`${url.protocol}//${url.host}${url.pathname}`); }
    catch { return '[invalid endpoint]'; }
  };
  return `API configuration ${JSON.stringify({ analyticsProvider: safe(config.analyticsProvider),
    dashboardDatabase: safe(config.dashboardPath), plannerMode: safe(config.plannerMode),
    ...(config.plannerMode === 'structured' ? { modelId: safe(config.modelId ?? ''), endpoint: endpoint(config.baseUrl) } : {}),
    structuredDiagnostics: config.diagnostics, port: config.port })}`;
}
