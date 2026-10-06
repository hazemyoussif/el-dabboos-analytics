import assert from 'node:assert/strict';
import test from 'node:test';
import { DimensionDiscoveryLimitError, UncertifiedDimensionError } from '@el-dabboos/domain';
import { MockAnalyticsRepository } from '@el-dabboos/data';
import { buildApi } from '../src/app.ts';

test('uncertified discovery returns explicit unavailable metadata; policy and unexpected failures stay closed',async () => {
  const repository = new MockAnalyticsRepository([]);
  const app = await buildApi({ analyticsRepository: repository,dimensionValues: { async listDimensionValues(dimension) {
    if (dimension==='customer') throw new UncertifiedDimensionError(dimension);
    if (dimension==='city') throw new DimensionDiscoveryLimitError(dimension);
    if (dimension==='branch') throw new Error('Uncertified discovery/policy dimension');
    return [];
  } } });
  const headers = { 'x-demo-user-id': 'demo-iq-admin','x-tenant-id': 'demo-iq' };
  try {
    const unavailable = await app.inject({ url: '/api/dimensions/customer/values',headers });
    assert.equal(unavailable.statusCode,200);
    assert.deepEqual(unavailable.json(),{ dimension: 'customer',availability: 'unavailable',reason: 'uncertified_dimension',values: [] });
    const limited = await app.inject({ url: '/api/dimensions/city/values',headers });
    assert.equal(limited.statusCode,200);
    assert.deepEqual(limited.json(),{ dimension: 'city',availability: 'unavailable',reason: 'discovery_limit',values: [] });
    assert.equal((await app.inject({ url: '/api/dimensions/branch/values',headers })).statusCode,500);
    assert.equal((await app.inject({ url: '/api/dimensions/customer/values',headers: { ...headers,'x-tenant-id': 'other' } })).statusCode,403);
  } finally { await app.close(); }
});
