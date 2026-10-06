import { isCanonicalDecimal } from './production-data.ts';
import { validDateRange } from './validation.ts';
export interface InvoiceResidualObservation {
  state: string; documentType: 'customer_invoice'|'customer_credit_note'|'other'; residualCompanyCurrency: string; dueDate: string|null;
}
/** Proposed invoice-only semantics: deliberately separate from approval, extraction and publication. */
export function classifyInvoiceResidual(invoice: InvoiceResidualObservation,snapshotDate: string) {
  if (!validDateRange({ from: snapshotDate,to: snapshotDate }) || !isCanonicalDecimal(invoice.residualCompanyCurrency) || invoice.dueDate!==null && !validDateRange({ from: invoice.dueDate,to: invoice.dueDate })) throw new Error('Valid dated residual observation required');
  const eligible=invoice.state==='posted' && invoice.documentType==='customer_invoice' && BigInt(invoice.residualCompanyCurrency.replace('.',''))>0n;
  const due=eligible ? invoice.dueDate===null ? 'unknown' : invoice.dueDate<snapshotDate ? 'overdue' : 'not_yet_due' : 'excluded';
  return { eligible,due,outstanding: eligible ? invoice.residualCompanyCurrency : '0.000000',overdue: due==='unknown' ? null : due==='overdue' ? invoice.residualCompanyCurrency : '0.000000',notYetDue: due==='unknown' ? null : due==='not_yet_due' ? invoice.residualCompanyCurrency : '0.000000' };
}
