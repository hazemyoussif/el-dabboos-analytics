import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { validateProductionFact } from '@el-dabboos/domain';
import type { DataQualityReject, ProductionFact } from '@el-dabboos/domain';
import { fact,mapping } from './postgres/fixtures.ts';
/** Test-only canonical mapper fixture. No connector, physical Odoo DTO, production approval or FX. */
function mapSynthetic(input: unknown): { facts: ProductionFact[] }|{ reject: DataQualityReject } {
  try { validateProductionFact(input,mapping()); return { facts: [input] }; }
  catch { return { reject: { tenantId: 'a',batchId: 'batch-1',sourceId: 'fixture',safeRecordReference: createHash('sha256').update('synthetic-only-id').digest('hex'),reason: 'invalid_shape',field: 'record',occurredAt: '2026-10-01T12:00:00.000Z' } }; }
}
test('synthetic mapper: confirmed, negative credit, correction/delete and exact replay envelopes', () => {
  for (const f of [fact(),fact('credit',{ value: '-10.000000' }),fact('corrected',{ sourceRevision: '2',sourceVersion: 'v2' }),fact('deleted',{ status: 'tombstone' })]) assert.deepEqual(mapSynthetic(f),{ facts: [f] });
});
test('synthetic mapper: malformed source evidence produces bounded rejects without raw data', () => {
  for (const patch of [{ value: NaN },{ value: '1.0000001' },{ businessDate: '2026-02-30' },{ measureId: 'unknown' },{ currency: undefined },{ dimensions: { warehouse: 'uncertified' } },{ sourceRecordId: '' },{ measureId: 'outstanding_amount',kind: 'snapshot',entityId: undefined }]) {
    const result = mapSynthetic({ ...fact(),...patch }); assert.ok('reject' in result); assert.equal(Object.keys(result.reject).length,7); assert.ok(!JSON.stringify(result).includes('rawPayload'));
  }
});
