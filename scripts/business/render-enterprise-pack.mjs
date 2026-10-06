import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const directory = new URL('../../docs/business/', import.meta.url);
export const stateLabels = {
 certified: { en: 'Certified', ar: 'معتمد' },
 reconciled_awaiting_approval: { en: 'Reconciled · Awaiting Business Approval', ar: 'تمت المطابقة · بانتظار اعتماد الأعمال' },
 defined_awaiting_reconciliation: { en: 'Defined · Awaiting Reconciliation', ar: 'مُعرّف · بانتظار المطابقة' },
 discovered: { en: 'Discovered', ar: 'مكتشف' },
 unavailable: { en: 'Unavailable / Insufficient Source Data', ar: 'غير متاح / بيانات المصدر غير كافية' },
};
const pair = (locale, english, arabic) => locale === 'en' ? english : arabic;
const cell = value => String(value ?? '—').replaceAll('|', '\\|').replaceAll('\n', ' ');
const table = entries => ['| ' + entries[0].map(cell).join(' | ') + ' |', '| ' + entries[0].map(() => '---').join(' | ') + ' |', ...entries.slice(1).map(row => '| ' + row.map(cell).join(' | ') + ' |')].join('\n');
export function stateCounts(pack) {
 return Object.fromEntries(Object.keys(stateLabels).map(state => [state, pack.metrics.filter(metric => metric.state === state).length]));
}
function sorted(value) {
 if (Array.isArray(value)) return value.map(sorted);
 if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])]));
 return value;
}
export function resolvedMetric(metric, pack) { return { ...pack.sharedPolicies, ...metric }; }
export function definitionHash(input, pack) {
 const metric = resolvedMetric(input, pack);
 const keys = ['id', 'definitionVersion', 'definition', 'formula', 'kind', 'domain', 'dimensions', 'aggregation', 'nullPolicy', 'signPolicy', 'refundPolicy', 'cancelPolicy', 'businessDate', 'grain', 'unit'];
 const content = Object.fromEntries(keys.map(key => [key, metric[key]]));
 Object.assign(content, { profile: pack.profiles[metric.domain], sourceFields: metric.sourceFields, sourceDate: metric.sourceDate, sourceGrain: metric.sourceGrain });
 return createHash('sha256').update(JSON.stringify(sorted(content))).digest('hex');
}
function introduction(pack, locale, title) {
 const counts = stateCounts(pack);
 return [`# ${title}`, pair(locale, 'Business definition pack v1 · Company 1 · Iraq · IQD · Prepared October 6, 2026.', 'حزمة تعريفات الأعمال، النسخة الأولى · الشركة 1 · العراق · الدينار العراقي · أُعدّت في 6 أكتوبر 2026.'),
 pair(locale, '**Approval preparation only.** Documentation does not approve, certify or publish a metric. Existing published metrics remain governed by their exact release. New approvals are pending; no approver or date is fabricated.', '**لإعداد الاعتماد فقط.** التوثيق لا يعتمد المؤشر ولا يصادق عليه ولا ينشره. المؤشرات المنشورة تحكمها نسخة إصدارها المحددة. الاعتمادات الجديدة معلقة دون افتراض اسم مسؤول أو تاريخ اعتماد.'),
 pair(locale, 'Discovery evidence: 170 candidates, 28 dimensions, 13 domains, 893 physical tables and 269 relevant models. This pack adds explicit business proposals; its 204 entries are definition records, not 204 executable metrics. Counts below describe each definition once, including separately versioned net and gross receivable policies.', 'دليل الاكتشاف: 170 مرشحاً و28 بُعداً و13 مجالاً و893 جدولاً و269 نموذجاً ذا صلة. تضيف الحزمة مقترحات أعمال صريحة؛ سجلاتها الـ204 تعريفات وليست 204 مؤشرات تنفيذية. الأعداد التالية تحصي كل تعريف مرة واحدة، بما فيها سياسات الذمم الصافية والإجمالية الموجبة المنفصلة.'),
 table([[pair(locale, 'Lifecycle', 'مرحلة التعريف'), pair(locale, 'Definitions', 'عدد التعريفات')], ...Object.entries(counts).map(([state, count]) => [stateLabels[state][locale], count])]),
 pair(locale, 'Certified here means an existing certified definition with published September summaries and Business Line/Salesperson pairs only. Other candidate dimensions are not certified. “Defined” means a written proposal, not an approved meaning. “Reconciled” may be numerical control evidence with identity gaps, explicitly disclosed below. Discovery A/B classifications establish source ingredients only.', 'المعتمد هنا تعريف قائم له إجماليات سبتمبر وأزواج خط الأعمال والمندوب المنشورة فقط؛ بقية الأبعاد المرشحة غير معتمدة. المُعرّف مقترح مكتوب لا معنى معتمداً. المطابقة قد تكون دليلاً رقمياً مع فجوة هوية معلنة أدناه. تصنيفات الاكتشاف لا تثبت سوى توافر مدخلات المصدر.'),
 pair(locale, 'Lifecycle: Discovered → Defined → Reconciled → exact-version business approval → certification → explicit publication. Unavailable identifies insufficient capture or source evidence. A generic canonical ID does not certify its Odoo mapping or a grouping.', 'المراحل: اكتشاف ثم تعريف ثم مطابقة ثم اعتماد أعمال للنسخة المحددة ثم مصادقة ثم نشر صريح. غير المتاح يعني قصور الالتقاط أو دليل المصدر. وجود معرّف عام لا يعتمد ربطه بأودو أو أي تجميع.'),
 pair(locale, 'Existing decisions, retained without reopening:', 'قرارات قائمة محفوظة دون إعادة فتح:'), ...pack.establishedDecisions.map(item => '- ' + item[locale])].join('\n\n');
}
function dateExplanation(locale) {
 return pair(locale, 'An event contributes once within a period: Order Revenue/Count use the order date in Asia/Baghdad; invoices use invoice issue date; each refund uses its own issue date. A snapshot describes the position at one cutoff: receivables, stock and inventory value. Sum positions at the same cutoff; never sum daily snapshots into monthly revenue. Reporting period, snapshot cutoff and source extraction timestamp are different. September sales freshness is October 5 at 14:54:58.149 UTC; the receivable control freshness is October 6 at 12:53:16.128 UTC.', 'الحدث يساهم مرة واحدة خلال الفترة: قيمة وعدد الطلبات حسب تاريخ الطلب بتوقيت بغداد، والفواتير حسب تاريخ الإصدار، وكل إشعار دائن حسب تاريخ إصداره. الرصيد يصف الحالة عند قطع واحد: الذمم والمخزون وقيمته. تُجمع الهويات عند القطع نفسه ولا تُجمع الأرصدة اليومية كإيراد شهري. فترة التقرير وتاريخ الرصيد ووقت استخراج المصدر مختلفة. حداثة بيانات المبيعات 5 أكتوبر الساعة 14:54:58.149 عالمياً، وحداثة ضابط الذمم 6 أكتوبر الساعة 12:53:16.128 عالمياً.');
}
function financeBridge(pack, locale) {
 const ids = ['receivables_gross_outstanding_amount', 'credit_balances', 'net_aged_receivable', 'aged_at_date', 'aged_1_30', 'aged_31_60', 'aged_61_90', 'aged_91_120', 'aged_over_120'];
 const rows = ids.map(id => pack.metrics.find(metric => metric.id === id));
 return [pair(locale, '## Finance candidate control — pending confirmation', '## ضابط المالية المرشح — بانتظار التأكيد'),
 pack.financeIdentityEvidence?.identityVerified ? pair(locale, '**CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION.** Cutoff 2026-09-30, IQD. All 15,519 source-ID customer/bucket cases exactly reproduce the workbook (2,217 customers; zero ambiguous, unmatched or unexpected identities). Installed report metadata was inspected at 2026-10-06T18:20:50.379Z; custom code equivalence is not asserted. Finance owner/date/confirmed policy/accepted exceptions are unrecorded. Nothing is business-certified or published.', '**ضابط مرشح — بانتظار تأكيد المالية.** القطع 2026-09-30، بالدينار العراقي. تمت مطابقة 15,519 حالة بهويات الشركاء لـ2,217 عميلاً دون هويات ملتبسة أو مفقودة أو زائدة. تم فحص بيانات التقرير المثبت في 2026-10-06T18:20:50.379Z؛ لا نؤكد تكافؤ منطق الشفرة المخصصة. مسؤول المالية وتاريخ الاعتماد والسياسة المؤكدة والاستثناءات غير مسجلة. لا اعتماد أعمال ولا نشر.') : pair(locale, '**CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION.** Cutoff 2026-09-30, IQD. Total and all six buckets exactly reproduce the supplied workbook; 2,217 numeric customer vectors match, but Excel-customer→res_partner.id identity is unverified. Finance owner/date/accepted exceptions are unrecorded. Nothing is business-certified or published.', '**ضابط مرشح — بانتظار تأكيد المالية.** القطع 2026-09-30، بالدينار العراقي. الإجمالي والشرائح الست تطابق الملف تماماً، وكذلك 2217 متجهاً رقمياً للعملاء؛ لكن ربط عميل الملف بهوية الشريك غير مثبت. مسؤول المالية وتاريخ الاعتماد والاستثناءات غير مسجلة. لا اعتماد أعمال ولا نشر.'),
 table([[pair(locale, 'Control output', 'مخرج الضابط'), 'IQD'], ...rows.map(metric => [metric.name[locale], metric.controlValue])]),
 pair(locale, 'The signed net report uses maturity, falling back to accounting date when absent; due on cutoff belongs in At Date. Gross receivables-aging-v1 instead keeps missing maturity in its own bucket and unapplied credits/advances separate, with no allocation. These policies are not interchangeable. Historical reconstruction uses original balance minus debit-side plus credit-side partial settlements with max_date ≤ cutoff, preserving post-cutoff payments and individual installments. Applied credits reduce residual through accounting settlement; unapplied credits are not assigned by the application.', 'التقرير الصافي بإشارته يستخدم الاستحقاق ويستبدله بتاريخ القيد عند فقده؛ الاستحقاق في يوم القطع ضمن غير المتأخر. أما أعمار الإجمالي الموجب للنسخة الأولى فتعزل الاستحقاق المفقود وتفصل الأرصدة الدائنة والدفعات المقدمة غير المطبقة دون توزيع. السياستان غير متبادلتين. يُعاد بناء الرصيد من الرصيد الأصلي ناقص تسويات المدين وزائد تسويات الدائن حيث تاريخ الفعالية لا يتجاوز القطع، مع حفظ أثر الدفعات اللاحقة وتقسيط الاستحقاق. الأرصدة الدائنة المطبقة تخفض الرصيد عبر التسوية، وغير المطبقة لا يوزعها التطبيق.'),
 pair(locale, 'Gross v1: current 760,615,731.13; 1–30 239,405,751.70; 31–90 94,315,000.66; >90 227,502,606.69; missing maturity 210,912,546.21 IQD (1,319 components). 3,864 positive components / 2,039 known customers; 1,324 partially settled components, residual 623,244,340.38; 1,378 credit/advance components −173,290,543.78. Rejects/ambiguous components: 0 in the preserved extraction; identity verification still pending.', 'الإجمالي الموجب للنسخة الأولى: غير متأخر 760,615,731.13؛ 1–30 بقيمة 239,405,751.70؛ 31–90 بقيمة 94,315,000.66؛ أكثر من 90 بقيمة 227,502,606.69؛ استحقاق مفقود 210,912,546.21 دينار (1319 مكوناً). عدد المكونات الموجبة 3864 لدى 2039 عميلاً معروفاً؛ 1324 مكوناً مسوّى جزئياً برصيد 623,244,340.38؛ و1378 مكوناً دائناً أو دفعة مقدمة بقيمة −173,290,543.78. المرفوض والملتبس صفر في الاستخراج المحفوظ؛ إثبات الهوية ما زال معلقاً.')].join('\n\n');
}
function reportCatalog(pack, locale) {
 const metrics = new Map(pack.metrics.map(metric => [metric.id, metric]));
 const status = { executable_certified: pair(locale, 'Executable · Certified exact series', 'تنفيذي · السلاسل المحددة معتمدة'), blocked: pair(locale, 'Unavailable · grouped publication pending', 'غير متاح · نشر التجميع معلق'), validation_pending: pair(locale, 'Validation only · reconciled / awaiting approval', 'تحقق فقط · مطابق وبانتظار الاعتماد'), information_live: pair(locale, 'Available information surface', 'عرض معلومات متاح'), planned_unpublished: pair(locale, 'Planned specification · unpublished', 'مواصفة مقترحة · غير منشورة') };
 const sections = pack.reports.map(report => [`## ${report.name[locale]} (${report.id})`, table([
 [pair(locale, 'Item', 'البند'), pair(locale, 'Business description', 'وصف الأعمال')],
 [pair(locale, 'Purpose', 'الغرض'), report.purpose[locale]], [pair(locale, 'Users', 'المستخدمون'), report.audience[locale]], [pair(locale, 'Questions', 'الأسئلة'), report.questions[locale]],
 [pair(locale, 'Metrics', 'المؤشرات'), report.metrics.map(id => metrics.get(id).name[locale] + ' (`' + id + '`)').join('; ') || '—'],
 [pair(locale, 'Dimensions', 'الأبعاد'), report.dimensions.join(', ') || pair(locale, 'Summary / metadata', 'إجمالي / بيانات وصفية')],
 [pair(locale, 'Date basis', 'أساس التاريخ'), [...new Set(report.metrics.map(id => pack.profiles[metrics.get(id).domain].businessDate[locale]))].join(' / ') || pair(locale, 'Published metadata', 'البيانات الوصفية المنشورة')],
 [pair(locale, 'Current period', 'الفترة الحالية'), report.period[locale]], [pair(locale, 'State', 'الحالة'), status[report.state]], [pair(locale, 'Limitations', 'القيود'), report.limitations[locale]], [pair(locale, 'Approval / next reconciliation', 'الاعتماد / المطابقة التالية'), report.unlock[locale]],
 ]), ...(report.state === 'executable_certified' ? [report.presentation?.[locale] ?? pair(locale, 'Executive has six KPI cards. Each grouped report has a three-series invoice/refund bar, an Order Revenue bar and a six-metric detail table. No new report is executed by this documentation.', 'الملخص التنفيذي ست بطاقات. كل تقرير مجمّع يضم مخطط فواتير وإشعارات بثلاث سلاسل، ومخطط قيمة الطلبات، وجدولاً بستة مؤشرات. التوثيق لا ينفذ تقريراً جديداً.')] : [])].join('\n\n'));
 return [introduction(pack, locale, pair(locale, 'El-Dabboos Enterprise Report Catalog', 'دليل تقارير الدبوس للمؤسسة')), dateExplanation(locale), ...sections, financeBridge(pack, locale), references(locale)].join('\n\n') + '\n';
}
function metricSection(metric, pack, locale) {
 const profile = pack.profiles[metric.domain];
 return [`### ${metric.name[locale]} — ${metric.id}`, table([
 [pair(locale, 'Definition field', 'بند التعريف'), pair(locale, 'Meaning', 'المعنى')],
 [pair(locale, 'English / Arabic name', 'الاسم الإنجليزي / العربي'), metric.name.en + ' / ' + metric.name.ar],
 [pair(locale, 'Canonical ID', 'المعرّف المعتمد في النظام'), metric.canonicalId ? '`' + metric.canonicalId + '`' : pair(locale, 'Not registered; proposed definition ID only: ', 'غير مسجل؛ معرّف تعريف مقترح فقط: ') + '`' + metric.id + '`'],
 [pair(locale, 'Version / definition hash', 'النسخة / بصمة التعريف'), String(metric.definitionVersion) + ' / `' + metric.definitionHash + '`'],
 [pair(locale, 'Business purpose', 'الغرض التجاري'), profile.purpose[locale] + ' ' + metric.name[locale]],
 [pair(locale, 'Definition', 'التعريف'), metric.definition[locale]], [pair(locale, 'Formula / proposed formula', 'الصيغة / الصيغة المقترحة'), metric.formula[locale]],
 [pair(locale, 'Event / snapshot', 'حدث / رصيد'), metric.kind === 'snapshot' ? pair(locale, 'Snapshot: one cutoff, never summed across dates.', 'رصيد: قطع واحد ولا يُجمع عبر التواريخ.') : pair(locale, 'Event / period-derived measure: defined business window.', 'حدث أو مؤشر مشتق لفترة: نافذة أعمال محددة.')],
 [pair(locale, 'Business date', 'تاريخ الأعمال'), metric.businessDate[locale]], [pair(locale, 'Source concept / Odoo calculation', 'مفهوم المصدر / حساب أودو'), metric.definition[locale] + ' ' + profile.scope[locale]],
 [pair(locale, 'Grain', 'مستوى التفصيل'), metric.grain[locale]], [pair(locale, 'Aggregation', 'سلوك التجميع'), metric.aggregation[locale]], [pair(locale, 'Currency / unit', 'العملة / الوحدة'), metric.unit[locale]],
 [pair(locale, 'Signs', 'الإشارات'), metric.signPolicy[locale]], [pair(locale, 'Included states', 'الحالات الداخلة'), profile.scope[locale]], [pair(locale, 'Excluded / cancellation', 'المستبعد / الإلغاء'), metric.cancelPolicy[locale]],
 [pair(locale, 'Refund / settlement', 'الإشعار الدائن / التسوية'), metric.refundPolicy[locale]], [pair(locale, 'Null / Unassigned', 'المفقود / غير معيّن'), metric.nullPolicy[locale]],
 [pair(locale, 'Published dimensions', 'الأبعاد المنشورة'), metric.publishedDimensions.join(', ') || pair(locale, 'None', 'لا يوجد')], [pair(locale, 'Candidate dimensions (not permissions)', 'الأبعاد المرشحة، وليست صلاحيات'), metric.dimensions.join(', ')],
 [pair(locale, 'Technical evidence', 'الدليل الفني'), metric.state === 'certified' ? pair(locale, 'Existing exact release controls and derived-output approvals where applicable; no new evidence added.', 'ضوابط الإصدار الدقيقة القائمة واعتمادات المخرجات المشتقة حيث تنطبق؛ لم يُضف دليل جديد.') : metric.state === 'reconciled_awaiting_approval' ? pair(locale, 'Preserved independent numerical control; partner identity/source-report gaps remain.', 'ضابط رقمي مستقل محفوظ؛ فجوات هوية الشريك وتقرير المصدر باقية.') : pair(locale, 'Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference.', 'مشاهدات الاكتشاف أو مقترح فقط؛ ليست مطابقة دقيقة من المصدر إلى مخزن التحليلات. يُراجع المرجع الفني.')],
 [pair(locale, 'Business approval', 'اعتماد الأعمال'), metric.approval === 'existing' ? pair(locale, 'Existing established approval; do not reopen. Registry/reference remains authoritative.', 'اعتماد قائم ومستقر دون إعادة فتحه؛ السجل والمرجع القائمان هما السلطة.') : pair(locale, 'Pending exact-version decision; owner/date/exceptions unrecorded.', 'قرار النسخة المحددة معلق؛ المالك والتاريخ والاستثناءات غير مسجلة.')],
 [pair(locale, 'Certification / publication', 'المصادقة / النشر'), metric.published ? pair(locale, 'Existing certified/published September summary and exact Business Line/Salesperson pairs only.', 'إجمالي سبتمبر وأزواج خط الأعمال والمندوب المحددة معتمدة ومنشورة سابقاً فقط.') : pair(locale, 'Not certified; unpublished; unavailable to normal AI/builder generation.', 'غير معتمد وغير منشور؛ غير متاح للتوليد الاعتيادي بالذكاء الاصطناعي أو المحرر.')],
 [pair(locale, 'One lifecycle state', 'مرحلة واحدة للتعريف'), stateLabels[metric.state][locale]], [pair(locale, 'Control example, not a definition constant', 'مثال ضابط وليس ثابتاً في التعريف'), metric.controlValue ?? '—'], [pair(locale, 'Known limitations', 'القيود المعروفة'), metric.notes[locale]],
 ])].join('\n\n');
}
function dictionary(pack, locale) {
 const domains = Object.entries(pack.profiles).map(([domain, profile]) => ['## ' + profile.name[locale], ...pack.metrics.filter(metric => metric.domain === domain).map(metric => metricSection(metric, pack, locale))].join('\n\n'));
 const technical = [pair(locale, '## Technical Source Reference', '## المرجع الفني للمصدر'),
 pair(locale, 'Names below are inspected source references, not runnable mappings. A proposed ID is never a canonical MetricId. Candidate dimensions require exact pair reconciliation and admission. Empty fields mean an input mapping is unresolved, never an invented column. Order salesperson = sale_order.user_id; invoice salesperson = account_move.invoice_user_id; stable customers = res_partner.id, without is_company. Branch identity is unproven. Stock procurement routes are not field-sales routes.', 'الأسماء التالية مراجع مصدر مفحوصة وليست ربطاً تنفيذياً. المعرّف المقترح ليس معرّف مؤشر معتمداً. الأبعاد المرشحة تتطلب مطابقة الزوج وقبوله. الحقول الفارغة تعني مدخلاً غير محسوم لا عموداً مخترعاً. مندوب الطلب ومندوب الفاتورة من حقليهما المعتمدين، والعميل من هوية الشريك دون شرط كونه شركة. هوية الفرع غير مثبتة، ومسار التوريد ليس مسار المبيعات الميدانية.'),
 table([['ID', pair(locale, 'Discovery reference', 'مرجع الاكتشاف'), pair(locale, 'Physical fields / candidate date / grain', 'الحقول / التاريخ المرشح / مستوى التفصيل'), pair(locale, 'Evidence', 'الدليل')], ...pack.metrics.map(metric => [metric.id, metric.discoveryId ?? 'proposal/control', [metric.sourceFields.join(', ') || 'unresolved', metric.sourceDate, metric.sourceGrain].join(' / '), metric.evidenceRefs.join(', ') || 'proposal; no exact output reconciliation'])])].join('\n\n');
 return [introduction(pack, locale, pair(locale, 'El-Dabboos Business Metric Dictionary', 'قاموس مؤشرات الأعمال للدبوس')), dateExplanation(locale), financeBridge(pack, locale), ...domains, technical, references(locale)].join('\n\n') + '\n';
}
function approval(pack, locale) {
 const lookup = new Map(pack.metrics.map(metric => [metric.id, metric]));
 const groups = ['Finance', 'Management', 'Sales / Operations'].map(audience => {
 const decisions = pack.decisions.filter(decision => decision.audience.en === audience);
 return ['## ' + decisions[0].audience[locale], ...decisions.map(decision => {
 const metrics = decision.metrics.map(id => lookup.get(id));
 return ['### ' + decision.id, decision.question[locale],
 table([[pair(locale, 'Metric / exact version', 'المؤشر / النسخة المحددة'), pair(locale, 'Proposed formula / meaning', 'الصيغة / المعنى المقترح'), pair(locale, 'Control example', 'مثال الضابط')], ...metrics.map(metric => [metric.name[locale] + ' (`' + metric.id + '` v' + metric.definitionVersion + ')', metric.formula[locale], metric.controlValue ?? '—'])]),
 pair(locale, 'Why needed: unlock the named report with a meaning Finance, Management and Operations can verify. Existing formulas are listed only where a presentation/stewardship decision needs them; they are not reopened.', 'سبب الطلب: فتح التقرير المحدد بمعنى تستطيع المالية والإدارة والعمليات التحقق منه. الصيغ القائمة تُذكر عند الحاجة لقرار عرض أو مسؤولية، ولا يُعاد فتحها.'),
 pair(locale, 'Exact definition fingerprints:', 'بصمات التعريفات المحددة:') + '\n\n' + metrics.map(metric => '- `' + metric.id + '` / `' + metric.definitionHash + '`').join('\n'),
 pair(locale, 'Decision: [ ] Approve  [ ] Revise  [ ] Reject\n\nComments: ________________________\n\nApprover name and role: ________________________\n\nApproval date: ________________________\n\nConfirmed totals / accepted exceptions / control reference: ________________________', 'القرار: [ ] اعتماد  [ ] تعديل  [ ] رفض\n\nالتعليقات: ________________________\n\nاسم المسؤول ودوره: ________________________\n\nتاريخ الاعتماد: ________________________\n\nالإجماليات المؤكدة / الاستثناءات المقبولة / مرجع الضابط: ________________________')].join('\n\n'); })].join('\n\n');
 });
 return [introduction(pack, locale, pair(locale, 'El-Dabboos Metric Approval Pack', 'حزمة اعتماد مؤشرات الدبوس')), pair(locale, 'Sign an exact definition/version/hash and control reference, not a metric name alone. Any formula/date/currency/grain/credit-policy change creates a new definition version and requires new approval/reconciliation. Completed forms are business evidence, not runtime authorization: an authorized operator must record them through existing append-only versioned governance, link exact controls, certify and explicitly publish. Never insert these pending entries into the runtime registry.', 'يُعتمد تعريف ونسخة وبصمة ومرجع ضابط محدد، وليس اسم المؤشر وحده. تغيير الصيغة أو التاريخ أو العملة أو مستوى التفصيل أو سياسة الأرصدة الدائنة ينشئ نسخة جديدة ويستلزم اعتماداً ومطابقة جديدين. النماذج المكتملة دليل أعمال وليست صلاحية تنفيذ: يسجلها مسؤول مخوّل ضمن الحوكمة القائمة بإضافة سجلات جديدة، ويربط الضوابط الدقيقة ويعتمد وينشر صراحةً. لا تُدرج هذه الطلبات المعلقة في سجل التنفيذ.'), financeBridge(pack, locale), ...groups, references(locale)].join('\n\n') + '\n';
}
function references(locale) {
 return [pair(locale, '## Evidence and operating references', '## الأدلة والمراجع التشغيلية'),
 '- [Discovery catalog](../integration/odoo-analytics-capability-catalog.json) · [Discovery report](../integration/odoo-analytics-capability-discovery.md)',
 '- [Wave 1 exact controls](../integration/odoo-certification-wave-one.json) · [Wave 2 requirements](../integration/finance-product-wave-two-catalog.json)',
 '- [Gross aging v1](../integration/receivables-aging-v1.md) · [Net Odoo control](../integration/odoo-aged-receivable-control.md)',
 '- [Current local reports](../integration/local-management-reports-v1.md) · [Luna QA handoff](../qa/local-management-pack-luna-handoff.md)',
 '- [Versioned definition source](enterprise-metrics-v1.json)',
 pair(locale, 'Private workbook and customer extracts remain outside Git. Documents contain aggregate examples only. Tunnel unavailable on October 6: no new source extraction, approval, certification or publication. Existing local authentication and AI/manual publication guards unchanged. Visual/browser QA deferred to Luna; no visual pass claimed.', 'الملف الخاص وتفاصيل العملاء خارج Git؛ الوثائق تحتوي أمثلة إجمالية فقط. النفق غير متاح في 6 أكتوبر: لا استخراج مصدر جديد ولا اعتماد ولا مصادقة ولا نشر. المصادقة المحلية وحدود نشر الذكاء الاصطناعي والمحرر محفوظة. الفحص البصري والمتصفح مؤجل إلى Luna دون ادعاء اجتيازه.')].join('\n\n');
}
export function renderPack(input) {
 const pack = { ...input, metrics: input.metrics.map(metric => resolvedMetric(metric, input)) };
 return Object.fromEntries(['en', 'ar'].flatMap(locale => [
 ['el-dabboos-report-catalog-' + locale + '.md', reportCatalog(pack, locale)],
 ['el-dabboos-metric-dictionary-' + locale + '.md', dictionary(pack, locale)],
 ['el-dabboos-metric-approval-' + locale + '.md', approval(pack, locale)],
 ]));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
 const pack = JSON.parse(readFileSync(new URL('enterprise-metrics-v1.json', directory), 'utf8'));
 for (const [name, content] of Object.entries(renderPack(pack))) {
  const path = new URL(name, directory);
  if (process.argv.includes('--check')) {
   if (readFileSync(path, 'utf8') !== content) throw new Error('Stale bilingual document: ' + name);
  } else writeFileSync(path, content);
 }
 console.log('Bilingual business pack: six documents ' + (process.argv.includes('--check') ? 'verified' : 'rendered'));
}
