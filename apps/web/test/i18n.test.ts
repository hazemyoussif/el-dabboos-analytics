import assert from 'node:assert/strict';
import test from 'node:test';
import { tenantProfiles } from '@el-dabbous/domain';
import { conversationalCopy, copy, formatDate, formatKey, formatTimestamp, formatValue, localeTag } from '../src/i18n.ts';
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
test('conversational guidance follows the selected market without changing MSA labels', () => {
  const iraq = JSON.stringify(conversationalCopy('ar', iq));
  const egypt = JSON.stringify(conversationalCopy('ar', eg));
  assert.match(iraq, /السنة هاي/u);
  assert.match(iraq, /شكد المبيعات/u);
  assert.doesNotMatch(iraq, /السنة دي|عايز|الشهر ده/u);
  assert.match(egypt, /السنة دي/u);
  assert.match(egypt, /عايز/u);
  assert.doesNotMatch(egypt, /السنة هاي|شكد|ويّاه/u);
  assert.equal(conversationalCopy('en', iq).placeholder, conversationalCopy('en', eg).placeholder);
  assert.equal(copy.ar.market, 'السوق');
  assert.equal(copy.ar.promptTitle, 'صف لوحة المعلومات التي تحتاجها');
});
test('data coverage and optional source update labels are distinct and localized', () => {
  assert.equal(copy.en.dataThrough, 'Data through');
  assert.equal(copy.en.sourceUpdated, 'Source updated');
  assert.equal(copy.ar.dataThrough, 'البيانات حتى');
  assert.equal(copy.ar.sourceUpdated, 'تحديث المصدر');
  assert.match(formatTimestamp('2026-01-30T08:00:00.000Z', 'en', iq), /11:00/u);
  assert.match(formatTimestamp('2026-01-30T08:00:00.000Z', 'en', eg), /10:00/u);
});
