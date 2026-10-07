import test from 'node:test';
import assert from 'node:assert/strict';
import {governedDimensionLabel} from '../src/dimension-presentation.ts';
test('governed labels keep business names and localized Unassigned, with no raw identity fallback',()=>{
 for(const locale of ['en','ar'] as const){
  assert.equal(governedDimensionLabel('source:2045','Salesperson name',locale),'Salesperson name');
  assert.equal(governedDimensionLabel('source:2046','Salesperson name',locale),'Salesperson name');
  assert.equal(governedDimensionLabel('line:1','General',locale,'business_line'),locale==='ar'?'عام':'General');
  assert.equal(governedDimensionLabel('unassigned','unassigned',locale),locale==='ar'?'غير مسند':'Unassigned');
  for(const label of [undefined,'','source:2045'])assert.equal(governedDimensionLabel('source:2045',label,locale),'—');
 }
});
