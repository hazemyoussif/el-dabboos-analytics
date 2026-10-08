import type { AnalysisSpec,Locale } from '@el-dabboos/domain';
const descriptions={
  en:{comparison:'Month-over-month (definition 1)',formula:'Absolute change = current month − previous month. Percentage change = (current − previous) / |previous| × 100.',period:'Compare adjacent published months. Missing prior month or missing value returns no change; a zero prior value returns no percentage change.',moving:'Moving average (definition 1)',window:'Trailing monthly mean of present values; initial buckets use the available prefix. Missing values are excluded; an entirely missing window remains missing.'},
  ar:{comparison:'المقارنة بالشهر السابق (التعريف 1)',formula:'التغير المطلق = الشهر الحالي − الشهر السابق. نسبة التغير = (الحالي − السابق) / القيمة المطلقة للسابق × 100.',period:'المقارنة بين شهرين منشورين متجاورين. غياب الشهر السابق أو القيمة يعيد تغيراً غير متاح؛ وإذا كانت القيمة السابقة صفراً فلا تتاح نسبة التغير.',moving:'المتوسط المتحرك (التعريف 1)',window:'متوسط شهري متتابع للقيم المتاحة؛ تستخدم الفترات الأولى الأشهر المتاحة. تُستبعد القيم المفقودة، ويظل النطاق المفقود بالكامل غير متاح.'},
};
export function analysisHelp(analysis:AnalysisSpec|undefined,locale:Locale):[string,string][] {
  const text=descriptions[locale],fields:[string,string][]=[];
  if (analysis?.comparison==='month_over_month') fields.push([text.comparison,text.formula],[locale==='ar'?'سلوك فترة المقارنة':'Comparison period behavior',text.period]);
  if (analysis?.movingAverage) fields.push([`${text.moving}: ${analysis.movingAverage.window}`,text.window]);
  return fields;
}
