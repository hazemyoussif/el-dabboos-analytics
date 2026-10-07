import type { MetricHelp } from './contracts.ts';
/** Governed business copy. Catalog attaches this metadata to the execution definition. */
export const metricHelpContent: Partial<Record<string, Omit<MetricHelp, 'metricType'>>> = {
  "order_count": {
    "shortDefinition": {
      "en": "Number of confirmed sales orders; each order is counted once.",
      "ar": "عدد طلبات البيع المؤكدة؛ يُحتسب كل طلب مرة واحدة."
    },
    "definition": {
      "en": "Number of confirmed sales orders; each order is counted once.",
      "ar": "عدد طلبات البيع المؤكدة؛ يُحتسب كل طلب مرة واحدة."
    },
    "formula": {
      "en": "Count confirmed orders",
      "ar": "عدّ الطلبات المؤكدة"
    },
    "inclusionSummary": {
      "en": "Confirmed sales orders, with cancelled orders counted separately.",
      "ar": "طلبات البيع المؤكدة، مع عدّ الطلبات الملغاة بصورة منفصلة."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "تُستبعد المسودات والمستندات الملغاة."
    },
    "dateBasis": {
      "en": "Order date in the tenant business timezone.",
      "ar": "تاريخ الطلب وفق المنطقة الزمنية للأعمال."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "تُخفض الإشعارات الدائنة المُرحّلة صافي إيرادات الفواتير بتاريخها. قيمة الإشعارات تعرض مقدارها الموجب. مؤشرات الطلبات مستقلة."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "تُجمع المساهمات المؤهلة على المستوى المحدد؛ النسب من إجماليين متطابقين، والعدّ المميز يزيل تكرار الهويات، والمدد تحتاج قاعدة ترجيح معتمدة. الأرصدة تختار حالة واحدة لكل هوية عند القطع وتُجمع عبر الهويات فقط. لا تُجمع النسب أو الأرصدة اليومية."
    },
    "definitionVersion": 1
  },
  "order_revenue": {
    "shortDefinition": {
      "en": "Total value of confirmed sales orders, including document tax.",
      "ar": "إجمالي قيمة طلبات البيع المؤكدة شاملاً ضريبة المستند."
    },
    "definition": {
      "en": "Total value of confirmed sales orders, including document tax.",
      "ar": "إجمالي قيمة طلبات البيع المؤكدة شاملاً ضريبة المستند."
    },
    "formula": {
      "en": "Confirmed Order Revenue",
      "ar": "إيرادات الطلبات المؤكدة"
    },
    "inclusionSummary": {
      "en": "Confirmed sales orders, with cancelled orders counted separately.",
      "ar": "طلبات البيع المؤكدة، مع عدّ الطلبات الملغاة بصورة منفصلة."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "تُستبعد المسودات والمستندات الملغاة."
    },
    "dateBasis": {
      "en": "Order date in the tenant business timezone.",
      "ar": "تاريخ الطلب وفق المنطقة الزمنية للأعمال."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "تُخفض الإشعارات الدائنة المُرحّلة صافي إيرادات الفواتير بتاريخها. قيمة الإشعارات تعرض مقدارها الموجب. مؤشرات الطلبات مستقلة."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "تُجمع المساهمات المؤهلة على المستوى المحدد؛ النسب من إجماليين متطابقين، والعدّ المميز يزيل تكرار الهويات، والمدد تحتاج قاعدة ترجيح معتمدة. الأرصدة تختار حالة واحدة لكل هوية عند القطع وتُجمع عبر الهويات فقط. لا تُجمع النسب أو الأرصدة اليومية."
    },
    "definitionVersion": 1
  },
  "average_confirmed_order_value": {
    "shortDefinition": {
      "en": "Confirmed Order Revenue divided by confirmed Order Count.",
      "ar": "إيرادات الطلبات المؤكدة مقسومة على عدد الطلبات المؤكدة."
    },
    "definition": {
      "en": "Confirmed Order Revenue divided by confirmed Order Count.",
      "ar": "إيرادات الطلبات المؤكدة مقسومة على عدد الطلبات المؤكدة."
    },
    "formula": {
      "en": "Confirmed Order Revenue ÷ Confirmed Order Count",
      "ar": "إيرادات الطلبات المؤكدة ÷ عدد الطلبات المؤكدة"
    },
    "inclusionSummary": {
      "en": "Confirmed sales orders, with cancelled orders counted separately.",
      "ar": "طلبات البيع المؤكدة، مع عدّ الطلبات الملغاة بصورة منفصلة."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "تُستبعد المسودات والمستندات الملغاة."
    },
    "dateBasis": {
      "en": "Order date in the tenant business timezone.",
      "ar": "تاريخ الطلب وفق المنطقة الزمنية للأعمال."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "تُخفض الإشعارات الدائنة المُرحّلة صافي إيرادات الفواتير بتاريخها. قيمة الإشعارات تعرض مقدارها الموجب. مؤشرات الطلبات مستقلة."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "تُجمع المساهمات المؤهلة على المستوى المحدد؛ النسب من إجماليين متطابقين، والعدّ المميز يزيل تكرار الهويات، والمدد تحتاج قاعدة ترجيح معتمدة. الأرصدة تختار حالة واحدة لكل هوية عند القطع وتُجمع عبر الهويات فقط. لا تُجمع النسب أو الأرصدة اليومية."
    },
    "definitionVersion": 1
  },
  "cancelled_orders": {
    "shortDefinition": {
      "en": "Number of cancelled sales orders by order date.",
      "ar": "عدد طلبات البيع الملغاة حسب تاريخ الطلب."
    },
    "definition": {
      "en": "Number of cancelled sales orders by order date.",
      "ar": "عدد طلبات البيع الملغاة حسب تاريخ الطلب."
    },
    "formula": {
      "en": "Count cancelled orders",
      "ar": "عدّ الطلبات الملغاة"
    },
    "inclusionSummary": {
      "en": "Confirmed sales orders, with cancelled orders counted separately.",
      "ar": "طلبات البيع المؤكدة، مع عدّ الطلبات الملغاة بصورة منفصلة."
    },
    "exclusionSummary": {
      "en": "Non-cancelled orders are excluded.",
      "ar": "تُستبعد الطلبات غير الملغاة."
    },
    "dateBasis": {
      "en": "Order date in the tenant business timezone.",
      "ar": "تاريخ الطلب وفق المنطقة الزمنية للأعمال."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "تُخفض الإشعارات الدائنة المُرحّلة صافي إيرادات الفواتير بتاريخها. قيمة الإشعارات تعرض مقدارها الموجب. مؤشرات الطلبات مستقلة."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "تُجمع المساهمات المؤهلة على المستوى المحدد؛ النسب من إجماليين متطابقين، والعدّ المميز يزيل تكرار الهويات، والمدد تحتاج قاعدة ترجيح معتمدة. الأرصدة تختار حالة واحدة لكل هوية عند القطع وتُجمع عبر الهويات فقط. لا تُجمع النسب أو الأرصدة اليومية."
    },
    "definitionVersion": 1
  },
  "invoiced_revenue": {
    "shortDefinition": {
      "en": "Value of posted customer invoices, excluding refunds.",
      "ar": "قيمة فواتير العملاء المُرحّلة دون الإشعارات الدائنة."
    },
    "definition": {
      "en": "Value of posted customer invoices, excluding refunds.",
      "ar": "قيمة فواتير العملاء المُرحّلة دون الإشعارات الدائنة."
    },
    "formula": {
      "en": "Posted Invoice Value",
      "ar": "قيمة الفواتير المُرحّلة"
    },
    "inclusionSummary": {
      "en": "Posted customer invoices and posted credit notes; supplier bills excluded.",
      "ar": "فواتير العملاء والإشعارات الدائنة المُرحّلة؛ تُستبعد فواتير الموردين."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "تُستبعد المسودات والمستندات الملغاة."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "تاريخ الفاتورة؛ كل إشعار دائن يُحتسب بتاريخ إصداره."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "تُخفض الإشعارات الدائنة المُرحّلة صافي إيرادات الفواتير بتاريخها. قيمة الإشعارات تعرض مقدارها الموجب. مؤشرات الطلبات مستقلة."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "تُجمع المساهمات المؤهلة على المستوى المحدد؛ النسب من إجماليين متطابقين، والعدّ المميز يزيل تكرار الهويات، والمدد تحتاج قاعدة ترجيح معتمدة. الأرصدة تختار حالة واحدة لكل هوية عند القطع وتُجمع عبر الهويات فقط. لا تُجمع النسب أو الأرصدة اليومية."
    },
    "definitionVersion": 1
  },
  "refund_value": {
    "shortDefinition": {
      "en": "Posted customer refunds/credit notes shown as a positive value.",
      "ar": "قيمة الإشعارات الدائنة للعملاء المُرحّلة معروضة بمقدار موجب."
    },
    "definition": {
      "en": "Posted customer refunds/credit notes shown as a positive value.",
      "ar": "قيمة الإشعارات الدائنة للعملاء المُرحّلة معروضة بمقدار موجب."
    },
    "formula": {
      "en": "Positive value of posted credit notes",
      "ar": "القيمة الموجبة للإشعارات الدائنة المُرحّلة"
    },
    "inclusionSummary": {
      "en": "Posted customer invoices and posted credit notes; supplier bills excluded.",
      "ar": "فواتير العملاء والإشعارات الدائنة المُرحّلة؛ تُستبعد فواتير الموردين."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "تُستبعد المسودات والمستندات الملغاة."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "تاريخ الفاتورة؛ كل إشعار دائن يُحتسب بتاريخ إصداره."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "تُخفض الإشعارات الدائنة المُرحّلة صافي إيرادات الفواتير بتاريخها. قيمة الإشعارات تعرض مقدارها الموجب. مؤشرات الطلبات مستقلة."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "تُجمع المساهمات المؤهلة على المستوى المحدد؛ النسب من إجماليين متطابقين، والعدّ المميز يزيل تكرار الهويات، والمدد تحتاج قاعدة ترجيح معتمدة. الأرصدة تختار حالة واحدة لكل هوية عند القطع وتُجمع عبر الهويات فقط. لا تُجمع النسب أو الأرصدة اليومية."
    },
    "definitionVersion": 1
  },
  "net_invoiced_revenue": {
    "shortDefinition": {
      "en": "Posted customer invoices minus posted refunds/credit notes, on each document’s own invoice date.",
      "ar": "فواتير العملاء المُرحّلة ناقص الإشعارات الدائنة المُرحّلة، حسب تاريخ كل مستند."
    },
    "definition": {
      "en": "Posted customer invoices minus posted refunds/credit notes, on each document’s own invoice date.",
      "ar": "فواتير العملاء المُرحّلة ناقص الإشعارات الدائنة المُرحّلة، حسب تاريخ كل مستند."
    },
    "formula": {
      "en": "Posted Invoice Value − Refund Value",
      "ar": "قيمة الفواتير المُرحّلة − قيمة الإشعارات الدائنة"
    },
    "inclusionSummary": {
      "en": "Posted customer invoices and posted credit notes; supplier bills excluded.",
      "ar": "فواتير العملاء والإشعارات الدائنة المُرحّلة؛ تُستبعد فواتير الموردين."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "تُستبعد المسودات والمستندات الملغاة."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "تاريخ الفاتورة؛ كل إشعار دائن يُحتسب بتاريخ إصداره."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "تُخفض الإشعارات الدائنة المُرحّلة صافي إيرادات الفواتير بتاريخها. قيمة الإشعارات تعرض مقدارها الموجب. مؤشرات الطلبات مستقلة."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "تُجمع المساهمات المؤهلة على المستوى المحدد؛ النسب من إجماليين متطابقين، والعدّ المميز يزيل تكرار الهويات، والمدد تحتاج قاعدة ترجيح معتمدة. الأرصدة تختار حالة واحدة لكل هوية عند القطع وتُجمع عبر الهويات فقط. لا تُجمع النسب أو الأرصدة اليومية."
    },
    "definitionVersion": 1
  },
  "invoice_count": {
    "shortDefinition": {
      "en": "Number of posted customer invoice documents; refunds excluded.",
      "ar": "عدد مستندات فواتير العملاء المُرحّلة دون الإشعارات الدائنة."
    },
    "definition": {
      "en": "Number of posted customer invoice documents; refunds excluded.",
      "ar": "عدد مستندات فواتير العملاء المُرحّلة دون الإشعارات الدائنة."
    },
    "formula": {
      "en": "Count posted customer invoices",
      "ar": "عدّ فواتير العملاء المُرحّلة"
    },
    "inclusionSummary": {
      "en": "Posted customer invoices and posted credit notes; supplier bills excluded.",
      "ar": "فواتير العملاء والإشعارات الدائنة المُرحّلة؛ تُستبعد فواتير الموردين."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "تُستبعد المسودات والمستندات الملغاة."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "تاريخ الفاتورة؛ كل إشعار دائن يُحتسب بتاريخ إصداره."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "تُخفض الإشعارات الدائنة المُرحّلة صافي إيرادات الفواتير بتاريخها. قيمة الإشعارات تعرض مقدارها الموجب. مؤشرات الطلبات مستقلة."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "تُجمع المساهمات المؤهلة على المستوى المحدد؛ النسب من إجماليين متطابقين، والعدّ المميز يزيل تكرار الهويات، والمدد تحتاج قاعدة ترجيح معتمدة. الأرصدة تختار حالة واحدة لكل هوية عند القطع وتُجمع عبر الهويات فقط. لا تُجمع النسب أو الأرصدة اليومية."
    },
    "definitionVersion": 1
  },
  "refund_count": {
    "shortDefinition": {
      "en": "Number of posted customer credit-note documents.",
      "ar": "عدد مستندات الإشعارات الدائنة للعملاء المُرحّلة."
    },
    "definition": {
      "en": "Number of posted customer credit-note documents.",
      "ar": "عدد مستندات الإشعارات الدائنة للعملاء المُرحّلة."
    },
    "formula": {
      "en": "Count posted credit notes",
      "ar": "عدّ الإشعارات الدائنة المُرحّلة"
    },
    "inclusionSummary": {
      "en": "Posted customer invoices and posted credit notes; supplier bills excluded.",
      "ar": "فواتير العملاء والإشعارات الدائنة المُرحّلة؛ تُستبعد فواتير الموردين."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "تُستبعد المسودات والمستندات الملغاة."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "تاريخ الفاتورة؛ كل إشعار دائن يُحتسب بتاريخ إصداره."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "تُخفض الإشعارات الدائنة المُرحّلة صافي إيرادات الفواتير بتاريخها. قيمة الإشعارات تعرض مقدارها الموجب. مؤشرات الطلبات مستقلة."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "تُجمع المساهمات المؤهلة على المستوى المحدد؛ النسب من إجماليين متطابقين، والعدّ المميز يزيل تكرار الهويات، والمدد تحتاج قاعدة ترجيح معتمدة. الأرصدة تختار حالة واحدة لكل هوية عند القطع وتُجمع عبر الهويات فقط. لا تُجمع النسب أو الأرصدة اليومية."
    },
    "definitionVersion": 1
  },
  "average_invoice_value": {
    "shortDefinition": {
      "en": "Posted Invoice Value divided by posted Invoice Count; refunds are excluded.",
      "ar": "قيمة الفواتير المُرحّلة مقسومة على عددها؛ تُستبعد الإشعارات الدائنة."
    },
    "definition": {
      "en": "Posted Invoice Value divided by posted Invoice Count; refunds are excluded.",
      "ar": "قيمة الفواتير المُرحّلة مقسومة على عددها؛ تُستبعد الإشعارات الدائنة."
    },
    "formula": {
      "en": "Posted Invoice Value ÷ Invoice Count",
      "ar": "قيمة الفواتير المُرحّلة ÷ عدد الفواتير"
    },
    "inclusionSummary": {
      "en": "Posted customer invoices and posted credit notes; supplier bills excluded.",
      "ar": "فواتير العملاء والإشعارات الدائنة المُرحّلة؛ تُستبعد فواتير الموردين."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "تُستبعد المسودات والمستندات الملغاة."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "تاريخ الفاتورة؛ كل إشعار دائن يُحتسب بتاريخ إصداره."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "تُخفض الإشعارات الدائنة المُرحّلة صافي إيرادات الفواتير بتاريخها. قيمة الإشعارات تعرض مقدارها الموجب. مؤشرات الطلبات مستقلة."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "تُجمع المساهمات المؤهلة على المستوى المحدد؛ النسب من إجماليين متطابقين، والعدّ المميز يزيل تكرار الهويات، والمدد تحتاج قاعدة ترجيح معتمدة. الأرصدة تختار حالة واحدة لكل هوية عند القطع وتُجمع عبر الهويات فقط. لا تُجمع النسب أو الأرصدة اليومية."
    },
    "definitionVersion": 1
  },
  "overdue_amount": {
    "shortDefinition": {
      "en": "current residual where due before as-of",
      "ar": "الرصيد المتبقي ذو استحقاق يسبق تاريخ الرصيد؛ اختيار الإجمالي الموجب أو الصافي يحتاج تعريفاً منفصلاً"
    },
    "definition": {
      "en": "current residual where due before as-of",
      "ar": "الرصيد المتبقي ذو استحقاق يسبق تاريخ الرصيد؛ اختيار الإجمالي الموجب أو الصافي يحتاج تعريفاً منفصلاً"
    },
    "formula": {
      "en": "current residual where due before as-of",
      "ar": "الرصيد المتبقي ذو استحقاق يسبق تاريخ الرصيد؛ اختيار الإجمالي الموجب أو الصافي يحتاج تعريفاً منفصلاً"
    },
    "inclusionSummary": {
      "en": "Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate.",
      "ar": "مكونات قيود الذمم المُرحّلة، بما فيها أرصدة الافتتاح المؤهلة؛ دون المسودات والقيود الملغاة. تُفصل السياسات المقترحة."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "تُستبعد المسودات والمستندات الملغاة."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "تاريخ الفاتورة؛ كل إشعار دائن يُحتسب بتاريخ إصداره."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "تُخفض الإشعارات الدائنة المُرحّلة صافي إيرادات الفواتير بتاريخها. قيمة الإشعارات تعرض مقدارها الموجب. مؤشرات الطلبات مستقلة."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "تُجمع المساهمات المؤهلة على المستوى المحدد؛ النسب من إجماليين متطابقين، والعدّ المميز يزيل تكرار الهويات، والمدد تحتاج قاعدة ترجيح معتمدة. الأرصدة تختار حالة واحدة لكل هوية عند القطع وتُجمع عبر الهويات فقط. لا تُجمع النسب أو الأرصدة اليومية."
    },
    "definitionVersion": 1
  },
  "units_sold": {
    "shortDefinition": {
      "en": "signed posted product-line quantity normalized within UOM category",
      "ar": "صافي كميات سطور المنتجات المُرحّلة بعد الإشعارات الدائنة وتوحيد وحدات القياس داخل الفئة"
    },
    "definition": {
      "en": "signed posted product-line quantity normalized within UOM category",
      "ar": "صافي كميات سطور المنتجات المُرحّلة بعد الإشعارات الدائنة وتوحيد وحدات القياس داخل الفئة"
    },
    "formula": {
      "en": "signed posted product-line quantity normalized within UOM category",
      "ar": "صافي كميات سطور المنتجات المُرحّلة بعد الإشعارات الدائنة وتوحيد وحدات القياس داخل الفئة"
    },
    "inclusionSummary": {
      "en": "Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers.",
      "ar": "سطور منتجات فواتير العملاء المُرحّلة مع فصل الإشعارات الدائنة؛ يلزم مطابقة نطاق الخدمات والعرض والدفعات المقدمة والتقريب مع رأس الفاتورة."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "تُستبعد المسودات والمستندات الملغاة."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "تاريخ الفاتورة؛ كل إشعار دائن يُحتسب بتاريخ إصداره."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "تُخفض الإشعارات الدائنة المُرحّلة صافي إيرادات الفواتير بتاريخها. قيمة الإشعارات تعرض مقدارها الموجب. مؤشرات الطلبات مستقلة."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "تُجمع المساهمات المؤهلة على المستوى المحدد؛ النسب من إجماليين متطابقين، والعدّ المميز يزيل تكرار الهويات، والمدد تحتاج قاعدة ترجيح معتمدة. الأرصدة تختار حالة واحدة لكل هوية عند القطع وتُجمع عبر الهويات فقط. لا تُجمع النسب أو الأرصدة اليومية."
    },
    "definitionVersion": 1
  },
  "stock_on_hand": {
    "shortDefinition": {
      "en": "sum current internal-location quants by compatible base UOM",
      "ar": "مجموع كميات أرصدة المواقع الداخلية في لحظة المشاهدة بوحدات متوافقة؛ تُحفظ الأرصدة السالبة ولا تُصفّر"
    },
    "definition": {
      "en": "sum current internal-location quants by compatible base UOM",
      "ar": "مجموع كميات أرصدة المواقع الداخلية في لحظة المشاهدة بوحدات متوافقة؛ تُحفظ الأرصدة السالبة ولا تُصفّر"
    },
    "formula": {
      "en": "sum current internal-location quants by compatible base UOM",
      "ar": "مجموع كميات أرصدة المواقع الداخلية في لحظة المشاهدة بوحدات متوافقة؛ تُحفظ الأرصدة السالبة ولا تُصفّر"
    },
    "inclusionSummary": {
      "en": "Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure.",
      "ar": "أرصدة المواقع الداخلية الحالية؛ الملكية والبضاعة بالأمانة وتسلسل المواقع تحتاج اعتماداً. تبقى الأرصدة السالبة ظاهرة. الحركات مؤشر أحداث منفصل."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "تُستبعد المسودات والمستندات الملغاة."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "تاريخ الفاتورة؛ كل إشعار دائن يُحتسب بتاريخ إصداره."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "تُخفض الإشعارات الدائنة المُرحّلة صافي إيرادات الفواتير بتاريخها. قيمة الإشعارات تعرض مقدارها الموجب. مؤشرات الطلبات مستقلة."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "تُجمع المساهمات المؤهلة على المستوى المحدد؛ النسب من إجماليين متطابقين، والعدّ المميز يزيل تكرار الهويات، والمدد تحتاج قاعدة ترجيح معتمدة. الأرصدة تختار حالة واحدة لكل هوية عند القطع وتُجمع عبر الهويات فقط. لا تُجمع النسب أو الأرصدة اليومية."
    },
    "definitionVersion": 1
  },
  "inventory_value": {
    "shortDefinition": {
      "en": "approved current layer valuation reconciled to stock/accounting",
      "ar": "تقييم المخزون الحالي وفق طبقات تكلفة معتمدة ومطابقة للمحاسبة؛ ليس صافي حركات التقييم لشهر واحد"
    },
    "definition": {
      "en": "approved current layer valuation reconciled to stock/accounting",
      "ar": "تقييم المخزون الحالي وفق طبقات تكلفة معتمدة ومطابقة للمحاسبة؛ ليس صافي حركات التقييم لشهر واحد"
    },
    "formula": {
      "en": "approved current layer valuation reconciled to stock/accounting",
      "ar": "تقييم المخزون الحالي وفق طبقات تكلفة معتمدة ومطابقة للمحاسبة؛ ليس صافي حركات التقييم لشهر واحد"
    },
    "inclusionSummary": {
      "en": "Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure.",
      "ar": "أرصدة المواقع الداخلية الحالية؛ الملكية والبضاعة بالأمانة وتسلسل المواقع تحتاج اعتماداً. تبقى الأرصدة السالبة ظاهرة. الحركات مؤشر أحداث منفصل."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "تُستبعد المسودات والمستندات الملغاة."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "تاريخ الفاتورة؛ كل إشعار دائن يُحتسب بتاريخ إصداره."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "تُخفض الإشعارات الدائنة المُرحّلة صافي إيرادات الفواتير بتاريخها. قيمة الإشعارات تعرض مقدارها الموجب. مؤشرات الطلبات مستقلة."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "تُجمع المساهمات المؤهلة على المستوى المحدد؛ النسب من إجماليين متطابقين، والعدّ المميز يزيل تكرار الهويات، والمدد تحتاج قاعدة ترجيح معتمدة. الأرصدة تختار حالة واحدة لكل هوية عند القطع وتُجمع عبر الهويات فقط. لا تُجمع النسب أو الأرصدة اليومية."
    },
    "definitionVersion": 1
  },
  "opportunity_count": {
    "shortDefinition": {
      "en": "count opportunities",
      "ar": "عدد الفرص البيعية المؤهلة ضمن حالات معتمدة؛ الاستخدام الحالي غير كافٍ"
    },
    "definition": {
      "en": "count opportunities",
      "ar": "عدد الفرص البيعية المؤهلة ضمن حالات معتمدة؛ الاستخدام الحالي غير كافٍ"
    },
    "formula": {
      "en": "count opportunities",
      "ar": "عدد الفرص البيعية المؤهلة ضمن حالات معتمدة؛ الاستخدام الحالي غير كافٍ"
    },
    "inclusionSummary": {
      "en": "Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline.",
      "ar": "مراحل الفرص ومجموعات النشاط والإغلاق تحتاج تعريف المالك؛ فرصة واحدة غير نشطة لا تدعم تحليلاً موثوقاً."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "تُستبعد المسودات والمستندات الملغاة."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "تاريخ الفاتورة؛ كل إشعار دائن يُحتسب بتاريخ إصداره."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "تُخفض الإشعارات الدائنة المُرحّلة صافي إيرادات الفواتير بتاريخها. قيمة الإشعارات تعرض مقدارها الموجب. مؤشرات الطلبات مستقلة."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "تُجمع المساهمات المؤهلة على المستوى المحدد؛ النسب من إجماليين متطابقين، والعدّ المميز يزيل تكرار الهويات، والمدد تحتاج قاعدة ترجيح معتمدة. الأرصدة تختار حالة واحدة لكل هوية عند القطع وتُجمع عبر الهويات فقط. لا تُجمع النسب أو الأرصدة اليومية."
    },
    "definitionVersion": 1
  },
  "win_rate": {
    "shortDefinition": {
      "en": "won / approved closed opportunity cohort",
      "ar": "الفرص المحققة ÷ مجموعة الفرص المغلقة المعتمدة × 100"
    },
    "definition": {
      "en": "won / approved closed opportunity cohort",
      "ar": "الفرص المحققة ÷ مجموعة الفرص المغلقة المعتمدة × 100"
    },
    "formula": {
      "en": "won / approved closed opportunity cohort",
      "ar": "الفرص المحققة ÷ مجموعة الفرص المغلقة المعتمدة × 100"
    },
    "inclusionSummary": {
      "en": "Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline.",
      "ar": "مراحل الفرص ومجموعات النشاط والإغلاق تحتاج تعريف المالك؛ فرصة واحدة غير نشطة لا تدعم تحليلاً موثوقاً."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "تُستبعد المسودات والمستندات الملغاة."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "تاريخ الفاتورة؛ كل إشعار دائن يُحتسب بتاريخ إصداره."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "تُخفض الإشعارات الدائنة المُرحّلة صافي إيرادات الفواتير بتاريخها. قيمة الإشعارات تعرض مقدارها الموجب. مؤشرات الطلبات مستقلة."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "تُجمع المساهمات المؤهلة على المستوى المحدد؛ النسب من إجماليين متطابقين، والعدّ المميز يزيل تكرار الهويات، والمدد تحتاج قاعدة ترجيح معتمدة. الأرصدة تختار حالة واحدة لكل هوية عند القطع وتُجمع عبر الهويات فقط. لا تُجمع النسب أو الأرصدة اليومية."
    },
    "definitionVersion": 1
  },
  "pipeline_value": {
    "shortDefinition": {
      "en": "sum approved active opportunity expected value",
      "ar": "مجموع القيمة المتوقعة للفرص النشطة المؤهلة"
    },
    "definition": {
      "en": "sum approved active opportunity expected value",
      "ar": "مجموع القيمة المتوقعة للفرص النشطة المؤهلة"
    },
    "formula": {
      "en": "sum approved active opportunity expected value",
      "ar": "مجموع القيمة المتوقعة للفرص النشطة المؤهلة"
    },
    "inclusionSummary": {
      "en": "Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline.",
      "ar": "مراحل الفرص ومجموعات النشاط والإغلاق تحتاج تعريف المالك؛ فرصة واحدة غير نشطة لا تدعم تحليلاً موثوقاً."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "تُستبعد المسودات والمستندات الملغاة."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "تاريخ الفاتورة؛ كل إشعار دائن يُحتسب بتاريخ إصداره."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "تُخفض الإشعارات الدائنة المُرحّلة صافي إيرادات الفواتير بتاريخها. قيمة الإشعارات تعرض مقدارها الموجب. مؤشرات الطلبات مستقلة."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "تُجمع المساهمات المؤهلة على المستوى المحدد؛ النسب من إجماليين متطابقين، والعدّ المميز يزيل تكرار الهويات، والمدد تحتاج قاعدة ترجيح معتمدة. الأرصدة تختار حالة واحدة لكل هوية عند القطع وتُجمع عبر الهويات فقط. لا تُجمع النسب أو الأرصدة اليومية."
    },
    "definitionVersion": 1
  },
  "net_aged_receivable": {
    "shortDefinition": {
      "en": "Customer receivables outstanding at cutoff after signed credit balances are netted.",
      "ar": "ذمم العملاء القائمة عند القطع بعد احتساب الأرصدة الدائنة بإشاراتها."
    },
    "definition": {
      "en": "Customer receivables outstanding at cutoff after signed credit balances are netted. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "ذمم العملاء القائمة عند القطع بعد احتساب الأرصدة الدائنة بإشاراتها. يُعاد بناء الرصيد المتبقي حتى القطع؛ الدفعات اللاحقة لا تغير ذلك الرصيد التاريخي."
    },
    "formula": {
      "en": "At Date + 1–30 + 31–60 + 61–90 + 91–120 + >120 = Gross Open Receivable Components + Credit Balances",
      "ar": "عند القطع + ١–٣٠ + ٣١–٦٠ + ٦١–٩٠ + ٩١–١٢٠ + أكثر من ١٢٠ = المكونات الإجمالية + الأرصدة الدائنة"
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "بنود الذمم المدينة المُرحّلة للعملاء، بما فيها أرصدة الفواتير والقيود والدفعات والإشعارات الدائنة."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "المسودات والمستندات الملغاة والحسابات غير المدينة والقيود والتسويات الفعّالة بعد القطع."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "قطع محاسبي شامل. العمر حسب تاريخ الاستحقاق، مع الرجوع إلى تاريخ القيد عند غيابه. المستحق في يوم القطع يدخل في شريحة غير المتأخر."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "الأرصدة الدائنة الموقّعة تبقى في شرائح أعمارها دون تخصيص اعتباطي. المكونات الموجبة الإجمالية مستقلة عن الأرصدة الدائنة."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "تاريخ قطع واحد؛ لا تُجمع الأرصدة عبر التواريخ. النسب من الإجماليات وليست مجموع نسب العملاء."
    },
    "definitionVersion": 1
  },
  "aged_at_date": {
    "shortDefinition": {
      "en": "Signed receivable balances due on or after cutoff, including due today.",
      "ar": "أرصدة الذمم الموقّعة المستحقة في تاريخ القطع أو بعده، بما فيها المستحقة اليوم."
    },
    "definition": {
      "en": "Signed receivable balances due on or after cutoff, including due today. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "أرصدة الذمم الموقّعة المستحقة في تاريخ القطع أو بعده، بما فيها المستحقة اليوم. يُعاد بناء الرصيد المتبقي حتى القطع؛ الدفعات اللاحقة لا تغير ذلك الرصيد التاريخي."
    },
    "formula": {
      "en": "Signed receivable balances due on or after cutoff, including due today.",
      "ar": "أرصدة الذمم الموقّعة المستحقة في تاريخ القطع أو بعده، بما فيها المستحقة اليوم."
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "بنود الذمم المدينة المُرحّلة للعملاء، بما فيها أرصدة الفواتير والقيود والدفعات والإشعارات الدائنة."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "المسودات والمستندات الملغاة والحسابات غير المدينة والقيود والتسويات الفعّالة بعد القطع."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "قطع محاسبي شامل. العمر حسب تاريخ الاستحقاق، مع الرجوع إلى تاريخ القيد عند غيابه. المستحق في يوم القطع يدخل في شريحة غير المتأخر."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "الأرصدة الدائنة الموقّعة تبقى في شرائح أعمارها دون تخصيص اعتباطي. المكونات الموجبة الإجمالية مستقلة عن الأرصدة الدائنة."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "تاريخ قطع واحد؛ لا تُجمع الأرصدة عبر التواريخ. النسب من الإجماليات وليست مجموع نسب العملاء."
    },
    "definitionVersion": 1
  },
  "aged_1_30": {
    "shortDefinition": {
      "en": "Signed receivable balances overdue by 1–30 days at cutoff.",
      "ar": "أرصدة الذمم الموقّعة المتأخرة ١–٣٠ يوماً عند القطع."
    },
    "definition": {
      "en": "Signed receivable balances overdue by 1–30 days at cutoff. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "أرصدة الذمم الموقّعة المتأخرة ١–٣٠ يوماً عند القطع. يُعاد بناء الرصيد المتبقي حتى القطع؛ الدفعات اللاحقة لا تغير ذلك الرصيد التاريخي."
    },
    "formula": {
      "en": "Signed receivable balances overdue by 1–30 days at cutoff.",
      "ar": "أرصدة الذمم الموقّعة المتأخرة ١–٣٠ يوماً عند القطع."
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "بنود الذمم المدينة المُرحّلة للعملاء، بما فيها أرصدة الفواتير والقيود والدفعات والإشعارات الدائنة."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "المسودات والمستندات الملغاة والحسابات غير المدينة والقيود والتسويات الفعّالة بعد القطع."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "قطع محاسبي شامل. العمر حسب تاريخ الاستحقاق، مع الرجوع إلى تاريخ القيد عند غيابه. المستحق في يوم القطع يدخل في شريحة غير المتأخر."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "الأرصدة الدائنة الموقّعة تبقى في شرائح أعمارها دون تخصيص اعتباطي. المكونات الموجبة الإجمالية مستقلة عن الأرصدة الدائنة."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "تاريخ قطع واحد؛ لا تُجمع الأرصدة عبر التواريخ. النسب من الإجماليات وليست مجموع نسب العملاء."
    },
    "definitionVersion": 1
  },
  "aged_31_60": {
    "shortDefinition": {
      "en": "Signed receivable balances overdue by 31–60 days at cutoff.",
      "ar": "أرصدة الذمم الموقّعة المتأخرة ٣١–٦٠ يوماً عند القطع."
    },
    "definition": {
      "en": "Signed receivable balances overdue by 31–60 days at cutoff. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "أرصدة الذمم الموقّعة المتأخرة ٣١–٦٠ يوماً عند القطع. يُعاد بناء الرصيد المتبقي حتى القطع؛ الدفعات اللاحقة لا تغير ذلك الرصيد التاريخي."
    },
    "formula": {
      "en": "Signed receivable balances overdue by 31–60 days at cutoff.",
      "ar": "أرصدة الذمم الموقّعة المتأخرة ٣١–٦٠ يوماً عند القطع."
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "بنود الذمم المدينة المُرحّلة للعملاء، بما فيها أرصدة الفواتير والقيود والدفعات والإشعارات الدائنة."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "المسودات والمستندات الملغاة والحسابات غير المدينة والقيود والتسويات الفعّالة بعد القطع."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "قطع محاسبي شامل. العمر حسب تاريخ الاستحقاق، مع الرجوع إلى تاريخ القيد عند غيابه. المستحق في يوم القطع يدخل في شريحة غير المتأخر."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "الأرصدة الدائنة الموقّعة تبقى في شرائح أعمارها دون تخصيص اعتباطي. المكونات الموجبة الإجمالية مستقلة عن الأرصدة الدائنة."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "تاريخ قطع واحد؛ لا تُجمع الأرصدة عبر التواريخ. النسب من الإجماليات وليست مجموع نسب العملاء."
    },
    "definitionVersion": 1
  },
  "aged_61_90": {
    "shortDefinition": {
      "en": "Signed receivable balances overdue by 61–90 days at cutoff.",
      "ar": "أرصدة الذمم الموقّعة المتأخرة ٦١–٩٠ يوماً عند القطع."
    },
    "definition": {
      "en": "Signed receivable balances overdue by 61–90 days at cutoff. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "أرصدة الذمم الموقّعة المتأخرة ٦١–٩٠ يوماً عند القطع. يُعاد بناء الرصيد المتبقي حتى القطع؛ الدفعات اللاحقة لا تغير ذلك الرصيد التاريخي."
    },
    "formula": {
      "en": "Signed receivable balances overdue by 61–90 days at cutoff.",
      "ar": "أرصدة الذمم الموقّعة المتأخرة ٦١–٩٠ يوماً عند القطع."
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "بنود الذمم المدينة المُرحّلة للعملاء، بما فيها أرصدة الفواتير والقيود والدفعات والإشعارات الدائنة."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "المسودات والمستندات الملغاة والحسابات غير المدينة والقيود والتسويات الفعّالة بعد القطع."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "قطع محاسبي شامل. العمر حسب تاريخ الاستحقاق، مع الرجوع إلى تاريخ القيد عند غيابه. المستحق في يوم القطع يدخل في شريحة غير المتأخر."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "الأرصدة الدائنة الموقّعة تبقى في شرائح أعمارها دون تخصيص اعتباطي. المكونات الموجبة الإجمالية مستقلة عن الأرصدة الدائنة."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "تاريخ قطع واحد؛ لا تُجمع الأرصدة عبر التواريخ. النسب من الإجماليات وليست مجموع نسب العملاء."
    },
    "definitionVersion": 1
  },
  "aged_91_120": {
    "shortDefinition": {
      "en": "Signed receivable balances overdue by 91–120 days at cutoff.",
      "ar": "أرصدة الذمم الموقّعة المتأخرة ٩١–١٢٠ يوماً عند القطع."
    },
    "definition": {
      "en": "Signed receivable balances overdue by 91–120 days at cutoff. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "أرصدة الذمم الموقّعة المتأخرة ٩١–١٢٠ يوماً عند القطع. يُعاد بناء الرصيد المتبقي حتى القطع؛ الدفعات اللاحقة لا تغير ذلك الرصيد التاريخي."
    },
    "formula": {
      "en": "Signed receivable balances overdue by 91–120 days at cutoff.",
      "ar": "أرصدة الذمم الموقّعة المتأخرة ٩١–١٢٠ يوماً عند القطع."
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "بنود الذمم المدينة المُرحّلة للعملاء، بما فيها أرصدة الفواتير والقيود والدفعات والإشعارات الدائنة."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "المسودات والمستندات الملغاة والحسابات غير المدينة والقيود والتسويات الفعّالة بعد القطع."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "قطع محاسبي شامل. العمر حسب تاريخ الاستحقاق، مع الرجوع إلى تاريخ القيد عند غيابه. المستحق في يوم القطع يدخل في شريحة غير المتأخر."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "الأرصدة الدائنة الموقّعة تبقى في شرائح أعمارها دون تخصيص اعتباطي. المكونات الموجبة الإجمالية مستقلة عن الأرصدة الدائنة."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "تاريخ قطع واحد؛ لا تُجمع الأرصدة عبر التواريخ. النسب من الإجماليات وليست مجموع نسب العملاء."
    },
    "definitionVersion": 1
  },
  "aged_over_120": {
    "shortDefinition": {
      "en": "Signed receivable balances overdue by more than 120 days at cutoff.",
      "ar": "أرصدة الذمم الموقّعة المتأخرة أكثر من ١٢٠ يوماً عند القطع."
    },
    "definition": {
      "en": "Signed receivable balances overdue by more than 120 days at cutoff. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "أرصدة الذمم الموقّعة المتأخرة أكثر من ١٢٠ يوماً عند القطع. يُعاد بناء الرصيد المتبقي حتى القطع؛ الدفعات اللاحقة لا تغير ذلك الرصيد التاريخي."
    },
    "formula": {
      "en": "Signed receivable balances overdue by more than 120 days at cutoff.",
      "ar": "أرصدة الذمم الموقّعة المتأخرة أكثر من ١٢٠ يوماً عند القطع."
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "بنود الذمم المدينة المُرحّلة للعملاء، بما فيها أرصدة الفواتير والقيود والدفعات والإشعارات الدائنة."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "المسودات والمستندات الملغاة والحسابات غير المدينة والقيود والتسويات الفعّالة بعد القطع."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "قطع محاسبي شامل. العمر حسب تاريخ الاستحقاق، مع الرجوع إلى تاريخ القيد عند غيابه. المستحق في يوم القطع يدخل في شريحة غير المتأخر."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "الأرصدة الدائنة الموقّعة تبقى في شرائح أعمارها دون تخصيص اعتباطي. المكونات الموجبة الإجمالية مستقلة عن الأرصدة الدائنة."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "تاريخ قطع واحد؛ لا تُجمع الأرصدة عبر التواريخ. النسب من الإجماليات وليست مجموع نسب العملاء."
    },
    "definitionVersion": 1
  },
  "total_overdue_receivable": {
    "shortDefinition": {
      "en": "Sum of the five signed overdue buckets at the same cutoff.",
      "ar": "مجموع شرائح التأخر الخمس الموقّعة عند تاريخ القطع نفسه."
    },
    "definition": {
      "en": "Sum of the five signed overdue buckets at the same cutoff. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "مجموع شرائح التأخر الخمس الموقّعة عند تاريخ القطع نفسه. يُعاد بناء الرصيد المتبقي حتى القطع؛ الدفعات اللاحقة لا تغير ذلك الرصيد التاريخي."
    },
    "formula": {
      "en": "1–30 + 31–60 + 61–90 + 91–120 + >120",
      "ar": "١–٣٠ + ٣١–٦٠ + ٦١–٩٠ + ٩١–١٢٠ + أكثر من ١٢٠"
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "بنود الذمم المدينة المُرحّلة للعملاء، بما فيها أرصدة الفواتير والقيود والدفعات والإشعارات الدائنة."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "المسودات والمستندات الملغاة والحسابات غير المدينة والقيود والتسويات الفعّالة بعد القطع."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "قطع محاسبي شامل. العمر حسب تاريخ الاستحقاق، مع الرجوع إلى تاريخ القيد عند غيابه. المستحق في يوم القطع يدخل في شريحة غير المتأخر."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "الأرصدة الدائنة الموقّعة تبقى في شرائح أعمارها دون تخصيص اعتباطي. المكونات الموجبة الإجمالية مستقلة عن الأرصدة الدائنة."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "تاريخ قطع واحد؛ لا تُجمع الأرصدة عبر التواريخ. النسب من الإجماليات وليست مجموع نسب العملاء."
    },
    "definitionVersion": 1
  },
  "gross_open_receivable_components": {
    "shortDefinition": {
      "en": "Positive open receivable components before remaining credit balances are netted.",
      "ar": "مكونات الذمم المفتوحة الموجبة قبل احتساب الأرصدة الدائنة المتبقية."
    },
    "definition": {
      "en": "Positive open receivable components before remaining credit balances are netted. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "مكونات الذمم المفتوحة الموجبة قبل احتساب الأرصدة الدائنة المتبقية. يُعاد بناء الرصيد المتبقي حتى القطع؛ الدفعات اللاحقة لا تغير ذلك الرصيد التاريخي."
    },
    "formula": {
      "en": "Positive open receivable components before remaining credit balances are netted.",
      "ar": "مكونات الذمم المفتوحة الموجبة قبل احتساب الأرصدة الدائنة المتبقية."
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "بنود الذمم المدينة المُرحّلة للعملاء، بما فيها أرصدة الفواتير والقيود والدفعات والإشعارات الدائنة."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "المسودات والمستندات الملغاة والحسابات غير المدينة والقيود والتسويات الفعّالة بعد القطع."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "قطع محاسبي شامل. العمر حسب تاريخ الاستحقاق، مع الرجوع إلى تاريخ القيد عند غيابه. المستحق في يوم القطع يدخل في شريحة غير المتأخر."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "الأرصدة الدائنة الموقّعة تبقى في شرائح أعمارها دون تخصيص اعتباطي. المكونات الموجبة الإجمالية مستقلة عن الأرصدة الدائنة."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "تاريخ قطع واحد؛ لا تُجمع الأرصدة عبر التواريخ. النسب من الإجماليات وليست مجموع نسب العملاء."
    },
    "definitionVersion": 1
  },
  "credit_balances": {
    "shortDefinition": {
      "en": "Remaining negative open receivable components, shown with their negative sign.",
      "ar": "مكونات الذمم المفتوحة السالبة المتبقية، معروضة بإشارتها السالبة."
    },
    "definition": {
      "en": "Remaining negative open receivable components, shown with their negative sign. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "مكونات الذمم المفتوحة السالبة المتبقية، معروضة بإشارتها السالبة. يُعاد بناء الرصيد المتبقي حتى القطع؛ الدفعات اللاحقة لا تغير ذلك الرصيد التاريخي."
    },
    "formula": {
      "en": "Remaining negative open receivable components, shown with their negative sign.",
      "ar": "مكونات الذمم المفتوحة السالبة المتبقية، معروضة بإشارتها السالبة."
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "بنود الذمم المدينة المُرحّلة للعملاء، بما فيها أرصدة الفواتير والقيود والدفعات والإشعارات الدائنة."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "المسودات والمستندات الملغاة والحسابات غير المدينة والقيود والتسويات الفعّالة بعد القطع."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "قطع محاسبي شامل. العمر حسب تاريخ الاستحقاق، مع الرجوع إلى تاريخ القيد عند غيابه. المستحق في يوم القطع يدخل في شريحة غير المتأخر."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "الأرصدة الدائنة الموقّعة تبقى في شرائح أعمارها دون تخصيص اعتباطي. المكونات الموجبة الإجمالية مستقلة عن الأرصدة الدائنة."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "تاريخ قطع واحد؛ لا تُجمع الأرصدة عبر التواريخ. النسب من الإجماليات وليست مجموع نسب العملاء."
    },
    "definitionVersion": 1
  },
  "overdue_receivable_percentage": {
    "shortDefinition": {
      "en": "Total Overdue divided by Net Aged Receivable; zero denominator gives no value.",
      "ar": "إجمالي الذمم المتأخرة مقسوماً على صافي الذمم حسب العمر؛ لا تُحسب النسبة عند مقام صفري."
    },
    "definition": {
      "en": "Total Overdue divided by Net Aged Receivable; zero denominator gives no value. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "إجمالي الذمم المتأخرة مقسوماً على صافي الذمم حسب العمر؛ لا تُحسب النسبة عند مقام صفري. يُعاد بناء الرصيد المتبقي حتى القطع؛ الدفعات اللاحقة لا تغير ذلك الرصيد التاريخي."
    },
    "formula": {
      "en": "Total Overdue ÷ Net Aged Receivable × 100",
      "ar": "إجمالي الذمم المتأخرة ÷ صافي الذمم حسب العمر × ١٠٠"
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "بنود الذمم المدينة المُرحّلة للعملاء، بما فيها أرصدة الفواتير والقيود والدفعات والإشعارات الدائنة."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "المسودات والمستندات الملغاة والحسابات غير المدينة والقيود والتسويات الفعّالة بعد القطع."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "قطع محاسبي شامل. العمر حسب تاريخ الاستحقاق، مع الرجوع إلى تاريخ القيد عند غيابه. المستحق في يوم القطع يدخل في شريحة غير المتأخر."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "الأرصدة الدائنة الموقّعة تبقى في شرائح أعمارها دون تخصيص اعتباطي. المكونات الموجبة الإجمالية مستقلة عن الأرصدة الدائنة."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "تاريخ قطع واحد؛ لا تُجمع الأرصدة عبر التواريخ. النسب من الإجماليات وليست مجموع نسب العملاء."
    },
    "definitionVersion": 1
  }
};
