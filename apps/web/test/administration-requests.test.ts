import assert from 'node:assert/strict';
import test from 'node:test';
import { AdministrationRequestOwnership } from '../src/admin/request-lifecycle.ts';
test('new requests and unmount invalidate earlier load and mutation responses', () => {
  const ownership = new AdministrationRequestOwnership();
  const first = ownership.begin();
  assert.equal(ownership.owns(first), true);
  const next = ownership.begin();
  assert.equal(ownership.owns(first), false);
  ownership.invalidate();
  assert.equal(ownership.owns(next), false);
});

test('page-specific payloads preserve versions and omit unrelated membership scopes', async () => {
  const serializers = await import('../src/admin/form-requests.ts');
  const form = new FormData(); form.set('name', 'Reviewed'); form.set('description', 'Description'); form.set('permission', 'dashboard:view'); form.set('domain', 'sales'); form.set('role', 'viewer'); form.set('userId', 'candidate'); form.set('branch', 'retained'); form.set('scope', 'restricted'); form.set('membership', 'dormant'); form.set('defaultLocale', 'ar'); form.set('displayName', 'Reviewed user'); form.set('status', 'suspended'); form.set('market', 'EG');
  const base = '/api/tenants/tenant/admin';
  // Serialized fields are what HTTP receives; unrelated fields are intentionally present in the form.
  const record = { id: 'record/id', version: 7 };
  const role = record as Parameters<typeof serializers.roleFormRequest>[1];
  assert.deepEqual(serializers.roleFormRequest(form, role, base), { path: base + '/roles/record%2Fid', method: 'PUT', body: { name: 'Reviewed', description: 'Description', permissions: ['dashboard:view'], metricDomains: ['sales'], expectedVersion: 7 } });
  assert.deepEqual(serializers.membershipFormRequest(form, record as Parameters<typeof serializers.membershipFormRequest>[1], base).body, { expectedVersion: 7, roleIds: ['viewer'] });
  assert.deepEqual(serializers.membershipFormRequest(form, null, base).body, { userId: 'candidate', roleIds: ['viewer'], dataScopes: [] });
  assert.deepEqual(serializers.scopeFormRequest(form, record as Parameters<typeof serializers.scopeFormRequest>[1], base).body, { expectedVersion: 7, dataScopes: [{ dimension: 'branch', values: ['retained'] }] });
  assert.deepEqual(serializers.dashboardAccessFormRequest(form, record as Parameters<typeof serializers.dashboardAccessFormRequest>[1], base).body, { expectedVersion: 7, scope: 'restricted', grants: [{ subjectType: 'role', subjectId: 'viewer', access: 'view' }, { subjectType: 'membership', subjectId: 'dormant', access: 'view' }] });
  form.set('scope', 'private');
  assert.deepEqual(serializers.dashboardAccessFormRequest(form, record as Parameters<typeof serializers.dashboardAccessFormRequest>[1], base).body, { expectedVersion: 7, scope: 'private', grants: [] });
  assert.deepEqual(serializers.workspaceFormRequest(form, record as Parameters<typeof serializers.workspaceFormRequest>[1], base).body, { expectedVersion: 7, name: 'Reviewed', defaultLocale: 'ar' });
  assert.deepEqual(serializers.customerFormRequest(form, record as Parameters<typeof serializers.customerFormRequest>[1]).body, { name: 'Reviewed', expectedVersion: 7, status: 'suspended' });
  assert.deepEqual(serializers.tenantFormRequest(form, null, 'customer/id'), { path: '/api/platform/customers/customer%2Fid/tenants', method: 'POST', body: { name: 'Reviewed', configuration: { countryCode: 'EG', arabicDialect: 'eg', reportingCurrency: 'EGP', timeZone: 'Africa/Cairo', defaultLocale: 'ar' } } });
  assert.deepEqual(serializers.userFormRequest(form, record as Parameters<typeof serializers.userFormRequest>[1]).body, { expectedVersion: 7, displayName: 'Reviewed user', preferredLocale: 'ar', status: 'suspended' });
});

test('supporting pages retain stale scope values and omitted dormant membership grants', async () => {
  const { scopeOptionsWithRetainedValues, omittedMembershipGrants } = await import('../src/admin/selection-retention.ts');
  assert.deepEqual(scopeOptionsWithRetainedValues([{ id: 'current', label: 'Current' }], [{ dimension: 'branch', values: ['current', 'stale'] }], 'branch', 'review'), [{ id: 'current', label: 'Current' }, { id: 'stale', label: 'stale (review)' }]);
  assert.deepEqual(omittedMembershipGrants([{ subjectType: 'membership', subjectId: 'dormant', access: 'view' }, { subjectType: 'role', subjectId: 'viewer', access: 'view' }, { subjectType: 'membership', subjectId: 'listed', access: 'view' }], [{ id: 'listed' }]), [{ subjectType: 'membership', subjectId: 'dormant', access: 'view' }]);
});
