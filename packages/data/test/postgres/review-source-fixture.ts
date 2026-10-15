export const reviewSourceFixture=`CREATE TABLE res_company(id int PRIMARY KEY,currency_id int);
 CREATE TABLE res_currency(id int PRIMARY KEY,name text,rounding numeric);
 CREATE TABLE account_account(id int PRIMARY KEY,account_type text);
 CREATE TABLE account_move(id int PRIMARY KEY,company_id int,state text,move_type text,invoice_date date,date date,amount_untaxed_signed numeric,currency_id int,partner_id int,invoice_user_id int,business_line_id int);
 CREATE TABLE account_move_line(id int PRIMARY KEY,company_id int,move_id int,account_id int,partner_id int,date date,date_maturity date,balance numeric,amount_residual numeric,amount_currency numeric,currency_id int,display_type text,product_id int,price_subtotal numeric);
 CREATE TABLE account_payment(id int PRIMARY KEY,company_id int,payment_type text,partner_type text,state text,date date,amount numeric,currency_id int,move_id int,partner_id int);
 CREATE TABLE account_partial_reconcile(id int PRIMARY KEY,company_id int,debit_move_id int,credit_move_id int,amount numeric,max_date date);
 CREATE TABLE sale_order(id int PRIMARY KEY,company_id int,currency_id int,state text,partner_id int,user_id int,business_line_id int,date_order timestamp,margin numeric,amount_untaxed numeric);
 CREATE TABLE product_product(id int PRIMARY KEY,product_tmpl_id int);
 CREATE TABLE product_template(id int PRIMARY KEY,categ_id int,name jsonb);
 CREATE TABLE res_partner(id int,name text);CREATE TABLE res_users(id int,partner_id int);CREATE TABLE business_line(id int,company_id int,name text);CREATE TABLE product_category(id int,name text);CREATE TABLE res_country_state(id int);
 CREATE TABLE sale_order_line(id int);CREATE TABLE sale_order_line_invoice_rel(id int);
 INSERT INTO res_currency VALUES(1,'IQD',0.01);INSERT INTO res_company VALUES(1,1),(2,1);INSERT INTO account_account VALUES(1,'asset_receivable'),(2,'income');
 INSERT INTO product_template VALUES(1,60,'{"en_US":"Product A","ar_001":"منتج أ"}'),(2,61,'{"en_US":"Product B"}');INSERT INTO product_category VALUES(60,'Category A'),(61,'Category B');INSERT INTO res_partner VALUES(20,'Customer A');INSERT INTO product_product VALUES(50,1),(51,2);
 INSERT INTO sale_order VALUES(1,1,1,'sale',20,30,40,'2026-09-15 10:00:00',40,200),(2,1,1,'cancel',20,30,40,'2026-09-15',999,999);
 INSERT INTO account_move VALUES(1,1,'posted','out_invoice','2026-09-05','2026-09-05',125,1,20,30,40),
 (2,1,'posted','out_refund','2026-09-10','2026-09-10',-5,1,20,30,40),(10,1,'posted','entry',NULL,'2026-09-25',0,1,20,NULL,NULL),
 (11,1,'posted','entry',NULL,'2026-09-25',0,1,20,NULL,NULL),(12,1,'posted','entry',NULL,'2026-09-25',0,1,20,NULL,NULL),
 (15,1,'posted','entry',NULL,'2026-09-25',0,1,20,NULL,NULL);
 INSERT INTO account_move_line VALUES
 (100,1,1,1,20,'2026-09-05','2026-09-15',150,45,150,1,'payment_term',NULL,0),
 (101,1,1,2,20,'2026-09-05',NULL,-60,-60,-60,1,'product',50,60),
 (102,1,1,2,20,'2026-09-05',NULL,-65,-65,-65,1,'product',51,65),
 (200,1,2,1,20,'2026-09-10','2026-09-10',-5,0,-5,1,'payment_term',NULL,0),
 (201,1,2,2,20,'2026-09-10',NULL,5,5,5,1,'product',50,5),
 (1000,1,10,1,20,'2026-09-25',NULL,-150,-50,-150,1,'payment_term',NULL,0),
 (1100,1,11,1,20,'2026-09-25',NULL,-999,-999,-999,1,'payment_term',NULL,0),
 (1200,1,12,1,20,'2026-09-25',NULL,999,999,999,1,'payment_term',NULL,0),
 (1500,1,15,1,20,'2026-09-25',NULL,0,0,0,1,'payment_term',NULL,0);
 INSERT INTO account_payment VALUES(10,1,'inbound','customer','paid','2026-09-25',150,1,10,20),
 (11,1,'inbound','customer','canceled','2026-09-25',999,1,11,20),(12,1,'outbound','customer','paid','2026-09-25',999,1,12,20),
 (13,1,'inbound','customer','paid','2026-09-25',999,1,NULL,20),(14,2,'inbound','customer','paid','2026-09-25',999,1,10,20),
 (15,1,'inbound','customer','paid','2026-09-25',0,1,15,20);
 INSERT INTO account_partial_reconcile VALUES(1,1,100,1000,100,'2026-09-25'),(2,1,100,200,5,'2026-09-10');`;
