/** Governed transaction evidence retained with immutable fact revisions; no vendor field names. */
export interface TransactionEvidence {
  sourceCompanyId: string;
  state: string;
  documentType: string;
  paymentState: string | null;
  untaxedAmount: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  labels: { customer: string | null; salesperson: string | null; businessLine: string | null; state: string | null };
  area: string | null;
  location?: { latitude: string | null; longitude: string | null; shopGps: string | null };
  relatedLines: readonly { sourceOrderId: string; sourceOrderLineId: string; sourceInvoiceLineId: string }[];
}
const bounded = (value: unknown): value is string => typeof value==='string' && value.length>0 && value.length<=500;
const nullable = (value: unknown): boolean => value===null || bounded(value);
const decimal = (value: unknown): boolean => typeof value==='string' && /^-?(0|[1-9]\d{0,23})\.\d{6}$/.test(value) && value!=='-0.000000';
export function validateTransactionEvidence(evidence: TransactionEvidence): void {
  const keys = ['sourceCompanyId','state','documentType','paymentState','untaxedAmount','taxAmount','totalAmount','currency','labels','area','relatedLines'];
  if (!evidence || keys.some(key => !Object.hasOwn(evidence,key)) || Object.keys(evidence).some(key => ![...keys,'location'].includes(key))) throw new Error('Invalid transaction evidence shape');
  if (![evidence.sourceCompanyId,evidence.state,evidence.documentType].every(bounded) || !nullable(evidence.paymentState) || !nullable(evidence.area) || !/^[A-Z]{3}$/.test(evidence.currency)) throw new Error('Invalid transaction identity');
  if (![evidence.untaxedAmount,evidence.taxAmount,evidence.totalAmount].every(decimal)) throw new Error('Invalid transaction amounts');
  validateTransactionLabels(evidence);
  validateTransactionLineage(evidence.relatedLines);
}
function validateTransactionLabels(evidence: TransactionEvidence): void {
  if (!evidence.labels || Object.keys(evidence.labels).sort().join(',')!==['customer','salesperson','businessLine','state'].sort().join(',') || !Object.values(evidence.labels).every(nullable)) throw new Error('Invalid transaction labels');
  if (evidence.location!==undefined && (!evidence.location || Object.keys(evidence.location).sort().join(',')!=='latitude,longitude,shopGps' || !Object.values(evidence.location).every(nullable))) throw new Error('Invalid transaction location');
}
function validateTransactionLineage(lines: TransactionEvidence['relatedLines']): void {
  if (!Array.isArray(lines) || lines.length>1000 || lines.some(line => Object.keys(line).sort().join(',')!==['sourceOrderId','sourceOrderLineId','sourceInvoiceLineId'].sort().join(',') || !Object.values(line).every(bounded))) throw new Error('Invalid transaction lineage');
}
