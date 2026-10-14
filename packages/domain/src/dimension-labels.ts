import type { DimensionId, Locale } from './contracts.ts';

/** Shared canonical dimension labels; business member values remain source-owned. */
export const dimensionLabels: Readonly<Record<Locale, Readonly<Record<DimensionId, string>>>> = {
  en: {brand:'Product Brand',customer_segment:'Source Customer Segment',customer_class:'Calendar YTD A/B/C',uom:'Base Unit of Measure',journal:'Cash / Bank Journal',supplier:'Supplier', business_line: 'Business Line',city: 'City',state: 'Governorate / State',date: 'Date', month: 'Month', quarter: 'Quarter', year: 'Year', customer: 'Customer', branch: 'Branch', region: 'Region', salesperson: 'Salesperson', product: 'Product', product_category: 'Category', warehouse: 'Warehouse', equipment: 'Equipment', equipment_category: 'Equipment category', technician: 'Technician' },
  ar: {brand:'العلامة التجارية',customer_segment:'تصنيف العميل من المصدر',customer_class:'تصنيف السنة أ/ب/ج',uom:'وحدة القياس الأساسية',journal:'دفتر النقد والبنك',supplier:'المورد', business_line: 'خط النشاط',city: 'المدينة',state: 'المحافظة',date: 'التاريخ', month: 'الشهر', quarter: 'الربع', year: 'السنة', customer: 'العميل', branch: 'الفرع', region: 'المنطقة', salesperson: 'مندوب المبيعات', product: 'المنتج', product_category: 'الفئة', warehouse: 'المخزن', equipment: 'المعدة', equipment_category: 'فئة المعدات', technician: 'الفني' },
};
