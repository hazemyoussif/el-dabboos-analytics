import { dimensionLabels } from '@el-dabboos/domain';
import type { DimensionId, GovernedPalette, Locale, MetricType, TenantProfile } from '@el-dabboos/domain';
export const appearanceCopy = {
  en: { heading: 'Dashboard appearance', palette: 'Dashboard palette', widgetPalette: 'Palette', inherit: 'Use dashboard palette', savedHint: 'Applies to widgets without an override. Save to keep changes.' },
  ar: { heading: 'مظهر لوحة المعلومات', palette: 'لوحة ألوان لوحة المعلومات', widgetPalette: 'لوحة الألوان', inherit: 'استخدام لوحة ألوان لوحة المعلومات', savedHint: 'تُطبّق على البطاقات دون تخصيص. احفظ للاحتفاظ بالتغييرات.' },
} as const;
export const paletteLabels: Record<Locale, Record<GovernedPalette, string>> = {
  en: { default: 'Enterprise', blue: 'Ocean', green: 'Forest', orange: 'Amber', purple: 'Plum', red: 'Rose', neutral: 'Slate' },
  ar: { default: 'مؤسسية', blue: 'محيط', green: 'غابة', orange: 'كهرمان', purple: 'برقوق', red: 'ورد', neutral: 'أردواز' },
};
export const copy = {
  en: {
    studio: 'Analytics Studio', product: 'El Dabboos', metricCatalog: 'Metric catalog', available: 'available', planned: 'planned', tagline: 'Ask your business. See the answer.',
    workspace: 'Workspace', createWithAi: 'Create with AI', createWithAiHint: 'Describe the dashboard you need', blankDashboard: 'Blank dashboard', blankDashboardHint: 'Build it manually from an empty canvas', startFromTemplate: 'Start from template', startFromTemplateHint: 'Choose a ready-made dashboard', useTemplate: 'Use template', editWithAi: 'Edit with AI', edit: 'Edit', view: 'View', cancel: 'Cancel', savedDashboards: 'Saved dashboards', noSavedDashboards: 'No saved dashboards yet', templateBadge: 'Template', savedDashboard: 'Saved dashboard', unsaved: 'Unsaved draft', modified: 'Unsaved changes', newDashboard: 'New dashboard', save: 'Save', saveAs: 'Save As', discard: 'Discard', ready: 'Ready to explore', library: 'Dashboard templates', market: 'Market', language: 'Language', promptTitle: 'Describe the dashboard you need',
    promptHint: 'Ask in English or Arabic. This prototype recognizes the executive sales scenario.',
    promptPlaceholder: 'Create an executive sales dashboard for this year showing revenue, gross margin, order count, monthly revenue vs last year, top customers and outstanding receivables.',
    generate: 'Generate dashboard', editTitle: 'Refine this dashboard', editPlaceholder: 'e.g. Add a three-month moving average', apply: 'Apply edit',
    loading: 'Building your dashboard…', empty: 'No data for this selection', failed: 'This widget could not be loaded',
    source: 'Source', dataThrough: 'Data through', sourceUpdated: 'Source updated', period: 'Period', widgets: 'widgets', partial: 'Some widgets need attention',
    results: 'Results', value: 'Value', change: 'Change', rank: 'Rank', manual: 'Template dashboard', generated: 'Generated dashboard',
    select: 'Choose a dashboard', noDashboard: 'Choose a template or describe a dashboard to begin.',
    examples: ['Replace order count with average order value', 'Show only Cairo and Alexandria', 'Change top customers from revenue to gross profit', 'Add a three-month moving average', 'Remove outstanding receivables'],
    dimensions: dimensionLabels.en,
  },
  ar: {
    studio: 'استوديو التحليلات', product: 'El Dabboos', metricCatalog: 'دليل المؤشرات', available: 'متاح', planned: 'قيد التخطيط', tagline: 'اسأل عن أعمالك. وشاهد الإجابة.',
    workspace: 'مساحة العمل', createWithAi: 'إنشاء بالذكاء الاصطناعي', createWithAiHint: 'صف لوحة المعلومات التي تحتاجها', blankDashboard: 'لوحة فارغة', blankDashboardHint: 'ابدأ البناء من لوحة فارغة', startFromTemplate: 'البدء من قالب', startFromTemplateHint: 'اختر لوحة جاهزة', useTemplate: 'استخدام القالب', editWithAi: 'تحرير بالذكاء الاصطناعي', edit: 'تحرير', view: 'عرض', cancel: 'إلغاء', savedDashboards: 'لوحات محفوظة', noSavedDashboards: 'لا توجد لوحات محفوظة بعد', templateBadge: 'قالب', savedDashboard: 'لوحة محفوظة', unsaved: 'مسودة غير محفوظة', modified: 'تغييرات غير محفوظة', newDashboard: 'لوحة جديدة', save: 'حفظ', saveAs: 'حفظ كنسخة', discard: 'تجاهل', ready: 'جاهز للاستكشاف', library: 'قوالب لوحات المعلومات', market: 'السوق', language: 'اللغة', promptTitle: 'صف لوحة المعلومات التي تحتاجها',
    promptHint: 'اكتب بالعربية أو الإنجليزية. يدعم النموذج التجريبي سيناريو المبيعات التنفيذية.',
    promptPlaceholder: 'أنشئ لوحة للمبيعات تعرض الإيرادات وهامش الربح وأعلى العملاء والمديونيات',
    generate: 'إنشاء لوحة', editTitle: 'عدّل هذه اللوحة', editPlaceholder: 'مثال: أضف متوسط متحرك لثلاثة أشهر', apply: 'تطبيق التعديل',
    loading: 'جارٍ تجهيز لوحة المعلومات…', empty: 'لا توجد بيانات لهذا الاختيار', failed: 'تعذّر تحميل هذه البطاقة',
    source: 'المصدر', dataThrough: 'البيانات حتى', sourceUpdated: 'تحديث المصدر', period: 'الفترة', widgets: 'بطاقات', partial: 'بعض البطاقات تحتاج إلى مراجعة',
    results: 'النتائج', value: 'القيمة', change: 'التغير', rank: 'الترتيب', manual: 'لوحة من القوالب', generated: 'لوحة مُنشأة',
    select: 'اختر لوحة', noDashboard: 'اختر قالب لوحة أو صف لوحة جديدة للبدء.',
    examples: ['استبدل عدد الطلبات بمتوسط قيمة الطلب', 'اعرض فرعين فقط', 'غيّر أعلى العملاء إلى إجمالي الربح', 'أضف متوسط متحرك لثلاثة أشهر', 'أزل المديونيات'],
    dimensions: dimensionLabels.ar,
  },
} as const;
/** Dialect appears only in conversational guidance; application labels stay in Modern Standard Arabic. */
export function conversationalCopy(locale: Locale, profile: TenantProfile): { placeholder: string; examples: readonly string[] } {
  if (locale === 'en') return { placeholder: copy.en.promptPlaceholder, examples: [] };
  if (profile.arabicDialect === 'iq') return {
    placeholder: 'أريد dashboard للمبيعات السنة هاي ويّاه أعلى الزبائن والمديونيات',
    examples: ['أريد dashboard للمبيعات السنة هاي ويّاه أعلى الزبائن والمديونيات', 'شكد المبيعات هذا الشهر وشنو أكثر فرع بايع؟'],
  };
  return {
    placeholder: 'عايز dashboard للمبيعات السنة دي ومعاه أعلى العملاء والمديونيات',
    examples: ['عايز dashboard للمبيعات السنة دي ومعاه أعلى العملاء والمديونيات', 'كام المبيعات الشهر ده وأنهي فرع باع أكتر؟'],
  };
}
export const localeTag = (locale: Locale, profile: TenantProfile): string => `${locale}-${profile.countryCode}`;
export function formatValue(value: number | null, type: MetricType, locale: Locale, profile: TenantProfile, unit?: string): string {
  if (value === null) return '—';
  const language = localeTag(locale, profile);
  if (type === 'currency') return new Intl.NumberFormat(language, { style: 'currency', currency: profile.reportingCurrency, maximumFractionDigits: 0 }).format(value);
  if (type === 'percentage') return `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value)}%`;
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: type === 'duration' ? 1 : 0 }).format(value);
  return type === 'duration' ? `${number} ${locale === 'ar' ? (unit==='days'?'يوم':'ساعة') : unit ?? 'hours'}` : number;
}
export function formatDate(value: string, locale: Locale, profile: TenantProfile): string {
  return new Intl.DateTimeFormat(localeTag(locale, profile), { dateStyle: 'medium', timeZone: profile.timeZone }).format(new Date(`${value}T12:00:00Z`));
}
export function formatTimestamp(value: string, locale: Locale, profile: TenantProfile): string {
  return new Intl.DateTimeFormat(localeTag(locale, profile), { dateStyle: 'medium', timeStyle: 'short', timeZone: profile.timeZone }).format(new Date(value));
}
export function formatKey(key: string | null, dimension: DimensionId | undefined, locale: Locale, profile: TenantProfile): string {
  if (key === null) return '—';
  if (key==='unassigned')return locale==='ar'?'غير مسند':'Unassigned';
  if (dimension === 'branch' && profile.branchLabels[key]) return profile.branchLabels[key][locale];
  if (dimension === 'month' && /^\d{4}-\d{2}$/.test(key)) return new Intl.DateTimeFormat(localeTag(locale, profile), { month: 'short', year: 'numeric', timeZone: profile.timeZone }).format(new Date(`${key}-01T12:00:00Z`));
  if (dimension === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(key)) return formatDate(key, locale, profile);
  const match = key.match(/^(customer|product|equipment|salesperson|technician)_(\d+)$/);
  if (match) return `${copy[locale].dimensions[match[1] as DimensionId]} ${new Intl.NumberFormat(localeTag(locale, profile), { useGrouping: false }).format(Number(match[2]))}`;
  return key.replaceAll('_', ' ');
}

export function formatDimensionLabel(label:string,dimension:DimensionId|undefined,locale:Locale):string {
 if(dimension==='business_line') {
  const normalized=label.trim().toLowerCase().replaceAll('_',' ');
  if(normalized==='general')return locale==='ar'?'عام':'General';
  if(normalized==='no sugar')return locale==='ar'?'بدون سكر':'No Sugar';
 }
 return label;
}
