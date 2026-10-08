import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { AnalyticsContext, AnalyticsQuery, DrillRequest, DrillRow } from '@el-dabboos/domain';
import { DrillUnavailableError, governedDimensionLabel, requiredMeasures, semanticCatalog } from '@el-dabboos/domain';
import { sourceDisplayLabel } from '../postgres/query-labels.ts';
const cursorKey = randomBytes(32);
export function drillIdentity(request: DrillRequest,context: AnalyticsContext) {
  return createHash('sha256').update(JSON.stringify({query:request.query,clicked:request.clicked,release:request.release,sourceAsOf:request.sourceAsOf,sort:request.sort??{field:'date',direction:'desc'},search:request.search??'',context})).digest('hex');
}
export function encodeDrillCursor(identity:string,sort:string,key:string):string {
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',cursorKey,iv);
  const content=Buffer.concat([cipher.update(JSON.stringify({identity,sort,key})),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),content]).toString('base64url');
}
export function decodeDrillCursor(cursor:string,identity:string):{sort:string;key:string} {
  try {
    const bytes=Buffer.from(cursor,'base64url'),decipher=createDecipheriv('aes-256-gcm',cursorKey,bytes.subarray(0,12));
    decipher.setAuthTag(bytes.subarray(12,28));
    const parsed=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString());
    if(parsed.identity!==identity||typeof parsed.sort!=='string'||typeof parsed.key!=='string')throw new Error('cursor');
    return parsed;
  } catch {throw new DrillUnavailableError('DRILL_CONTEXT_INVALID');}
}
export function drillPredicates(query: AnalyticsQuery,context: AnalyticsContext,params:unknown[],finance:boolean):string {
  const clauses=[...(query.filters??[]),...(context.enforcedFilters??[])].map(filter=>{
    if(finance&&filter.dimension!=='customer')throw new DrillUnavailableError('DRILL_CONTEXT_INVALID');
    if(finance){params.push(filter.values);return `customer_id=ANY($${params.length}::text[])`;}
    params.push(filter.dimension,filter.values);
    return `payload->'dimensions'->>$${params.length-1}=ANY($${params.length}::text[])`;
  });
  return clauses.join(' AND ')||'true';
}
export function drillSort(request:DrillRequest) {
  const columns={date:'date',amount:'amount::numeric',customer:"coalesce(customer,'') COLLATE \"C\"",salesperson:"coalesce(salesperson,'') COLLATE \"C\""};
  return {expression:columns[request.sort?.field??'date'],direction:request.sort?.direction==='asc'?'ASC':'DESC',numeric:request.sort?.field==='amount'};
}
export function detailProjection(row:DrillRow&{identities:Record<string,string>},context:AnalyticsContext):DrillRow {
  const label=(value:string|null,dimension:'customer'|'salesperson'|'business_line')=>value?governedDimensionLabel(row.identities[dimension]??'',sourceDisplayLabel(value,context.locale),context.locale,dimension):null;
  return {date:row.date,customer:label(row.customer,'customer'),salesperson:label(row.salesperson,'salesperson'),businessLine:label(row.businessLine,'business_line'),documentType:row.documentType,status:row.status,measure:row.measure,amount:row.amount,currency:row.currency};
}
export function drillValueExpression(query:AnalyticsQuery) {
  const semantics=semanticCatalog[query.metric].semantics;
  if(semantics.kind==='ratio')return `((bases->>'${semantics.numerator}')::numeric/nullif((bases->>'${semantics.denominator}')::numeric,0)*${semantics.scale})::text`;
  const measure=requiredMeasures(query.metric)[0]!;
  return `(bases->>'${measure}')`;
}
