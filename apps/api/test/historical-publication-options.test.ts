import assert from 'node:assert/strict';
import test from 'node:test';
import {historicalPublicationOptions} from '../src/historical-publication-options.ts';
const args=['backfill','--tenant','el-dabboos-iq','--from','2025-10-01','--to','2026-09-30','--checkpoint-dir','/tmp/synthetic-publication'];
const sourceUrl='postgres://synthetic@localhost/source',targetUrl='postgres://synthetic@localhost/target';
test('historical publication requires explicit in-place topology and one operator pool',()=>{
  const local=historicalPublicationOptions([...args,'--in-place'],{MART_MIGRATOR_URL:sourceUrl});
  assert.equal(local.inPlace,true);assert.equal(local.targetUrl,sourceUrl);assert.equal(local.periods.length,12);
  const transfer=historicalPublicationOptions(args,{MART_MIGRATOR_URL:sourceUrl,MART_PUBLICATION_TARGET_URL:targetUrl});
  assert.equal(transfer.inPlace,false);assert.equal(transfer.targetUrl,targetUrl);
  assert.throws(()=>historicalPublicationOptions(args,{MART_MIGRATOR_URL:sourceUrl,MART_PUBLICATION_TARGET_URL:sourceUrl}),/requires --in-place/);
  assert.throws(()=>historicalPublicationOptions(args,{MART_MIGRATOR_URL:sourceUrl}),/configuration/);
  assert.throws(()=>historicalPublicationOptions([...args,'--in-place','--in-place'],{MART_MIGRATOR_URL:sourceUrl}),/Duplicate/);
  assert.throws(()=>historicalPublicationOptions([...args,'--in-place'],{MART_MIGRATOR_URL:'postgres://synthetic@production/mart',ENVIRONMENT:'production'}),/staging configuration/);
  assert.equal(historicalPublicationOptions([...args,'--in-place'],{MART_MIGRATOR_URL:'postgres://synthetic@postgres/mart',ENVIRONMENT:'staging'}).inPlace,true);
});
