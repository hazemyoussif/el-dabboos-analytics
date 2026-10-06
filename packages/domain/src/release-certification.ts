import type { FactMeasureId } from './contracts.ts';
import { isCanonicalDecimal } from './production-data.ts';
import { validDateRange } from './validation.ts';

/** Trusted operator evidence, never browser input or an inferred numeric sign-off. */
export interface ReleaseCertification {
  tenantId: string; datasetId: string; mappingVersion: string;
  reference: string; approverReference: string; approvedAt: string;
  companyIds: readonly string[]; from: string; to: string;
  caseIds: readonly string[]; technicalReference: string;
  evidenceKind: 'authorized_business_approval' | 'external_report';
  externalReportReference?: string;
  approvedValues: readonly { measureId: FactMeasureId; value: string }[];
  businessSemantics: readonly string[];
}
const evidenceText = (value: unknown): value is string => typeof value==='string' && value.trim()===value && value.length>0 && value.length<=200;
function evidenceList(value: unknown,maximum: number): value is string[] {
  return Array.isArray(value) && value.length>0 && value.length<=maximum && value.every(evidenceText) && new Set(value).size===value.length;
}
export function validateReleaseCertification(value: ReleaseCertification): void {
  const required = ['tenantId','datasetId','mappingVersion','reference','approverReference','approvedAt','companyIds','from','to','caseIds','technicalReference','evidenceKind','approvedValues','businessSemantics'];
  if (!value || required.some(key => !Object.hasOwn(value,key)) || Object.keys(value).some(key => ![...required,'externalReportReference'].includes(key))) throw new Error('Invalid certification shape');
  if (![value.tenantId,value.datasetId,value.mappingVersion,value.reference,value.approverReference,value.technicalReference].every(evidenceText)) throw new Error('Invalid certification identity');
  if (!Number.isFinite(Date.parse(value.approvedAt)) || new Date(value.approvedAt).toISOString()!==value.approvedAt || !validDateRange({ from: value.from,to: value.to })) throw new Error('Invalid certification period');
  if (!evidenceList(value.companyIds,100) || !evidenceList(value.caseIds,1000) || !evidenceList(value.businessSemantics,30)) throw new Error('Invalid certification evidence');
  if (!['authorized_business_approval','external_report'].includes(value.evidenceKind) || value.evidenceKind==='external_report' && !evidenceText(value.externalReportReference)) throw new Error('Certification authority required');
  validateApprovedValues(value.approvedValues);
}
function validateApprovedValues(values: ReleaseCertification['approvedValues']): void {
  if (!Array.isArray(values) || !values.length || values.length>100 || new Set(values.map(control => control.measureId)).size!==values.length) throw new Error('Invalid approved controls');
  if (values.some(control => Object.keys(control).sort().join(',')!=='measureId,value' || !evidenceText(control.measureId) || !isCanonicalDecimal(control.value))) throw new Error('Invalid approved values');
}
