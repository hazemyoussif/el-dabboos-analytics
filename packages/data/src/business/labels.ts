import {sourceStateLabel} from '@el-dabboos/domain';
import type {PoolClient} from 'pg';
import type {ProductionFact,DimensionId} from '@el-dabboos/domain';
const labelDimensions=['customer','supplier','salesperson','product','product_category','brand','warehouse','state','uom','journal','customer_salesperson','customer_state','customer_tag'] as const;
const labelQueries=[
 "SELECT 'customer' dimension,id::text id,name::text label FROM res_partner WHERE id=ANY($1::int[])",
 "SELECT 'supplier',id::text,name::text FROM res_partner WHERE id=ANY($2::int[])",
 "SELECT 'salesperson',rep.id::text,partner.name::text FROM res_users rep JOIN res_partner partner ON partner.id=rep.partner_id WHERE rep.id=ANY($3::int[])",
 "SELECT 'product',product.id::text,template.name::text FROM product_product product JOIN product_template template ON template.id=product.product_tmpl_id WHERE product.id=ANY($4::int[])",
 "SELECT 'product_category',id::text,name::text FROM product_category WHERE id=ANY($5::int[])",
 "SELECT 'brand',id::text,name::text FROM product_brand WHERE id=ANY($6::int[])",
 "SELECT 'warehouse',id::text,name::text FROM stock_warehouse WHERE id=ANY($7::int[])",
 "SELECT 'state',id::text,name::text FROM res_country_state WHERE id=ANY($8::int[])",
 "SELECT 'uom',id::text,name::text FROM uom_uom WHERE id=ANY($9::int[])",
 "SELECT 'journal',id::text,name::text FROM account_journal WHERE id=ANY($10::int[])",
].join(' UNION ALL ');
const customerLabelQueries=[
 "SELECT 'customer_salesperson' dimension,rep.id::text id,partner.name::text label FROM res_users rep JOIN res_partner partner ON partner.id=rep.partner_id WHERE rep.id=ANY($1::int[])",
 "SELECT 'customer_state',id::text,name::text FROM res_country_state WHERE id=ANY($2::int[])",
 "SELECT 'customer_tag',id::text,name::text FROM res_partner_category WHERE id=ANY($3::int[])",
].join(' UNION ALL ');
const segments:Record<string,string>={markets:'{"en":"Markets — source tags","ar":"أسواق — وسوم المصدر"}','confectionery-bakery-kirzat':'{"en":"Confectionery, bakeries & Kirzat","ar":"حلويات ومعجنات وكرزات"}',wholesale:'{"en":"Wholesale — source tags","ar":"جملة — وسوم المصدر"}',ambiguous:'{"en":"Ambiguous source segments","ar":"تصنيفات مصدر ملتبسة"}',unknown:'{"en":"Unknown source segment","ar":"تصنيف مصدر غير معروف"}'};
/** Fetch each eligible source identity's caption once in the same frozen source transaction. */
export class BusinessSourceLabels {
 private readonly cache=new Map<string,string|null>();
 constructor(private readonly sourceId:string){}
 async read(client:PoolClient,rows:readonly {dimensions:Partial<Record<DimensionId,string|null>>}[]){
  const ids=labelDimensions.map(dimension=>[...new Set(rows.map(row=>this.raw(row.dimensions[dimension])).filter((id):id is string=>!!id&&/^[1-9]\d*$/.test(id)&&!this.cache.has(dimension+':'+id)))]);
  if(ids.some(values=>values.length)){
   const labels=await this.readSourceLabels(client,ids);
   for(const [index,dimension] of labelDimensions.entries())for(const id of ids[index]!)this.cache.set(dimension+':'+id,null);
   for(const row of labels)if(row.label)this.cache.set(row.dimension+':'+row.id,String(row.label));
   if(this.cache.size>25000)throw new Error('Bounded source label cache exceeded');
  }
  return rows.map(row=>this.labels(row.dimensions));
 }
 private async readSourceLabels(client:PoolClient,ids:string[][]){
  const labels:Array<{dimension:string;id:string;label:string|null}>=[];
  if(ids.slice(0,10).some(values=>values.length))labels.push(...(await client.query(labelQueries,ids.slice(0,10))).rows);
  if(ids.slice(10).some(values=>values.length))labels.push(...(await client.query(customerLabelQueries,ids.slice(10))).rows);
  return labels;
 }
 private raw(id:string|null|undefined){return id?.startsWith(this.sourceId+':')?id.slice(this.sourceId.length+1):id;}
 private labels(dimensions:Partial<Record<DimensionId,string|null>>):ProductionFact['displayLabels'] {
  const labels:NonNullable<ProductionFact['displayLabels']>={};
  for(const dimension of labelDimensions){const id=this.raw(dimensions[dimension]),label=id?this.cache.get(dimension+':'+id):undefined;if(label)labels[dimension]=label;}
  const year=this.raw(dimensions.coverage_year);if(year&&/^\d{4}$/.test(year))labels.coverage_year=year;
  const segment=this.raw(dimensions.customer_segment),classification=this.raw(dimensions.customer_class);
  if(segment)labels.customer_segment=segments[segment]??segments.unknown!;
  if(classification)labels.customer_class=classification==='unassigned'||classification==='unknown'?'{"en":"Unknown class","ar":"تصنيف غير معروف"}':classification;
  for(const dimension of ['invoice_document_state','invoice_payment_state','receipt_state','order_state'] as const){const state=this.raw(dimensions[dimension]);if(state&&state!=='unassigned')labels[dimension]=JSON.stringify(sourceStateLabel(state,dimension));}
  return labels;
 }
}
