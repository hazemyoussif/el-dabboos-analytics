/** Read-only technical comparison. It neither grants approval nor records/publishes capabilities. */
const scaled = value => {
 if (typeof value !== 'string' || !/^-?(0|[1-9]\d{0,23})\.\d{6}$/u.test(value) || value === '-0.000000') throw new Error('Exact six-decimal source control required');
 return BigInt(value.replace('.', ''));
};
const count = value => {
 if (typeof value !== 'string' || !/^(0|[1-9]\d{0,11})$/u.test(value)) throw new Error('Exact population count required');
 return BigInt(value);
};
function indexed(rows, identityPrefix) {
 if (!Array.isArray(rows) || !rows.length || rows.length > 5000) throw new Error('Bounded complete grouped controls required');
 const groups = new Map();
 for (const row of rows) {
  if (typeof row.key !== 'string' || !row.key.startsWith(identityPrefix) || !/^[1-9]\d*$/u.test(row.key.slice(identityPrefix.length))) throw new Error('Stable source identity required; names/unknown IDs are not evidence');
  if (groups.has(row.key)) throw new Error('Duplicate source identity');
  groups.set(row.key, { value: scaled(row.value), count: count(row.count) });
 }
 return groups;
}
function sums(groups) {
 return [...groups.values()].reduce((total, group) => ({ value: total.value + group.value, count: total.count + group.count }), { value: 0n, count: 0n });
}
export function compareFrozenGroups({ source, mart, sourceTotal, martTotal, identityPrefix }) {
 if (typeof identityPrefix !== 'string' || !identityPrefix.endsWith(':') || identityPrefix.length > 200) throw new Error('Explicit identity namespace required');
 const expected = indexed(source, identityPrefix);
 const actual = indexed(mart, identityPrefix);
 const sourceSum = sums(expected);
 const martSum = sums(actual);
 const sourceCoherent = sourceSum.value === scaled(sourceTotal.value) && sourceSum.count === count(sourceTotal.count);
 const martCoherent = martSum.value === scaled(martTotal.value) && martSum.count === count(martTotal.count);
 const missingGroups = [...expected.keys()].filter(key => !actual.has(key));
 const unexpectedGroups = [...actual.keys()].filter(key => !expected.has(key));
 const mismatches = [...expected].filter(([key, group]) => actual.has(key) && (group.value !== actual.get(key).value || group.count !== actual.get(key).count)).map(([key]) => key);
 const technicalExact = sourceCoherent && martCoherent && sourceSum.value === martSum.value && sourceSum.count === martSum.count && !missingGroups.length && !unexpectedGroups.length && !mismatches.length;
 return { technicalExact, sourceGroups: expected.size, martGroups: actual.size, sourceCoherent, martCoherent, missingGroups, unexpectedGroups, mismatches, businessApproval: 'not_inferred', certification: 'not_inferred', publication: 'not_inferred' };
}
