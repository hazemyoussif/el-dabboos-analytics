import { randomUUID } from 'node:crypto';
import type { OdooOrmConfig } from './config.ts';
import { ormObject, parseOdooJson } from './json.ts';

export class OdooOrmError extends Error {
  constructor(readonly code: 'network' | 'http' | 'response' | 'remote' | 'authentication' | 'version' | 'permission') {
    super(`Odoo ORM ${code} failure`);
    this.name = 'OdooOrmError';
  }
}

async function boundedBody(response: Response): Promise<string> {
  const maximum = 8 * 1024 * 1024;
  if (Number(response.headers.get('content-length')) > maximum) {
    await response.body?.cancel();
    throw new OdooOrmError('response');
  }
  if (!response.body) throw new OdooOrmError('response');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > maximum) throw new OdooOrmError('response');
      chunks.push(part.value);
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  } finally { await reader.cancel(); }
}

/** Odoo 18's standard /jsonrpc service. No session cookies, redirects, writes or retries. */
export class OdooOrmTransport {
  constructor(private readonly config: OdooOrmConfig, private readonly fetcher: typeof fetch = fetch) {}

  async call(service: 'common' | 'object', method: string, args: unknown[]): Promise<unknown> {
    const requestId = randomUUID();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await this.fetcher(`${this.config.url}/jsonrpc`, {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: requestId, params: { service, method, args } }),
      });
      if (!response.ok) { await response.body?.cancel(); throw new OdooOrmError('http'); }
      const envelope = ormObject(parseOdooJson(await boundedBody(response)));
      if (envelope.id !== requestId || envelope.jsonrpc !== '2.0') throw new OdooOrmError('response');
      if (Object.hasOwn(envelope, 'error')) throw new OdooOrmError('remote');
      if (!Object.hasOwn(envelope, 'result')) throw new OdooOrmError('response');
      return envelope.result;
    } catch (error) {
      if (error instanceof OdooOrmError) throw error;
      throw new OdooOrmError('network');
    } finally { clearTimeout(timer); }
  }
}
