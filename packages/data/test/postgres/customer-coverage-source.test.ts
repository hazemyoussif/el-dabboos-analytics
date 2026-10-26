import assert from 'node:assert/strict';
import test from 'node:test';
import {database,enabled} from './support.ts';
import {businessMapping} from '../../src/business/definitions.ts';
import {withSalesCommandMapping} from '../../src/business/sales-command-mapping.ts';
import {withCustomerCoverageMapping} from '../../src/business/customer-coverage-mapping.ts';
import {customerCoverageRecipe} from '../../src/business/customer-coverage-recipes.ts';
const fixture=`CREATE TABLE product_category(id int,parent_path text);
 CREATE TABLE stock_location(id int,parent_path text);CREATE TABLE stock_warehouse(id int,company_id int,view_location_id int);
 CREATE TABLE stock_quant(company_id int,product_id int,location_id int,owner_id int,quantity numeric,reserved_quantity numeric);
 CREATE TABLE stock_move(company_id int,product_id int,location_id int,location_dest_id int,location_final_id int,restrict_partner_id int,state text,product_qty numeric);
 CREATE TABLE uom_uom(id int,factor numeric,category_id int,rounding numeric);
 CREATE TABLE product_product(id int,product_tmpl_id int,active bool);
 CREATE TABLE product_template(id int,company_id int,active bool,type text,categ_id int,product_brand_id int,uom_id int);
 CREATE TABLE res_company(id int,currency_id int);CREATE TABLE res_currency(id int,name text);
 CREATE TABLE res_partner(id int,user_id int,state_id int);CREATE TABLE res_partner_category(id int);
 CREATE TABLE res_partner_res_partner_category_rel(partner_id int,category_id int);
 CREATE TABLE account_move(id int,company_id int,partner_id int,state text,move_type text,invoice_date date,invoice_user_id int);
 CREATE TABLE account_move_line(move_id int,company_id int,product_id int,product_uom_id int,quantity numeric,display_type text);
 INSERT INTO product_category VALUES(10,'1/10/'),(20,'1/20/'),(21,'1/20/21/');
 INSERT INTO stock_location VALUES(1,'1/'),(2,'1/2/'),(3,'1/3/'),(100,'100/'),(200,'200/');
 INSERT INTO stock_warehouse VALUES(1,1,1);INSERT INTO uom_uom VALUES(1,1,1,1),(2,0.5,1,1);
 INSERT INTO product_product VALUES(10,10,true),(11,11,true),(12,12,true),(13,13,true),(14,14,false);
 INSERT INTO product_template VALUES(10,NULL,true,'consu',10,1,1),(11,NULL,true,'consu',10,1,1),(12,NULL,true,'consu',10,1,1),(13,NULL,true,'consu',21,1,1),(14,NULL,true,'consu',10,1,1);
 INSERT INTO stock_quant VALUES(1,10,2,NULL,5,4),(1,11,2,NULL,-2,0),(1,12,2,NULL,0,0),(1,13,2,NULL,100,0),(1,14,2,NULL,100,0),(2,10,2,NULL,999,0),(1,10,2,7,999,0);
 INSERT INTO stock_move VALUES(1,10,100,2,NULL,NULL,'confirmed',3),(1,10,2,100,NULL,NULL,'assigned',1),
 (1,10,2,3,NULL,NULL,'confirmed',50),(1,10,2,3,100,NULL,'confirmed',4),(1,10,100,200,2,NULL,'waiting',2),
 (1,10,100,2,NULL,NULL,'done',999),(1,10,100,2,NULL,NULL,'cancel',999),(2,10,100,2,NULL,NULL,'confirmed',999);
 INSERT INTO res_company VALUES(1,1);INSERT INTO res_currency VALUES(1,'IQD');
 INSERT INTO res_partner VALUES(100,7,8),(101,9,10),(102,NULL,NULL),(103,7,8),(104,7,8);
 INSERT INTO res_partner_category VALUES(1),(2);INSERT INTO res_partner_res_partner_category_rel VALUES(100,1),(100,1),(100,2);
 INSERT INTO account_move VALUES(1,1,100,'posted','out_invoice','2026-01-01',999),(2,1,100,'posted','out_refund','2026-02-01',999),
 (3,1,101,'posted','out_invoice','2026-03-01',999),(4,1,101,'posted','out_refund','2026-04-01',999),
 (5,1,102,'posted','out_invoice','2026-05-01',999),(6,1,103,'posted','out_invoice','2026-06-01',999),
 (7,1,103,'posted','out_refund','2026-07-01',999),(8,2,104,'posted','out_invoice','2026-01-01',999),
 (9,1,104,'draft','out_invoice','2026-01-01',999),(10,1,100,'posted','out_invoice','2025-01-01',999);
 INSERT INTO account_move_line VALUES(1,1,10,1,3,'product'),(2,1,10,1,3,'product'),(3,1,10,2,2,'product'),(4,1,10,1,1,'product'),
 (5,1,11,1,2,'product'),(6,1,10,1,1,'product'),(7,1,10,1,3,'product'),(8,2,10,1,999,'product'),(9,1,10,1,999,'product'),(10,1,10,1,1,'product');`;
