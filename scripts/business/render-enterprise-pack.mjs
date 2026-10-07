import { semanticCatalog } from '../../packages/domain/src/catalog.ts';
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
function standingApproval(pack, locale) {
 const policy = pack.financeStandingApproval;
 if (!policy) return '';
 return [pair(locale, '## Finance standing metric-design approval', '## اعتماد المالية الدائم لتصميم المؤشرات'), `${policy.approverGroup} · ${policy.date} · ${policy.decisionType}`, policy.scope[locale], ...policy.limitations[locale].map(item => '- ' + item), pair(locale, 'A metric is not product-ready until its business definition, formula/date semantics, EN/AR localization and metric-help metadata are complete. Certification requires separate exact technical evidence. Material semantic changes require a new definition version.', 'لا يصبح المؤشر جاهزاً للمنتج قبل اكتمال تعريف الأعمال والصيغة ودلالات التاريخ والتعريب والإنجليزية وبيانات شرح المؤشر. تتطلب المصادقة دليلاً فنياً تاماً مستقلاً. التغيير الجوهري للمعنى يتطلب نسخة تعريف جديدة.')].join('\n\n');
}
function introduction(pack, locale, title) {
 const counts = stateCounts(pack);
 return [`# ${title}`, pair(locale, 'Business definition pack v1 · Company 1 · Iraq · IQD · Prepared October 6, 2026.', 'حزمة تعريفات الأعمال، النسخة الأولى · الشركة 1 · العراق · الدينار العراقي · أُعدّت في 6 أكتوبر 2026.'),
 pair(locale, '**Approval preparation only.** Documentation does not approve, certify or publish a metric. Existing published metrics remain governed by their exact release. The standing Finance decision is recorded below; certification and publication still require exact technical evidence.', '**لإعداد الاعتماد فقط.** التوثيق لا يعتمد المؤشر ولا يصادق عليه ولا ينشره. المؤشرات المنشورة تحكمها نسخة إصدارها المحددة. قرار المالية الدائم مسجل أدناه؛ تتطلب المصادقة والنشر دليلاً فنياً تاماً.'),
 pair(locale, 'Discovery evidence: 170 candidates, 28 dimensions, 13 domains, 893 physical tables and 269 relevant models. This pack adds explicit business proposals; its 204 entries are definition records, not 204 executable metrics. Counts below describe each definition once, including separately versioned net and gross receivable policies.', 'دليل الاكتشاف: 170 مرشحاً و28 بُعداً و13 مجالاً و893 جدولاً و269 نموذجاً ذا صلة. تضيف الحزمة مقترحات أعمال صريحة؛ سجلاتها الـ204 تعريفات وليست 204 مؤشرات تنفيذية. الأعداد التالية تحصي كل تعريف مرة واحدة، بما فيها سياسات الذمم الصافية والإجمالية الموجبة المنفصلة.'),
 table([[pair(locale, 'Lifecycle', 'مرحلة التعريف'), pair(locale, 'Definitions', 'عدد التعريفات')], ...Object.entries(counts).map(([state, count]) => [stateLabels[state][locale], count])]),
 pair(locale, 'Certified means an explicitly published exact definition, period and grouping. September event summaries retain their Business Line/Salesperson pairs. Signed aging is published only at September 30 with the Customer pairs listed per metric; gross components and credits are summary-only. Candidate dimensions are not permissions. Defined means a proposal; discovery establishes source ingredients only.', 'المعتمد تعريف وفترة وتجميع محدد منشور صراحةً. إجماليات أحداث سبتمبر تحتفظ بأزواج خط الأعمال والمندوب. الأعمار الموقّعة منشورة عند قطع 30 سبتمبر فقط وبأزواج العميل المذكورة لكل مؤشر؛ المكونات الإجمالية والأرصدة الدائنة إجماليات فقط. الأبعاد المرشحة ليست صلاحيات. التعريف مقترح، والاكتشاف يثبت مدخلات المصدر فقط.'),
 pair(locale, 'Lifecycle: Discovered → Defined → Reconciled → exact-version business approval → certification → explicit publication. Unavailable identifies insufficient capture or source evidence. A generic canonical ID does not certify its Odoo mapping or a grouping.', 'المراحل: اكتشاف ثم تعريف ثم مطابقة ثم اعتماد أعمال للنسخة المحددة ثم مصادقة ثم نشر صريح. غير المتاح يعني قصور الالتقاط أو دليل المصدر. وجود معرّف عام لا يعتمد ربطه بأودو أو أي تجميع.'),
 pair(locale, 'Existing decisions, retained without reopening:', 'قرارات قائمة محفوظة دون إعادة فتح:'), ...pack.establishedDecisions.map(item => '- ' + item[locale]), standingApproval(pack, locale)].join('\n\n');
}
function dateExplanation(locale) {
 return pair(locale, 'An event contributes once within a period: Order Revenue/Count use the order date in Asia/Baghdad; invoices use invoice issue date; each refund uses its own issue date. A snapshot describes the position at one cutoff: receivables, stock and inventory value. Sum positions at the same cutoff; never sum daily snapshots into monthly revenue. Reporting period, snapshot cutoff and source extraction timestamp are different. September sales freshness is October 5 at 14:54:58.149 UTC; the receivable control freshness is October 6 at 12:53:16.128 UTC.', 'الحدث يساهم مرة واحدة خلال الفترة: قيمة وعدد الطلبات حسب تاريخ الطلب بتوقيت بغداد، والفواتير حسب تاريخ الإصدار، وكل إشعار دائن حسب تاريخ إصداره. الرصيد يصف الحالة عند قطع واحد: الذمم والمخزون وقيمته. تُجمع الهويات عند القطع نفسه ولا تُجمع الأرصدة اليومية كإيراد شهري. فترة التقرير وتاريخ الرصيد ووقت استخراج المصدر مختلفة. حداثة بيانات المبيعات 5 أكتوبر الساعة 14:54:58.149 عالمياً، وحداثة ضابط الذمم 6 أكتوبر الساعة 12:53:16.128 عالمياً.');
}
function financeBridge(pack, locale) {
 const publication = pack.financePublication;
 const ids = ['receivables_gross_outstanding_amount', 'credit_balances', 'net_aged_receivable', 'aged_at_date', 'aged_1_30', 'aged_31_60', 'aged_61_90', 'aged_91_120', 'aged_over_120', 'total_overdue_net'];
 const rows = ids.map(id => pack.metrics.find(metric => metric.id === id));
 return [pair(locale, '## Signed receivable cutoff — exact Finance publication', '## قطع الذمم الموقّعة — نشر المالية بالمطابقة التامة'),
 publication ? pair(locale, '**CERTIFIED AND LOCALLY PUBLISHED.** Finance standing approval October 7, 2026; cutoff September 30, 2026, IQD. All 15,519 source-ID cases are exact across 2,217 customers; zero ambiguous, unmatched, unexpected or mismatched cases. Existing release certification and explicit publication govern this scope.', '**معتمد ومنشور محلياً.** اعتماد المالية الدائم في 7 أكتوبر 2026؛ القطع 30 سبتمبر 2026، بالدينار العراقي. جميع الحالات البالغ عددها 15,519 مطابقة بهويات 2217 عميلاً؛ الملتبس والمفقود والزائد والمختلف صفر. هذا النطاق محكوم بمصادقة الإصدار والنشر الصريح القائمين.') : pair(locale, 'Exact identity controls retained; certification/publication pending.', 'ضوابط الهوية المطابقة محفوظة؛ المصادقة والنشر معلقان.'),
 ...(publication ? ['`' + publication.datasetId + '` · `' + publication.certificationReference + '`'] : []),
 table([[pair(locale, 'Exact cutoff output', 'مخرج القطع المطابق'), 'IQD'], ...rows.map(metric => [metric.name[locale], metric.controlValue])]),
 pair(locale, 'Historical residual includes only settlements effective through cutoff; later payments do not erase history. Maturity date falls back to accounting date when missing; due on cutoff belongs in At Date. Signed credits remain in their own buckets with no allocation. Total Overdue sums the five overdue buckets; Overdue % divides aggregate overdue by aggregate net, with null for zero denominator.', 'الرصيد التاريخي يشمل التسويات الفعّالة حتى القطع فقط؛ الدفعات اللاحقة لا تمحو التاريخ. يُستخدم تاريخ القيد عند فقد الاستحقاق؛ الاستحقاق في يوم القطع ضمن غير المتأخر. تبقى الأرصدة الدائنة بإشارتها في شرائحها دون توزيع. إجمالي المتأخرات مجموع الشرائح الخمس؛ نسبتها قسمة إجمالي المتأخرات على إجمالي الصافي، دون قيمة عند المقام الصفري.'),
 pair(locale, 'Gross-positive aging v1 with a separate missing-maturity bucket remains an alternative unpublished policy. Its summary gross total is supported, but its alternate buckets and any arbitrary credit allocation are not admitted. Installed metadata inspection does not establish general custom-Python equivalence. Other dates/dimensions still need exact evidence and any unresolved policy needs explicit Finance confirmation.', 'أعمار الإجمالي الموجب للنسخة الأولى ذات شريحة الاستحقاق المفقود سياسة بديلة غير منشورة. إجماليها الموجب مدعوم، لكن شرائحها البديلة وأي تخصيص دائن مفترض غير مصرح بهما. فحص بيانات التقرير لا يثبت تكافؤ الشفرة المخصصة عموماً. التواريخ والأبعاد الأخرى تحتاج دليلاً تاماً وأي سياسة غير محسومة تحتاج تأكيداً صريحاً من المالية.')].join('\n\n');
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
 const canonical = semanticCatalog[metric.canonicalId];
 if (canonical) metric = {...metric, definition: canonical.help.definition, formula: canonical.help.formula, businessDate: canonical.help.dateBasis, aggregation: canonical.help.aggregationBehavior, refundPolicy: canonical.help.refundCreditBehavior, cancelPolicy: canonical.help.exclusionSummary};
 const profile = pack.profiles[metric.domain];
 return [`### ${metric.name[locale]} — ${metric.id}`, table([
 [pair(locale, 'Definition field', 'بند التعريف'), pair(locale, 'Meaning', 'المعنى')],
 [pair(locale, 'English / Arabic name', 'الاسم الإنجليزي / العربي'), metric.name.en + ' / ' + metric.name.ar],
 [pair(locale, 'Canonical ID', 'المعرّف المعتمد في النظام'), metric.canonicalId ? '`' + metric.canonicalId + '`' : pair(locale, 'Not registered; proposed definition ID only: ', 'غير مسجل؛ معرّف تعريف مقترح فقط: ') + '`' + metric.id + '`'],
 [pair(locale, 'Version / definition hash', 'النسخة / بصمة التعريف'), String(metric.definitionVersion) + ' / `' + metric.definitionHash + '`'],
 ...(canonical ? [[pair(locale, 'Metric help version', 'نسخة شرح المؤشر'), String(canonical.help.definitionVersion)]] : []),
 [pair(locale, 'Business purpose', 'الغرض التجاري'), profile.purpose[locale] + ' ' + metric.name[locale]],
 [pair(locale, 'Definition', 'التعريف'), metric.definition[locale]], [pair(locale, 'Formula / proposed formula', 'الصيغة / الصيغة المقترحة'), metric.formula[locale]],
 [pair(locale, 'Event / snapshot', 'حدث / رصيد'), metric.kind === 'snapshot' ? pair(locale, 'Snapshot: one cutoff, never summed across dates.', 'رصيد: قطع واحد ولا يُجمع عبر التواريخ.') : pair(locale, 'Event / period-derived measure: defined business window.', 'حدث أو مؤشر مشتق لفترة: نافذة أعمال محددة.')],
 [pair(locale, 'Business date', 'تاريخ الأعمال'), metric.businessDate[locale]], [pair(locale, 'Source concept / Odoo calculation', 'مفهوم المصدر / حساب أودو'), metric.definition[locale] + ' ' + profile.scope[locale]],
 [pair(locale, 'Grain', 'مستوى التفصيل'), metric.grain[locale]], [pair(locale, 'Aggregation', 'سلوك التجميع'), metric.aggregation[locale]], [pair(locale, 'Currency / unit', 'العملة / الوحدة'), metric.unit[locale]],
 [pair(locale, 'Signs', 'الإشارات'), metric.signPolicy[locale]], [pair(locale, 'Included states', 'الحالات الداخلة'), canonical?.help.inclusionSummary[locale] ?? profile.scope[locale]], [pair(locale, 'Excluded / cancellation', 'المستبعد / الإلغاء'), metric.cancelPolicy[locale]],
 [pair(locale, 'Refund / settlement', 'الإشعار الدائن / التسوية'), metric.refundPolicy[locale]], [pair(locale, 'Null / Unassigned', 'المفقود / غير معيّن'), metric.nullPolicy[locale]],
 [pair(locale, 'Published dimensions', 'الأبعاد المنشورة'), metric.publishedDimensions.join(', ') || pair(locale, 'None', 'لا يوجد')], [pair(locale, 'Candidate dimensions (not permissions)', 'الأبعاد المرشحة، وليست صلاحيات'), metric.dimensions.join(', ')],
 [pair(locale, 'Technical evidence', 'الدليل الفني'), metric.state === 'certified' ? pair(locale, 'Exact linked release controls and derived-output approvals where applicable; see the metric approval reference and published scope.', 'ضوابط إصدار مرتبطة بالمطابقة التامة واعتمادات المخرجات المشتقة حيث تنطبق؛ يُراجع مرجع اعتماد المؤشر ونطاقه المنشور.') : metric.state === 'reconciled_awaiting_approval' ? pair(locale, 'Preserved independent numerical control; partner identity/source-report gaps remain.', 'ضابط رقمي مستقل محفوظ؛ فجوات هوية الشريك وتقرير المصدر باقية.') : pair(locale, 'Discovery profiles / proposal only, not exact source-to-mart reconciliation. See technical reference.', 'مشاهدات الاكتشاف أو مقترح فقط؛ ليست مطابقة دقيقة من المصدر إلى مخزن التحليلات. يُراجع المرجع الفني.')],
 [pair(locale, 'Business approval', 'اعتماد الأعمال'), metric.approval === 'standing_finance' ? pair(locale, 'Finance standing approval applied 2026-10-07: ' + metric.approvalRecord.reference, 'اعتماد المالية الدائم مطبق بتاريخ 2026-10-07: ' + metric.approvalRecord.reference) : metric.approval === 'existing' ? pair(locale, 'Existing established approval; do not reopen. Registry/reference remains authoritative.', 'اعتماد قائم ومستقر دون إعادة فتحه؛ السجل والمرجع القائمان هما السلطة.') : pair(locale, 'Pending exact-version decision; owner/date/exceptions unrecorded.', 'قرار النسخة المحددة معلق؛ المالك والتاريخ والاستثناءات غير مسجلة.')],
 [pair(locale, 'Certification / publication', 'المصادقة / النشر'), metric.published ? pair(locale, 'Certified/published summary; exact grouping permissions: ' + (metric.publishedDimensions.join(', ') || 'none') + '. ' + (metric.approval === 'standing_finance' ? 'Cutoff September 30 only.' : 'September event period.'), 'إجمالي معتمد ومنشور؛ صلاحيات التجميع المحددة: ' + (metric.publishedDimensions.join('، ') || 'لا يوجد') + '. ' + (metric.approval === 'standing_finance' ? 'قطع 30 سبتمبر فقط.' : 'فترة أحداث سبتمبر.')) : pair(locale, 'Not certified; unpublished; unavailable to normal AI/builder generation.', 'غير معتمد وغير منشور؛ غير متاح للتوليد الاعتيادي بالذكاء الاصطناعي أو المحرر.')],
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
 decision.state === 'standing_approval_recorded' ? pair(locale, 'Finance standing approval already recorded for the exact published family; no repeated sign-off is requested. Policy changes require a new explicit decision.', 'سُجل اعتماد المالية الدائم للمجموعة المنشورة المحددة؛ لا يُطلب اعتماد متكرر. تغييرات السياسة تحتاج قراراً صريحاً جديداً.') : pair(locale, 'Decision: [ ] Approve  [ ] Revise  [ ] Reject\n\nComments: ________________________\n\nApprover name and role: ________________________\n\nApproval date: ________________________\n\nConfirmed totals / accepted exceptions / control reference: ________________________', 'القرار: [ ] اعتماد  [ ] تعديل  [ ] رفض\n\nالتعليقات: ________________________\n\nاسم المسؤول ودوره: ________________________\n\nتاريخ الاعتماد: ________________________\n\nالإجماليات المؤكدة / الاستثناءات المقبولة / مرجع الضابط: ________________________')].join('\n\n'); })].join('\n\n');
 });
 return [introduction(pack, locale, pair(locale, 'El-Dabboos Metric Approval Pack', 'حزمة اعتماد مؤشرات الدبوس')), pair(locale, 'Sign an exact definition/version/hash and control reference, not a metric name alone. Any formula/date/currency/grain/credit-policy change creates a new definition version and requires new approval/reconciliation. Completed forms are business evidence, not runtime authorization: an authorized operator must record them through existing append-only versioned governance, link exact controls, certify and explicitly publish. Never insert these pending entries into the runtime registry.', 'يُعتمد تعريف ونسخة وبصمة ومرجع ضابط محدد، وليس اسم المؤشر وحده. تغيير الصيغة أو التاريخ أو العملة أو مستوى التفصيل أو سياسة الأرصدة الدائنة ينشئ نسخة جديدة ويستلزم اعتماداً ومطابقة جديدين. النماذج المكتملة دليل أعمال وليست صلاحية تنفيذ: يسجلها مسؤول مخوّل ضمن الحوكمة القائمة بإضافة سجلات جديدة، ويربط الضوابط الدقيقة ويعتمد وينشر صراحةً. لا تُدرج هذه الطلبات المعلقة في سجل التنفيذ.'), financeBridge(pack, locale), ...groups, references(locale)].join('\n\n') + '\n';
}
function references(locale) {
 return [pair(locale, '## Evidence and operating references', '## الأدلة والمراجع التشغيلية'),
 '- [Discovery catalog](../integration/odoo-analytics-capability-catalog.json) · [Discovery report](../integration/odoo-analytics-capability-discovery.md)',
 '- [Wave 1 exact controls](../integration/odoo-certification-wave-one.json) · [Wave 2 requirements](../integration/finance-product-wave-two-catalog.json)',
 '- [Gross aging v1](../integration/receivables-aging-v1.md) · [Net Odoo control](../integration/odoo-aged-receivable-control.md)',
 '- [Current local reports](../integration/local-management-reports-v1.md) · [Luna QA handoff](../qa/local-management-pack-luna-handoff.md)',
 '- [Versioned definition source](enterprise-metrics-v1.json) · [Finance publication and metric-help delivery](../integration/finance-metric-definitions-delivery.md)',
 pair(locale, 'Private workbook and customer extracts remain outside Git. Documents contain aggregate examples only. Finance publication reuses exact frozen evidence through the existing local lifecycle; no new source writes or extraction. Authentication and AI/manual publication guards remain unchanged. Visual/browser QA is deferred to Luna; no visual pass claimed.', 'الملف الخاص وتفاصيل العملاء خارج Git؛ الوثائق تحتوي أمثلة إجمالية فقط. يعيد نشر المالية استخدام الدليل المجمّد المطابق عبر دورة العمل المحلية القائمة؛ دون كتابة للمصدر أو استخراج جديد. المصادقة وحدود نشر الذكاء الاصطناعي والمحرر محفوظة. الفحص البصري والمتصفح مؤجل إلى Luna دون ادعاء اجتيازه.')].join('\n\n');
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
