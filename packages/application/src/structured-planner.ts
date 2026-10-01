import { applyDashboardPatch, dashboardPatchSchema, dashboardSpecSchema, isMetricId, semanticCatalog, validateDashboardPatch, validateDashboardSpec } from '@el-dabbous/domain';
import type { DashboardGenerationRequest, DashboardPatch, DashboardPlanner, DashboardSpec, LLMProvider, Locale, PlannerCapabilities, StructuredOutputRequest, TenantProfile } from '@el-dabbous/domain';
import { dashboardTemplates } from './templates.ts';
import { AuthorizationError } from './security.ts';

export class StructuredPlanningError extends Error {
  readonly code = 'INVALID_STRUCTURED_OUTPUT';
  constructor(message: string) { super(message); }
}
export interface StructuredPlannerOptions { maxRepairAttempts?: number; clock?: () => Date }
const safeError = (error: unknown): string => {
  if (!(error instanceof Error)) return 'Output failed validation.';
  if (error.message.startsWith('Metric outside')) return error.message;
  if (/^Invalid DashboardSpec|^Invalid DashboardPatch|^Invalid dashboard widget|^Invalid dashboard date range|^Duplicate widget ID|^Unknown widget|^Duplicate widget|^Invalid replacement|^Unsupported patch operation/.test(error.message)) return error.message;
  return 'Output failed schema, semantic, or authorization validation.';
};
function requireCapabilities(capabilities: PlannerCapabilities | undefined, action: 'ai:generate' | 'ai:edit'): PlannerCapabilities {
  if (!capabilities || !capabilities.actions.includes(action) || !capabilities.metricIds.length ||
    capabilities.metricIds.some(id => !isMetricId(id))) throw new StructuredPlanningError('Authorized planner capabilities are required.');
  return capabilities;
}
function assertAllowed(spec: DashboardSpec, capabilities: PlannerCapabilities): void {
  const allowed = new Set(capabilities.metricIds);
  for (const widget of spec.widgets) for (const series of widget.series)
    if (!allowed.has(series.metric)) throw new AuthorizationError('METRIC_FORBIDDEN', 'Metric outside authorized planner capabilities.');
}
function marketContext(profile: TenantProfile, clock: () => Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: profile.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(clock());
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '';
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  return { tenantId: profile.id, countryCode: profile.countryCode, defaultLocale: profile.defaultLocale,
    arabicDialect: profile.arabicDialect, reportingCurrency: profile.reportingCurrency, timeZone: profile.timeZone, today };
}
function authorizedContext(capabilities: PlannerCapabilities, profile: TenantProfile, clock: () => Date) {
  const allowed = new Set(capabilities.metricIds);
  const metrics = Object.values(semanticCatalog).filter(metric => allowed.has(metric.id)).map(metric => ({
    id: metric.id, labels: metric.labels, descriptions: metric.descriptions, type: metric.type,
    semantics: metric.semantics, dimensions: metric.dimensions, unit: metric.presentation.unit,
  }));
  const templates = dashboardTemplates.filter(template => capabilities.templateIds.includes(template.id) &&
    template.widgets.every(widget => widget.series.every(series => allowed.has(series.metric)))).map(template => ({
    id: template.id, name: template.name, description: template.description, domain: template.domain,
    tags: template.tags, datePreset: template.datePreset,
  }));
  return { market: marketContext(profile, clock), metrics, templates, actions: capabilities.actions };
}
export class StructuredDashboardPlanner implements DashboardPlanner {
  private readonly maxRepairAttempts: number;
  private readonly clock: () => Date;
  constructor(private readonly provider: LLMProvider, options: StructuredPlannerOptions = {}) {
    this.maxRepairAttempts = options.maxRepairAttempts ?? 1;
    if (!Number.isInteger(this.maxRepairAttempts) || this.maxRepairAttempts < 0 || this.maxRepairAttempts > 2)
      throw new Error('maxRepairAttempts must be between 0 and 2');
    this.clock = options.clock ?? (() => new Date());
  }
  private async validated<T>(request: StructuredOutputRequest, validate: (output: unknown) => T): Promise<T> {
    const messages = [...request.messages];
    for (let attempt = 0; attempt <= this.maxRepairAttempts; attempt++) {
      const response = await this.provider.generateStructured({ ...request, messages: [...messages] });
      try { return validate(response.output); }
      catch (error) {
        if (attempt === this.maxRepairAttempts) {
          if (error instanceof AuthorizationError) throw error;
          throw new StructuredPlanningError(`Provider output remained invalid after ${attempt + 1} attempt(s): ${safeError(error)}`);
        }
        messages.push({ role: 'user', content: `The prior JSON did not satisfy the required v2 contract. ${safeError(error)} Return a corrected JSON object only, using the same authorized options.` });
      }
    }
    throw new StructuredPlanningError('Provider output remained invalid.');
  }
  async generate(request: DashboardGenerationRequest): Promise<DashboardSpec> {
    const capabilities = requireCapabilities(request.capabilities, 'ai:generate');
    if (request.context.tenantId !== request.tenantProfile.id || request.locale !== request.context.locale) throw new StructuredPlanningError('Invalid planner context.');
    const context = authorizedContext(capabilities, request.tenantProfile, this.clock);
    const messages: StructuredOutputRequest['messages'] = [
      { role: 'system', content: `Produce only a DashboardSpec v2 JSON object. Use only authorized metrics and templates. Keep calculations in the deterministic analytics engine. Do not generate SQL, React, chart-library options, arbitrary expressions, or policy filters. Context: ${JSON.stringify(context)}` },
      { role: 'user', content: request.prompt },
    ];
    return this.validated({ messages, locale: request.locale, responseFormat: { name: 'dashboard_spec_v2', jsonSchema: dashboardSpecSchema, strict: true } }, output => {
      validateDashboardSpec(output);
      assertAllowed(output, capabilities);
      return output;
    });
  }
  async edit(current: DashboardSpec, instruction: string, tenantProfile: TenantProfile, capabilitiesInput?: PlannerCapabilities): Promise<DashboardPatch> {
    const capabilities = requireCapabilities(capabilitiesInput, 'ai:edit');
    validateDashboardSpec(current);
    assertAllowed(current, capabilities);
    const context = authorizedContext(capabilities, tenantProfile, this.clock);
    const messages: StructuredOutputRequest['messages'] = [
      { role: 'system', content: `Produce only a DashboardPatch v2 JSON object for the current dashboard. Use only authorized metrics and bounded patch operations. Do not generate SQL, React, chart-library options, arbitrary expressions, or policy filters. Context: ${JSON.stringify(context)}` },
      { role: 'user', content: `Current DashboardSpec v2: ${JSON.stringify(current)}\nEdit instruction: ${instruction}` },
    ];
    return this.validated({ messages, locale: current.locale as Locale, responseFormat: { name: 'dashboard_patch_v2', jsonSchema: dashboardPatchSchema, strict: true } }, output => {
      validateDashboardPatch(output);
      const next = applyDashboardPatch(current, output);
      assertAllowed(next, capabilities);
      return output;
    });
  }
}
