import assert from 'node:assert/strict';
import test from 'node:test';
import {database,enabled} from './support.ts';
import {inventoryAvailabilityRecipe} from '../../src/business/inventory-availability-recipes.ts';
const fixture=`CREATE TABLE stock_location(id int,usage text,parent_path text);
 CREATE TABLE stock_warehouse(id int,company_id int,view_location_id int);
 CREATE TABLE stock_quant(id int,company_id int,product_id int,location_id int,owner_id int,quantity numeric,reserved_quantity numeric);
 CREATE TABLE product_product(id int,product_tmpl_id int,standard_price jsonb);
 CREATE TABLE product_template(id int,categ_id int,product_brand_id int,uom_id int);
 CREATE TABLE res_company(id int,currency_id int);CREATE TABLE res_currency(id int,name text);
 CREATE TABLE ir_model_fields(id int,model text,name text);
 CREATE TABLE ir_default(id int,field_id int,company_id int,user_id int,json_value text,condition text);
 INSERT INTO ir_model_fields VALUES(1,'product.product','standard_price');
 INSERT INTO res_company VALUES(1,1),(2,1);INSERT INTO res_currency VALUES(1,'IQD');
 INSERT INTO stock_location VALUES(1,'view','1/'),(2,'internal','1/2/'),(3,'internal','1/3/'),(4,'customer','4/'),(5,'view','5/'),(6,'internal','5/6/'),(7,'internal','7/');
 INSERT INTO stock_warehouse VALUES(1,1,1),(2,1,5);
 INSERT INTO product_product VALUES(10,100,'{"1":2.5,"2":999}'),(11,101,'{"1":0}'),(12,102,'{}');
 INSERT INTO product_template VALUES(100,1,1,1),(101,1,1,1),(102,1,1,1);
 INSERT INTO stock_quant VALUES(1,1,10,2,NULL,10,2),(2,1,10,3,NULL,-7,0),
 (3,1,10,6,NULL,-2,1),(4,1,10,4,NULL,999,0),(5,2,10,2,NULL,999,0),(6,1,10,2,999,999,0),
 (7,1,11,2,NULL,4,0),(8,1,10,7,NULL,1,0),(9,1,12,2,NULL,-1,0);`;
const parameters=[1,'2026-10-01','2026-10-25','Asia/Baghdad','2026-10-25'];
test('free stock clamps after product/warehouse reduction and keeps company cost, null and ownership semantics',{skip:!enabled},async()=>{
 const db=await database(false);
 try{
  await db.admin.query(fixture);
  const rows=(await db.admin.query(inventoryAvailabilityRecipe,parameters)).rows;
  const get=(id:string,measure:string)=>rows.find(row=>row.id===id&&row.measure_id===measure);
  assert.equal(get('10:1','free_stock_quantity').amount,'1');
  assert.equal(get('10:1','reserved_stock_quantity').amount,'2');
  assert.equal(get('10:1','free_stock_value').amount,'2.5','company 2 cost must not leak');
  assert.equal(get('10:2','free_stock_quantity').amount,'0','negative warehouse stock cannot cancel another warehouse');
  assert.equal(get('10:unassigned','free_stock_quantity').amount,'1','unknown warehouse remains present');
  assert.equal(get('11:1','free_stock_value').amount,'0','explicit source zero cost remains zero');
  assert.equal(get('12:1','free_stock_value').amount,'0','no free stock needs no invented cost');
  assert.ok(rows.every(row=>row.invalid===false));
  assert.equal((await db.admin.query(inventoryAvailabilityRecipe,[1,'2026-09-01','2026-09-30','Asia/Baghdad','2026-10-25'])).rowCount,0,'current stock is not historical');
  await db.admin.query('UPDATE stock_quant SET quantity=2 WHERE id=9');
  const missing=(await db.admin.query(inventoryAvailabilityRecipe,parameters)).rows.find(row=>row.id==='12:1'&&row.measure_id==='free_stock_value');
  assert.equal(missing.amount,'0');assert.equal(missing.invalid,false,'verified Odoo Float default remains zero');
  await db.admin.query("INSERT INTO ir_default VALUES(1,1,NULL,NULL,'7',NULL),(2,1,1,NULL,'3',NULL),(4,1,1,NULL,'100',NULL),(5,1,1,NULL,'999','special=true'),(6,1,1,42,'999','special=true')");
  assert.equal((await db.admin.query(inventoryAvailabilityRecipe,parameters)).rows.find(row=>row.id==='12:1'&&row.measure_id==='free_stock_value').amount,'6','company default precedes global default');
  assert.equal((await db.admin.query(inventoryAvailabilityRecipe,parameters)).rows.find(row=>row.id==='12:1'&&row.measure_id==='free_stock_value').invalid,false,'conditional defaults do not apply to unconditional field fallback');
  await db.admin.query("INSERT INTO ir_default VALUES(3,1,1,42,'9',NULL)");
  assert.equal((await db.admin.query(inventoryAvailabilityRecipe,parameters)).rows.find(row=>row.id==='12:1'&&row.measure_id==='free_stock_value').invalid,true,'unresolved user-specific fallback is not silently selected');
  await db.admin.query('UPDATE stock_quant SET reserved_quantity=NULL WHERE id=1');
  assert.ok((await db.admin.query(inventoryAvailabilityRecipe,parameters)).rows.filter(row=>row.id==='10:1').every(row=>row.invalid));
 }finally{await db.close();}
});
