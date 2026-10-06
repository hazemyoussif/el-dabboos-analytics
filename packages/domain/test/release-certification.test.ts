import assert from 'node:assert/strict';
import test from 'node:test';
import { validateReleaseCertification } from '../src/release-certification.ts';
import type { ReleaseCertification } from '../src/release-certification.ts';
const evidence: ReleaseCertification = { tenantId: 'synthetic',datasetId: 'release',mappingVersion: '1',reference: 'SYNTHETIC CERTIFICATION',approverReference: 'authorized-test-approver',approvedAt: '2026-10-06T08:00:00.000Z',companyIds: ['company'],from: '2026-09-01',to: '2026-09-30',caseIds: ['exact-case'],technicalReference: 'exact-synthetic-source-snapshot',evidenceKind: 'authorized_business_approval',approvedValues: [{ measureId: 'net_invoiced_revenue',value: '100.000000' }],businessSemantics: ['Synthetic issue-date recognition'] };
test('authorized business approval needs no fabricated UI metadata; external report path names its reference',() => {
  assert.doesNotThrow(() => validateReleaseCertification(evidence));
  assert.throws(() => validateReleaseCertification({ ...evidence,evidenceKind: 'external_report' }),/authority/);
  assert.doesNotThrow(() => validateReleaseCertification({ ...evidence,evidenceKind: 'external_report',externalReportReference: 'SYNTHETIC REPORT' }));
  assert.throws(() => validateReleaseCertification({ ...evidence,approverReference: '' }),/identity/);
  assert.throws(() => validateReleaseCertification({ ...evidence,approvedAt: 'yesterday' }),/period/);
  assert.throws(() => validateReleaseCertification({ ...evidence,caseIds: ['exact-case','exact-case'] }),/evidence/);
  assert.throws(() => validateReleaseCertification({ ...evidence,approvedValues: [{ measureId: 'net_invoiced_revenue',value: 'NaN' }] }),/values/);
});
