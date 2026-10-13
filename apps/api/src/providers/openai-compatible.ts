import { providerHttpDiagnostic } from './transport-diagnostics.ts';
import type { ProviderHttpDiagnostic } from './transport-diagnostics.ts';
import type { LLMProvider, StructuredOutputRequest, StructuredOutputResponse } from '@el-dabboos/domain';

export interface OpenAICompatibleConfig { baseUrl: string; modelId: string; apiKey?: string; timeoutMs: number; temperature?: number; maxTokens?: number; reasoningBudgetTokens?: number; seed?: number; reasoningEffort?: import('@el-dabboos/domain').WorkspaceAiSettings['reasoningEffort']; requireParameters?: boolean; diagnostics?: (event: ProviderHttpDiagnostic) => void }
export class ProviderTransportError extends Error {
  constructor(readonly code: 'LLM_RATE_LIMITED' | 'LLM_TIMEOUT' | 'LLM_HTTP_ERROR' | 'LLM_PROTOCOL_ERROR' | 'LLM_UNAVAILABLE', message: string) { super(message); }
}
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
export class OpenAICompatibleLLMProvider implements LLMProvider {
  private readonly endpoint: string;
  constructor(private readonly config: OpenAICompatibleConfig) {
    const url = new URL(config.baseUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !config.modelId.trim() || !Number.isInteger(config.timeoutMs) || config.timeoutMs < 1)
      throw new Error('Invalid OpenAI-compatible provider configuration');
    const { temperature = 0, maxTokens = 2048, reasoningBudgetTokens, seed } = config;
    if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2 || !Number.isSafeInteger(maxTokens) || maxTokens < 1 || maxTokens > 65536 ||
      reasoningBudgetTokens !== undefined && (!Number.isSafeInteger(reasoningBudgetTokens) || reasoningBudgetTokens < 0 || reasoningBudgetTokens > 65536) ||
      seed !== undefined && (!Number.isSafeInteger(seed) || seed < 0 || seed > 2147483647)) throw new Error('Invalid OpenAI-compatible inference configuration');
    this.endpoint = `${url.toString().replace(/\/+$/, '')}/chat/completions`;
  }
  async generateStructured(request: StructuredOutputRequest): Promise<StructuredOutputResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const started = performance.now();
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { 'content-type': 'application/json', ...(this.config.apiKey ? { authorization: `Bearer ${this.config.apiKey}` } : {}) },
        body: JSON.stringify(structuredRequestBody(request, this.config)),
      });
      if (!response.ok) {
        if (this.config.diagnostics) {
          try { this.config.diagnostics(await providerHttpDiagnostic(response, request, this.config.modelId, this.config.apiKey)); }
          catch { /* Diagnostics never change safe API behavior. */ }
        }
        throw new ProviderTransportError(response.status === 429 ? 'LLM_RATE_LIMITED' : 'LLM_HTTP_ERROR', `Structured provider returned HTTP ${response.status}.`);
      }
      const body = await response.text();
      if (body.length > 2_000_000) throw new ProviderTransportError('LLM_PROTOCOL_ERROR', 'Structured provider response exceeded the size limit.');
      let payload: unknown;
      try { payload = JSON.parse(body); } catch { throw new ProviderTransportError('LLM_PROTOCOL_ERROR', 'Structured provider returned an invalid response envelope.'); }
      if (!record(payload) || !Array.isArray(payload.choices) || !record(payload.choices[0]) ||
        !record(payload.choices[0].message) || typeof payload.choices[0].message.content !== 'string')
        throw new ProviderTransportError('LLM_PROTOCOL_ERROR', 'Structured provider omitted message content.');
      const content = payload.choices[0].message.content;
      let output: unknown;
      try { output = JSON.parse(content); } catch { output = content; }
      return { output, providerId: `openai-compatible:${this.config.modelId}`, latencyMs: performance.now() - started, attempts: 1 };
    } catch (error) {
      if (error instanceof ProviderTransportError) throw error;
      if (controller.signal.aborted) throw new ProviderTransportError('LLM_TIMEOUT', 'Structured provider request timed out.');
      throw new ProviderTransportError('LLM_UNAVAILABLE', 'Structured provider is unavailable.');
    } finally { clearTimeout(timeout); }
  }
}

function structuredRequestBody(request: StructuredOutputRequest, config: OpenAICompatibleConfig) {
  return { model: config.modelId, messages: request.messages, stream: false,
          temperature: config.temperature ?? 0, max_tokens: config.maxTokens ?? 2048,
          ...(config.reasoningBudgetTokens !== undefined ? { thinking_budget_tokens: config.reasoningBudgetTokens } : {}),
          ...(config.reasoningEffort !== undefined ? { reasoning: { effort: config.reasoningEffort } } : {}),
          ...(config.requireParameters ? { provider: { require_parameters: true } } : {}),
          ...(config.seed !== undefined ? { seed: config.seed } : {}),
          response_format: { type: 'json_schema', json_schema: { name: request.responseFormat.name, strict: request.responseFormat.strict,
            schema: request.responseFormat.jsonSchema } } };
}
