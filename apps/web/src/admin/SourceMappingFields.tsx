import type { Locale, SourceHeaderMapping, TenantSourceSettings } from '@el-dabboos/domain';
import { sourceHeaderSlots } from '@el-dabboos/domain';
import { pageLabel } from './controls.tsx';

const slotLabels: Record<keyof SourceHeaderMapping, [string, string]> = {
  date: ['Recognition date', 'تاريخ الاعتراف'], salesperson: ['Salesperson', 'مندوب المبيعات'], untaxed: ['Untaxed amount', 'المبلغ دون الضريبة'],
  tax: ['Tax amount', 'قيمة الضريبة'], total: ['Total amount', 'المبلغ الإجمالي'], updatedAt: ['Last updated', 'آخر تحديث'],
};
const businessLabels: Record<keyof TenantSourceSettings['mapping']['businessLine'], [string, string]> = {
  table: ['Lookup table', 'جدول المرجع'], id: ['Identity field', 'حقل المعرّف'], label: ['Name field', 'حقل الاسم'], updatedAt: ['Last updated field', 'حقل آخر تحديث'],
  orderField: ['Order reference field', 'حقل المرجع في الطلب'], invoiceField: ['Invoice reference field', 'حقل المرجع في الفاتورة'],
};
export function SourceMappingFields({ mapping, locale, onChange }: { mapping: TenantSourceSettings['mapping']; locale: Locale; onChange: (mapping: TenantSourceSettings['mapping']) => void }) {
  const label = pageLabel(locale);
  return <details><summary>{label('Field mapping', 'تعيين الحقول')}</summary>
    <p>{label('Physical fields only. Eligibility, signs, currency rules and metric formulas remain governed by the adapter recipe.', 'حقول المصدر فقط. تبقى حالات الاستحقاق والإشارات والعملات وصيغ المؤشرات محكومة بوصفة المحول.')}</p>
    {(['orders', 'invoices'] as const).map(group => <fieldset key={group}><legend>{group === 'orders' ? label('Sales orders', 'طلبات البيع') : label('Invoices and refunds', 'الفواتير والإشعارات الدائنة')}</legend>
      {sourceHeaderSlots.map(slot => <label key={slot}>{label(...slotLabels[slot])}<input dir="ltr" required maxLength={63} pattern="[a-z_][a-z0-9_]*" value={mapping[group][slot]} onChange={event => onChange({ ...mapping, [group]: { ...mapping[group], [slot]: event.target.value } })} /></label>)}
    </fieldset>)}
    <fieldset><legend>{label('Branch / business line', 'الفرع / خط الأعمال')}</legend>
      {(Object.keys(businessLabels) as (keyof typeof businessLabels)[]).map(slot => <label key={slot}>{label(...businessLabels[slot])}<input dir="ltr" required maxLength={63} pattern="[a-z_][a-z0-9_]*" value={mapping.businessLine[slot]} onChange={event => onChange({ ...mapping, businessLine: { ...mapping.businessLine, [slot]: event.target.value } })} /></label>)}
    </fieldset>
  </details>;
}
