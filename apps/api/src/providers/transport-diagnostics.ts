import type { StructuredOutputRequest } from '@el-dabboos/domain';
export interface ProviderHttpDiagnostic {
  event: 'llm_provider_http_failed'; httpStatus: number; providerId: string; modelId: string;
  schemaName: string; operation: 'generation' | 'edit' | 'structured';
  upstreamCode?: string | number; upstreamType?: string; upstreamStatus?: string; message?: string;
}
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const codes = new Set(['INVALID_ARGUMENT', 'RESOURCE_EXHAUSTED', 'UNAUTHENTICATED', 'PERMISSION_DENIED', 'UNAVAILABLE', 'DEADLINE_EXCEEDED', 'INTERNAL', 'NOT_FOUND', 'invalid_request_error', 'rate_limit_exceeded', 'invalid_api_key', 'model_not_found', 'server_error']);
/** Only bounded error envelopes are inspected. Arbitrary upstream strings are never echoed. */
export async function providerHttpDiagnostic(response: Response, request: StructuredOutputRequest, modelId: string, apiKey?: string): Promise<ProviderHttpDiagnostic> {
  const safe = (value: string) => (apiKey ? value.replaceAll(apiKey, '[redacted]') : value).replace(/[\r\n\t]/gu, ' ').slice(0, 120);
  const schemaName = request.responseFormat.name;
  const event: ProviderHttpDiagnostic = { event: 'llm_provider_http_failed', httpStatus: response.status,
    providerId: `openai-compatible:${safe(modelId)}`, modelId: safe(modelId), schemaName: safe(schemaName),
    operation: schemaName === 'dashboard_generation_plan' ? 'generation' : schemaName === 'dashboard_patch_v2' ? 'edit' : 'structured' };
  const reader = response.body?.getReader();
  if (!reader) return event;
  try {
    let length = 0; const chunks: Uint8Array[] = [];
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > 16_384) { await reader.cancel(); return event; }
      chunks.push(value);
    }
    const payload: unknown = JSON.parse(Buffer.concat(chunks).toString());
    const error = record(payload) && record(payload.error) ? payload.error : undefined;
    if (!error) return event;
    if (typeof error.code === 'number' && Number.isInteger(error.code) && error.code >= 100 && error.code <= 599) event.upstreamCode = error.code;
    else if (typeof error.code === 'string' && codes.has(error.code)) event.upstreamCode = error.code;
    if (typeof error.type === 'string' && codes.has(error.type)) event.upstreamType = error.type;
    if (typeof error.status === 'string' && codes.has(error.status)) event.upstreamStatus = error.status;
    // Classify known failure categories into fixed messages: never repeat provider text,
    // which may contain prompts, secrets, filter values, or customer data.
    if (typeof error.message === 'string') {
      if (/schema|structured.output/iu.test(error.message)) event.message = 'Provider rejected the structured-output schema.';
      else if (/rate.limit|quota/iu.test(error.message)) event.message = 'Provider reported a rate or quota limit.';
      else if (/credential|api.key|authentication/iu.test(error.message)) event.message = 'Provider reported an authentication failure.';
      else event.message = 'Provider error message withheld.';
    }
  } catch { /* Unreadable/oversized error diagnostics do not change HTTP classification. */ }
  finally { reader.releaseLock(); }
  return event;
}
