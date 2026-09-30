import assert from 'node:assert/strict';
import test from 'node:test';
import { tenantProfiles } from '@el-dabbous/domain';
import { formatDate, formatKey, formatValue, localeTag } from '../src/i18n.ts';
const iq = tenantProfiles['demo-iq'];
const eg = tenantProfiles['demo-eg'];
test('Iraqi and Egyptian profiles control currency and locale formatting', () => {
  assert.equal(localeTag('ar', iq), 'ar-IQ');
  assert.equal(localeTag('en', iq), 'en-IQ');
  assert.equal(localeTag('ar', eg), 'ar-EG');
  assert.equal(localeTag('en', eg), 'en-EG');
  assert.match(formatValue(1234, 'currency', 'en', iq), /IQD/u);
  assert.match(formatValue(1234, 'currency', 'en', eg), /EGP/u);
  assert.match(formatValue(1234, 'number', 'ar', iq), /[٠-٩]/u);
  assert.match(formatValue(1234, 'number', 'ar', eg), /[٠-٩]/u);
});
test('branch labels and dates follow the governed market profile', () => {
  assert.equal(formatKey('baghdad', 'branch', 'ar', iq), 'بغداد');
  assert.equal(formatKey('cairo', 'branch', 'ar', eg), 'القاهرة');
  assert.equal(formatKey('cairo', 'branch', 'en', eg), 'Cairo');
  assert.match(formatKey('2026-01', 'month', 'ar', iq), /[٠-٩]/u);
  assert.match(formatDate('2026-09-30', 'ar', eg), /[٠-٩]/u);
});
