import test from 'node:test';
import assert from 'node:assert/strict';
import {database,enabled} from './support.ts';
import {createStageSchema,writeStagePage,finishStageTables} from '../../src/odoo-orm/stage-store.ts';
import {stageModel} from '../../src/odoo-orm/stage-manifest.ts';

test('owned-copy storage retains exact numeric values and the existing SQL relationship bridge',{skip:!enabled},async()=>{
 const db=await database(false);
 try{
  const model=stageModel({model:'sale.order.line',table:'sale_order_line'},{id:{type:'integer'},price_subtotal:{type:'monetary'},order_id:{type:'many2one'},invoice_lines:{type:'many2many'}});
  const schema='api_0123456789abcdef0123456789abcdef';
  await createStageSchema(db.admin,schema,[model]);
  const client=await db.admin.connect();
  try{
   await writeStagePage(client,{schema,model},[{id:'10',price_subtotal:'123456789012345.123456789',order_id:'3',invoice_lines:['7','8']}]);
   await assert.rejects(writeStagePage(client,{schema,model},[{id:'11',price_subtotal:'4.5',order_id:'3',invoice_lines:['9']},{id:'10',price_subtotal:'1',order_id:'3',invoice_lines:[]}]));
  }finally{client.release();}
  await finishStageTables(db.admin,schema,[model]);
  const rows=(await db.admin.query(`SELECT line.price_subtotal::text value,line.order_id::text order_id,bridge.invoice_line_id::text invoice_id FROM ${schema}.sale_order_line line JOIN ${schema}.sale_order_line_invoice_rel bridge ON bridge.order_line_id=line.id ORDER BY invoice_id`)).rows;
  assert.deepEqual(rows,[{value:'123456789012345.123456789',order_id:'3',invoice_id:'7'},{value:'123456789012345.123456789',order_id:'3',invoice_id:'8'}]);
  assert.equal((await db.admin.query(`SELECT count(*)::int count FROM ${schema}.sale_order_line`)).rows[0].count,1);
 }finally{await db.close();}
});
