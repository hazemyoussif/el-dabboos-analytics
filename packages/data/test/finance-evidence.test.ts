import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFinanceEvidence} from '../src/operational/finance-publication.ts';
import type {FinanceSnapshotEvidence} from '../src/operational/finance-publication.ts';
import {receivableMeasures} from '../src/receivable-aging.ts';
test('empty Finance evidence requires complete canonical zero company controls',()=>{
 const empty:FinanceSnapshotEvidence={tenantId:'synthetic',date:'2026-06-30',currency:'IQD',sourceCutoff:'2026-10-12T00:00:00.000Z',sourceRevision:'synthetic-complete-controls',customers:[],totals:Object.fromEntries(receivableMeasures.map(measure=>[measure,'0.000000']))};
 assert.doesNotThrow(()=>validateFinanceEvidence(empty));
 const missing=structuredClone(empty);delete missing.totals.aged_1_30;assert.throws(()=>validateFinanceEvidence(missing),/Exact governed Finance summary/);
 const nonzero=structuredClone(empty);nonzero.totals.net_aged_receivable='1.000000';assert.throws(()=>validateFinanceEvidence(nonzero),/Exact governed Finance summary/);
 const malformed=structuredClone(empty);malformed.totals.net_aged_receivable='0';assert.throws(()=>validateFinanceEvidence(malformed),/Exact governed Finance summary/);
});
