import assert from 'node:assert/strict';
import test from 'node:test';
import { PostgresAnalyticsRepository } from '../../src/postgres/repository.ts';
import { PostgresMartWriter } from '../../src/postgres/writer.ts';
import { database,enabled } from './support.ts';
import { batch,clock,deploy,evidence,fact,mapping } from './fixtures.ts';

test('existing PostgreSQL receivables preserve inclusive cutoff, zero closure, grouping gates and tenant isolation', {skip:!enabled},async()=>{
 const databaseFixture=await database();
 try {
  await deploy(databaseFixture.migrator,mapping('a'));
  await deploy(databaseFixture.migrator,mapping('b'));
  const writer=new PostgresMartWriter(databaseFixture.ingestor,{a:['fixture-company'],b:['fixture-company']},clock);
  const snapshots=[
   fact('component-september',{measureId:'outstanding_amount',entityId:'component',businessDate:'2026-09-30',value:'100.000000'}),
   fact('component-october',{measureId:'outstanding_amount',entityId:'component',businessDate:'2026-10-03',value:'0.000000'}),
   fact('other-component',{measureId:'outstanding_amount',entityId:'other',businessDate:'2026-09-15',value:'50.000000',dimensions:{branch:'giza'}}),
  ];
  await writer.commit(batch('batch-1',snapshots.length),snapshots.map(snapshot=>({facts:[snapshot]})),evidence);
  await writer.commit(batch('foreign',1,'b'),[{facts:[fact('foreign',{tenantId:'b',batchId:'foreign',measureId:'outstanding_amount',value:'9999.000000'})]}],evidence);
  const repository=new PostgresAnalyticsRepository(databaseFixture.runtime,{reportingCurrencies:{a:'IQD',b:'IQD'},clock});
  const context={tenantId:'a',locale:'en' as const};
  const dateRange={from:'2026-09-30',to:'2026-09-30'};
  assert.deepEqual((await repository.execute({metric:'outstanding_amount',dateRange},context)).rows,[{key:null,value:150}]);
  assert.deepEqual((await repository.execute({metric:'outstanding_amount',dateRange,groupBy:'branch'},context)).rows,[{key:'cairo',value:100},{key:'giza',value:50}]);
  assert.deepEqual((await repository.execute({metric:'outstanding_amount',dateRange:{from:'2026-10-03',to:'2026-10-03'}},context)).rows,[{key:null,value:50}]);
  await assert.rejects(repository.execute({metric:'outstanding_amount',groupBy:'customer',dateRange},context),/Uncertified/);
  await assert.rejects(repository.execute({metric:'overdue_amount',dateRange},context),/Uncertified/);
  await assert.rejects(repository.execute({metric:'outstanding_amount',dateRange},{tenantId:'unknown',locale:'en'}),/binding/);
 } finally {await databaseFixture.close();}
});
