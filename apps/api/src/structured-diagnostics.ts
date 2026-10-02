import type { StructuredPlannerDiagnostic } from '@el-dabboos/application';

export const structuredDiagnosticsEnabled = (value: string | undefined): boolean => value === 'true';

/** Terminal-only development record. The planner has already removed free text from outputPreview. */
export function formatStructuredDiagnostic(event: StructuredPlannerDiagnostic, apiKey?: string): string {
  const line = JSON.stringify({ event: 'llm_structured_validation_failed', ...event });
  let redacted = line;
  if (apiKey) {
    const escapedKey = JSON.stringify(apiKey).slice(1, -1);
    for (const token of new Set([apiKey, escapedKey])) redacted = redacted.replaceAll(token, '[REDACTED_CREDENTIAL]');
  }
  return redacted.length > 6000 ? `${redacted.slice(0, 6000)}...[truncated]` : redacted;
}
