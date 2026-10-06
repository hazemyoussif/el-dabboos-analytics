import test from 'node:test';
import assert from 'node:assert/strict';
import { compareFrozenGroups } from '../../integration/wave-two-group-controls.mjs';
const identityPrefix = 'fixture:';
const source = [{ key: 'fixture:1', value: '100000000000000000000000.000001', count: '2' }, { key: 'fixture:2', value: '-1.000001', count: '1' }];
const total = { value: '99999999999999999999999.000000', count: '3' };
const compare = patch => compareFrozenGroups({ source, mart: source, sourceTotal: total, martTotal: total, identityPrefix, ...patch });
test('Wave 2 replay preserves exact decimal precision and signed amounts without inferring publication', () => {
 const result = compare({}); assert.equal(result.technicalExact, true); assert.equal(result.sourceGroups, 2);
 for (const field of ['businessApproval', 'certification', 'publication']) assert.equal(result[field], 'not_inferred');
});
test('matching grand totals cannot hide customer swaps, population mismatches or absent groups', () => {
 assert.equal(compare({ mart: [source[1], { ...source[0], value: '100000000000000000000001.000001' }] }).technicalExact, false);
 const swapped = [{ ...source[0], value: source[1].value }, { ...source[1], value: source[0].value }];
 assert.equal(compare({ mart: swapped }).technicalExact, false);
 assert.equal(compare({ mart: [source[0], { ...source[1], key: 'fixture:3' }] }).technicalExact, false);
 assert.equal(compare({ mart: [{ ...source[0], count: '1' }, { ...source[1], count: '2' }] }).technicalExact, false);
});
test('duplicate display names remain separate stable identities; display-name/unknown identity controls fail', () => {
 assert.equal(compare({ source: source.map(row => ({ ...row, label: 'Duplicate display name' })) }).technicalExact, true);
 assert.throws(() => compare({ source: [{ ...source[0], key: 'Duplicate display name' }] }), /Stable source identity/u);
 assert.throws(() => compare({ source: [{ ...source[0], key: 'unassigned' }] }), /Stable source identity/u);
 assert.throws(() => compare({ source: [source[0], source[0]] }), /Duplicate source identity/u);
});
test('partial control sets and changed counts cannot be presented as complete source/mart proof', () => {
 assert.equal(compare({ source: [source[0]], mart: [source[0]] }).technicalExact, false);
 assert.throws(() => compare({ source: [] }), /complete grouped controls/u);
 assert.throws(() => compare({ source: [{ ...source[0], value: '1.1' }] }), /six-decimal/u);
 assert.throws(() => compare({ source: [{ ...source[0], count: '-1' }] }), /population/u);
});
