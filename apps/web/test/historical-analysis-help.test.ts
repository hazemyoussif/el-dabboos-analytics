import test from 'node:test';
import assert from 'node:assert/strict';
import { analysisHelp } from '../src/metrics/analysis-help.ts';
test('executed MoM help explains the signed absolute change and absolute prior denominator in both languages',()=>{
  const english=analysisHelp({comparison:'month_over_month'},'en').flat().join(' ');
  assert.match(english,/\|previous\|/);assert.match(english,/zero prior value/);assert.match(english,/definition 1/);
  const arabic=analysisHelp({comparison:'month_over_month'},'ar').flat().join(' ');
  assert.match(arabic,/القيمة المطلقة/);assert.match(arabic,/صفراً/);assert.doesNotMatch(arabic,/Month|previous/);
  assert.deepEqual(analysisHelp(undefined,'ar'),[]);
});
test('moving-average help preserves the existing partial-prefix and missing-value behavior',()=>{
  const english=analysisHelp({movingAverage:{window:3}},'en').flat().join(' ');
  assert.match(english,/3/);assert.match(english,/available prefix/);assert.match(english,/Missing values are excluded/);
});
