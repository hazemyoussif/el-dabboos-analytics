import { applyDashboardPatch, isMetricId, widgetTypes, governedPalettes, semanticCatalog, validateDashboardPatch, validateDashboardSpec } from '@el-dabboos/domain';
import type { DashboardGenerationRequest, DashboardPatch, DashboardPlanner, DashboardSpec, LLMProvider, Locale, PlannerCapabilities, StructuredOutputRequest, TenantProfile } from '@el-dabboos/domain';
import { compileDashboardEditPlan, dashboardEditPlanSchema, editPlanSchemaIssues, validateDashboardEditPlan } from './edit-plan.ts';
import { compileDashboardGenerationPlan, GenerationVisualizationError, dashboardGenerationPlanSchema, generationPlanSchemaIssues, validateDashboardGenerationPlan } from './generation-plan.ts';
import { dashboardTemplates } from './templates.ts';
import { AuthorizationError } from './security.ts';
import { projectProviderSchema } from './provider-schema.ts';
import { structuredOutputPreview } from './structured-diagnostics.ts';
import type { StructuredPlannerDiagnostic } from './structured-diagnostics.ts';

export class StructuredPlanningError extends Error {
  readonly code = 'INVALID_STRUCTURED_OUTPUT';
  constructor(message: string) { super(message); }
}
export interface StructuredPlannerOptions { maxRepairAttempts?: number; clock?: () => Date; diagnostics?: (event: StructuredPlannerDiagnostic) => void }
const safeError = (error: unknown): string => {
  if (!(error instanceof Error)) return 'Output failed validation.';
  if (error.message.startsWith('Metric outside')) return error.message;
  if (/^Invalid DashboardEditPlan|^Invalid DashboardGenerationPlan|^Invalid DashboardSpec|^Invalid DashboardPatch|^Invalid dashboard widget|^Invalid dashboard date range|^Duplicate widget ID|^Unknown widget|^Duplicate widget|^Invalid replacement|^Unsupported patch operation/.test(error.message)) return error.message;
  return 'Output failed schema, semantic, or authorization validation.';
};
const validationDetail = (error: unknown): string => error instanceof GenerationVisualizationError
  ? error.issues.slice(0, 4).join('. ').slice(0, 800) : safeError(error);
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
  return { market: marketContext(profile, clock), metrics, templates, actions: capabilities.actions,
    visualizations: { types: widgetTypes, governedPalettes, rules: [
      'KPI: one series, no dimension. Line: shared dimension, matching type/unit. Area: ordered date/month/quarter/year, compatible series, no stacking.',
      'Bar: grouped compatible series. orientation vertical or horizontal. No stacking.',
      'Pie and Treemap: exactly one additive or appropriate snapshot series, non-time categorical grouping; no ratio, duration, comparison, moving average, running total or percentage contribution. Pie variant pie or donut.',
      'Combo: two to four same-unit/type series with a common dimension and one axis; code determines how each series is drawn during generation.',
      'Table: shared grouping, mixed units allowed.',
      'Visualization edits preserve metrics, filters, analysis and layout unless explicitly requested. Reject semantically incompatible conversions. Never generate chart-library properties.'
    ] } };
}
export class StructuredDashboardPlanner implements DashboardPlanner {
  private readonly maxRepairAttempts: number;
  private readonly clock: () => Date;
  constructor(private readonly provider: LLMProvider, private readonly options: StructuredPlannerOptions = {}) {
    this.maxRepairAttempts = options.maxRepairAttempts ?? 1;
    if (!Number.isInteger(this.maxRepairAttempts) || this.maxRepairAttempts < 0 || this.maxRepairAttempts > 2)
      throw new Error('maxRepairAttempts must be between 0 and 2');
    this.clock = options.clock ?? (() => new Date());
  }
  private async validated<T>(request: StructuredOutputRequest, operation: 'generation' | 'edit', validate: (output: unknown) => T): Promise<T> {
    const messages = [...request.messages];
    for (let attempt = 0; attempt <= this.maxRepairAttempts; attempt++) {
      const response = await this.provider.generateStructured({ ...request, messages: [...messages] });
      try { return validate(response.output); }
      catch (error) {
        if (this.options.diagnostics) {
          try {
            const issues = operation === 'generation' ? generationPlanSchemaIssues(response.output) : editPlanSchemaIssues(response.output);
            const stage = issues.length ? 'schema' : error instanceof AuthorizationError ? 'authorization' : 'semantic';
            this.options.diagnostics({ operation, attempt: attempt + 1, schemaName: request.responseFormat.name,
              providerId: response.providerId, stage, details: issues.length ? issues : [{ instancePath: '', keyword: stage, message: validationDetail(error) }],
              outputPreview: structuredOutputPreview(response.output) });
          } catch { /* Diagnostics must never change planner behavior. */ }
        }
        if (attempt === this.maxRepairAttempts) {
          if (error instanceof AuthorizationError) throw error;
          throw new StructuredPlanningError(`Provider output remained invalid after ${attempt + 1} attempt(s): ${safeError(error)}`);
        }
        messages.push({ role: 'user', content: `The prior JSON did not satisfy the required ${operation === 'generation' ? 'DashboardGenerationPlan' : 'DashboardEditPlan'} contract. ${validationDetail(error)} Return a corrected JSON object only, using the same authorized options.` });
      }
    }
    throw new StructuredPlanningError('Provider output remained invalid.');
  }
  async generate(request: DashboardGenerationRequest): Promise<DashboardSpec> {
    const capabilities = requireCapabilities(request.capabilities, 'ai:generate');
    if (request.context.tenantId !== request.tenantProfile.id || request.locale !== request.context.locale) throw new StructuredPlanningError('Invalid planner context.');
    const now = this.clock();
    const context = authorizedContext(capabilities, request.tenantProfile, () => now);
    const messages: StructuredOutputRequest['messages'] = [
      { role: 'system', content: `Produce only a DashboardGenerationPlan JSON object. Choose business metrics, dimensions, dates and filters only from the authorized context. Include analysis only when explicitly requested: otherwise omit comparisons, moving averages, running totals, percentage contribution, ranking and top N. Omit requestedPresentation entirely when the user did not request presentation; deterministic code supplies visualization defaults. Summary widgets have exactly one series and no dimension; their only explicit type is KPI. Grouped widgets require a dimension and exclude KPI. If presentation was explicitly requested, set its required type and only type-valid options from the schema. Preserve explicit palette, orientation and other requested options. Do not invent helpful analyses or decorations. For an explicit top N request, set topNDirection='top' and topNLimit=N; for bottom N set topNDirection='bottom' and topNLimit=N. Put the metric used for selection first in the widget series and apply Top-N only to that first relevant series. Enable ranking only when explicitly requested or required by the governed analytics semantics. Never drop an explicit Top-N request. Compact example: "Show the top 5 branches by revenue as horizontal blue bars" means widget intent {"dimension":"branch","series":[{"metric":"revenue","topNDirection":"top","topNLimit":5}],"requestedPresentation":{"type":"bar","orientation":"horizontal","palette":"blue"}}. Never emit raw colors or renderer configuration. Supply bilingual titles. Omit optional fields when unused. For explicit date requests use a datePreset or a complete dateFrom/dateTo pair, never both; otherwise omit date fields and code defaults to current_year. Do not generate IDs, grid positions, layout, persistence metadata or tenant/security information. Use only authorized metrics and templates. Keep calculations in the deterministic analytics engine. Do not generate SQL, React, chart-library options, arbitrary expressions, or policy filters. Context: ${JSON.stringify(context)}` },
      { role: 'user', content: request.prompt },
    ];
    const schema = structuredClone(dashboardGenerationPlanSchema);
    schema.$defs.series.properties.metric.enum = [...capabilities.metricIds];
    return this.validated({ messages, locale: request.locale, responseFormat: { name: 'dashboard_generation_plan', jsonSchema: projectProviderSchema(schema), strict: true } }, 'generation', output => {
      validateDashboardGenerationPlan(output);
      const spec = compileDashboardGenerationPlan(output, request.tenantProfile, request.locale, now);
      assertAllowed(spec, capabilities);
      return spec;
    });
  }
  async edit(current: DashboardSpec, instruction: string, tenantProfile: TenantProfile, capabilitiesInput?: PlannerCapabilities): Promise<DashboardPatch> {
    const capabilities = requireCapabilities(capabilitiesInput, 'ai:edit');
    validateDashboardSpec(current);
    assertAllowed(current, capabilities);
    const context = authorizedContext(capabilities, tenantProfile, this.clock);
    const messages: StructuredOutputRequest['messages'] = [
      { role: 'system', content: `Produce only a DashboardEditPlan JSON object for the current dashboard. Express only explicitly requested changes; omitted fields preserve existing values. Never reconstruct unchanged widgets or series. Use existing widgetId/seriesId references for sparse update_widget/update_series changes. Merge presentation and analysis fields; null clears optional values and false clears analysis flags. If changing chart type, explicitly clear any now-incompatible presentation fields; update_series presentation:null clears an existing Combo mark without inventing marks. add_widget uses business intent with optional type/presentation and series analysis; code owns new IDs, defaults and placement. Analysis uses comparison, movingAverageWindow and topNDirection/topNLimit; omit unchanged analysis fields. Never generate IDs except references to existing widgets/series. Never generate layout for semantic/presentation edits; use the separate update_layout with an existing widget reference only for explicitly requested position/size edits. set_filters merges supplied dateRange/dimensions; null clears dateRange, an empty dimensions array clears business filters. Use only authorized metrics and bounded edit operations. Do not generate SQL, React, renderer configuration, raw colors, arbitrary expressions, or policy filters. Context: ${JSON.stringify(context)}` },
      { role: 'user', content: `Current DashboardSpec v2: ${JSON.stringify(current)}\nEdit instruction: ${instruction}` },
    ];
    return this.validated({ messages, locale: current.locale as Locale, responseFormat: { name: 'dashboard_edit_plan', jsonSchema: projectProviderSchema(dashboardEditPlanSchema), strict: true } }, 'edit', output => {
      validateDashboardEditPlan(output);
      const patch = compileDashboardEditPlan(current, output);
      validateDashboardPatch(patch);
      const next = applyDashboardPatch(current, patch);
      assertAllowed(next, capabilities);
      return patch;
    });
  }
}
