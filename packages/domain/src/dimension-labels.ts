import type { DimensionId, Locale } from './contracts.ts';

/** Shared canonical dimension labels; business member values remain source-owned. */
export const dimensionLabels: Readonly<Record<Locale, Readonly<Record<DimensionId, string>>>> = {
  en: { business_line: 'Business Line',city: 'City',state: 'Governorate / State',date: 'Date', month: 'Month', quarter: 'Quarter', year: 'Year', customer: 'Customer', branch: 'Branch', region: 'Region', salesperson: 'Salesperson', product: 'Product', product_category: 'Category', warehouse: 'Warehouse', equipment: 'Equipment', equipment_category: 'Equipment category', technician: 'Technician' },
  ar: { business_line: 'خط النشاط',city: 'المدينة',state: 'المحافظة',date: 'التاريخ', month: 'الشهر', quarter: 'الربع', year: 'السنة', customer: 'العميل', branch: 'الفرع', region: 'المنطقة', salesperson: 'مندوب المبيعات', product: 'المنتج', product_category: 'الفئة', warehouse: 'المخزن', equipment: 'المعدة', equipment_category: 'فئة المعدات', technician: 'الفني' },
};
