import test from 'node:test';
import assert from 'node:assert/strict';
import {ownedStageConfig} from '../src/odoo-orm/stage-config.ts';
import {stageModel,stageIdentifier} from '../src/odoo-orm/stage-manifest.ts';
import {stageRow,stageRelationIds} from '../src/odoo-orm/stage-values.ts';

test('owned copy cannot point at the ERP database, mart, generic roles or a second endpoint',()=>{
 const environment={ODOO_API_STAGE_WRITER_URL:'postgresql://odoo_api_stage_writer:synthetic@postgres/el_dabboos_api_stage',ODOO_API_STAGE_READER_URL:'postgresql://odoo_api_stage_reader:synthetic@postgres/el_dabboos_api_stage',MART_INGESTOR_URL:'postgresql://synthetic:synthetic@postgres/mart'};
 assert.equal(ownedStageConfig(environment).schema,undefined);
 for(const patch of [
  {ODOO_API_STAGE_WRITER_URL:environment.ODOO_API_STAGE_WRITER_URL.replace('/el_dabboos_api_stage','/accounting')},
  {ODOO_API_STAGE_READER_URL:environment.ODOO_API_STAGE_READER_URL.replace('odoo_api_stage_reader','postgres')},
  {ODOO_API_STAGE_READER_URL:environment.ODOO_API_STAGE_READER_URL.replace('@postgres/','@erp/')},
  {ODOO_API_STAGE_SCHEMA:'public;drop schema mart'},
 ])assert.throws(()=>ownedStageConfig({...environment,...patch}));
 assert.throws(()=>stageIdentifier('sale_order;drop table mart'));
});

test('owned copy preserves recipe numeric precision, translation shape and relationship identities',()=>{
 const model=stageModel({model:'product.template',table:'product_template'}, {
  id:{type:'integer',store:true},name:{type:'char',store:true,translate:true},
  company_id:{type:'many2one',store:true},rounding:{type:'float',store:true},
  amount:{type:'monetary',store:true,company_dependent:true},write_date:{type:'datetime',store:true},
  active:{type:'boolean',store:true},computed:{type:'char',store:false},unrelated_secret:{type:'char',store:true},
 });
 const row=stageRow(model,{id:'4',name:'Synthetic product',company_id:false,rounding:'0.3333333333333333',amount:'123456789012345678.123456789',write_date:'2026-10-25 01:02:03',active:false});
 assert.deepEqual(row,{id:'4',name:{en_US:'Synthetic product'},company_id:null,rounding:'0.3333333333333333',amount:{'1':'123456789012345678.123456789'},write_date:'2026-10-25 01:02:03.000000',active:false});
 assert.deepEqual(stageRelationIds(['1','5']),['1','5']);
 assert.throws(()=>stageRelationIds(['1','1']));
 assert.throws(()=>stageRow(model,{...row,rounding:'NaN'}));
 assert.ok(!model.fields.includes('unrelated_secret'));
 assert.deepEqual(model.domain,['|',['company_id','=',false],['company_id','=',1]]);
});

test('owned copy requires the bridge used for invoice-to-order lineage',()=>{
 assert.throws(()=>stageModel({model:'sale.order.line',table:'sale_order_line'},{id:{type:'integer'}}),/relationship/);
 const model=stageModel({model:'sale.order.line',table:'sale_order_line'},{id:{type:'integer'},invoice_lines:{type:'many2many'}});
 assert.ok(model.fields.includes('invoice_lines'));
 assert.ok(!model.columns.some(column=>column.name==='invoice_lines'));
});
