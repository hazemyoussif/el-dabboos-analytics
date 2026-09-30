import type { DimensionId, Locale, MetricType } from '@el-dabbous/domain';
export const copy = {
  en: {
    studio: 'Analytics Studio', product: 'EL-DABBOUS', tagline: 'Ask your business. See the answer.',
    workspace: 'Workspace', ready: 'Ready to explore', library: 'Demo dashboards', promptTitle: 'Describe the dashboard you need',
    promptHint: 'Ask in English or Arabic. This prototype recognizes the executive sales scenario.',
    promptPlaceholder: 'Create an executive sales dashboard for this year showing revenue, gross margin, order count, monthly revenue vs last year, top customers and outstanding receivables.',
    generate: 'Generate dashboard', editTitle: 'Refine this dashboard', editPlaceholder: 'e.g. Add a three-month moving average', apply: 'Apply edit',
    loading: 'Building your dashboard…', empty: 'No data for this selection', failed: 'This widget could not be loaded',
    source: 'Source', fresh: 'Data as of', period: 'Period', widgets: 'widgets', partial: 'Some widgets need attention',
    results: 'Results', value: 'Value', change: 'Change', rank: 'Rank', manual: 'Manual dashboard', generated: 'Generated with demo planner',
    select: 'Choose a dashboard', noDashboard: 'Choose a demo or describe a dashboard to begin.',
    examples: ['Replace order count with average order value', 'Show only Cairo and Alexandria', 'Change top customers from revenue to gross profit', 'Add a three-month moving average', 'Remove outstanding receivables'],
    dimensions: { date: 'Date', month: 'Month', quarter: 'Quarter', year: 'Year', customer: 'Customer', branch: 'Branch', region: 'Region', salesperson: 'Salesperson', product: 'Product', product_category: 'Category', warehouse: 'Warehouse', equipment: 'Equipment', equipment_category: 'Equipment category', technician: 'Technician' },
  },
  ar: {
    studio: 'استوديو التحليلات', product: 'الدبوس', tagline: 'اسأل عن أعمالك. وشاهد الإجابة.',
    workspace: 'مساحة العمل', ready: 'جاهز للاستكشاف', library: 'لوحات تجريبية', promptTitle: 'صف لوحة المعلومات التي تحتاجها',
    promptHint: 'اكتب بالعربية أو الإنجليزية. يدعم النموذج التجريبي سيناريو المبيعات التنفيذية.',
    promptPlaceholder: 'اعمل لي لوحة لمتابعة المبيعات السنة دي فيها الإيرادات وهامش الربح وعدد الطلبات وأعلى العملاء والمديونيات',
    generate: 'إنشاء لوحة', editTitle: 'عدّل هذه اللوحة', editPlaceholder: 'مثال: أضف متوسط متحرك لثلاثة أشهر', apply: 'تطبيق التعديل',
    loading: 'جارٍ تجهيز لوحة المعلومات…', empty: 'لا توجد بيانات لهذا الاختيار', failed: 'تعذّر تحميل هذه البطاقة',
    source: 'المصدر', fresh: 'البيانات حتى', period: 'الفترة', widgets: 'بطاقات', partial: 'بعض البطاقات تحتاج إلى مراجعة',
    results: 'النتائج', value: 'القيمة', change: 'التغير', rank: 'الترتيب', manual: 'لوحة جاهزة', generated: 'أنشئت بمخطط تجريبي',
    select: 'اختر لوحة', noDashboard: 'اختر لوحة تجريبية أو صف لوحة جديدة للبدء.',
    examples: ['استبدل عدد الطلبات بمتوسط قيمة الطلب', 'اعرض القاهرة والإسكندرية فقط', 'غيّر أعلى العملاء إلى إجمالي الربح', 'أضف متوسط متحرك لثلاثة أشهر', 'شيل المديونيات'],
    dimensions: { date: 'التاريخ', month: 'الشهر', quarter: 'الربع', year: 'السنة', customer: 'العميل', branch: 'الفرع', region: 'المنطقة', salesperson: 'مندوب المبيعات', product: 'المنتج', product_category: 'الفئة', warehouse: 'المخزن', equipment: 'المعدة', equipment_category: 'فئة المعدات', technician: 'الفني' },
  },
} as const;
const branches: Record<string, { en: string; ar: string }> = {
  cairo: { en: 'Cairo', ar: 'القاهرة' }, giza: { en: 'Giza', ar: 'الجيزة' }, alexandria: { en: 'Alexandria', ar: 'الإسكندرية' },
  mansoura: { en: 'Mansoura', ar: 'المنصورة' }, tanta: { en: 'Tanta', ar: 'طنطا' }, aswan: { en: 'Aswan', ar: 'أسوان' },
};
export function formatValue(value: number | null, type: MetricType, locale: Locale, unit?: string): string {
  if (value === null) return '—';
  const language = locale === 'ar' ? 'ar-EG' : 'en-EG';
  if (type === 'currency') return new Intl.NumberFormat(language, { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value);
  if (type === 'percentage') return `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value)}%`;
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: type === 'duration' ? 1 : 0 }).format(value);
  return type === 'duration' ? `${number} ${locale === 'ar' ? 'ساعة' : unit ?? 'hours'}` : number;
}
export function formatKey(key: string | null, dimension: DimensionId | undefined, locale: Locale): string {
  if (key === null) return '—';
  if (dimension === 'branch' && branches[key]) return branches[key][locale];
  if (dimension === 'month' && /^\d{4}-\d{2}$/.test(key)) return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${key}-01T00:00:00Z`));
  if (dimension === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(key)) return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${key}T00:00:00Z`));
  const match = key.match(/^(customer|product|equipment|salesperson|technician)_(\d+)$/);
  if (match) return `${copy[locale].dimensions[match[1] as DimensionId]} ${new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', { useGrouping: false }).format(Number(match[2]))}`;
  return key.replaceAll('_', ' ');
}