test('coverage source uses positive forecast, current attribution, signed base quantities and distinct actual tags',{skip:!enabled},async()=>{
 const db=await database(false);
 try{
  await db.admin.query(fixture);
  const mapping=withCustomerCoverageMapping(withSalesCommandMapping(businessMapping({tenantId:'a',sourceId:'fixture',currency:'IQD',timeZone:'Asia/Baghdad',datasetId:'SYNTHETIC COVERAGE',current:true}),true),{version:1,years:[2025,2026],excludedProductCategories:['20'],forecast:'positive'});
  const params=[1,'2026-10-01','2026-10-25','Asia/Baghdad','2026-10-25','2026-10-25T09:00:00Z','fixture',mapping.measures.map(rule=>rule.measureId),JSON.stringify(mapping.measures)];
  const sql=`WITH source AS (${customerCoverageRecipe}) SELECT * FROM source WHERE $6::timestamptz IS NOT NULL AND $7::text IS NOT NULL AND $8::text[] IS NOT NULL`;
  const rows=(await db.admin.query(sql,params)).rows;
  const get=(id:string,measure:string)=>rows.find(row=>row.id===id&&row.measure_id===measure);
  assert.ok(rows.every(row=>row.invalid===false));
  assert.equal(rows.filter(row=>row.measure_id==='coverage_forecast_quantity').length,1);
  assert.equal(Number(get('p:10','coverage_forecast_quantity').amount),5,'reservations do not reduce forecast; final destination controls pending moves');
  assert.equal(Number(get('s:2026:100:10','coverage_net_quantity').amount),0,'fully returned stays zero');
  assert.equal(Number(get('s:2026:101:10','coverage_net_quantity').amount),3,'convert product base UOM before netting credits');
  assert.equal(Number(get('s:2026:103:10','coverage_net_quantity').amount),-2);
  assert.equal(get('s:2026:100:10','coverage_net_quantity').dimensions.customer_salesperson,'7','current owner, not invoice user');
  assert.equal(get('s:2026:100:10','coverage_net_quantity').dimensions.customer_state,'8');
  assert.equal(get('c:2026:102','coverage_customer_population').amount,'1');
  assert.equal(get('c:2026:102','coverage_excluded_product_count').amount,'1');
  assert.equal(rows.filter(row=>row.measure_id==='coverage_tag_membership').length,2,'tags neither duplicate memberships nor multiply quantities');
  assert.equal(Number(get('s:2025:100:10','coverage_net_quantity').amount),1);
  assert.ok(!rows.some(row=>row.id==='c:2026:104'),'other company and draft invoices do not create customers');
  await db.admin.query('UPDATE uom_uom SET factor=0 WHERE id=2');
  assert.ok((await db.admin.query(sql,params)).rows.every(row=>row.invalid),'invalid conversion prevents publication');
 }finally{await db.close();}
});
