import type {DashboardWidget,DimensionId,LocalizedText,MetricId} from '@el-dabboos/domain';

export type ProductReportSection='inventory'|'sales';
export interface ProductReportReading {widget:DashboardWidget;section:ProductReportSection}
const text=(en:string,ar:string):LocalizedText=>({en,ar});
function reading(metric:MetricId,section:ProductReportSection,title:LocalizedText):ProductReportReading {
 return {section,widget:{id:metric,type:'table',dimension:'product',title,series:[{id:metric,metric}]}};
}
/** Existing canonical meanings only. Availability and coverage require new certified inputs. */
export const productReportReadings:readonly ProductReportReading[]=[
 reading('internal_stock_quantity','inventory',text('On-hand stock by product','المخزون الفعلي حسب المنتج')),
 reading('expired_stock_quantity','inventory',text('Expired stock by product','المخزون المنتهي حسب المنتج')),
 reading('near_expiry_stock_quantity','inventory',text('Stock expiring within two calendar months','مخزون ينتهي خلال شهرين تقويميين')),
 reading('unknown_expiry_stock_quantity','inventory',text('Stock with unknown expiry','مخزون بصلاحية غير معروفة')),
 reading('invoiced_product_quantity','sales',text('Net invoiced quantity by product','صافي الكمية المفوترة حسب المنتج')),
 reading('period_net_sales','sales',text('Net untaxed invoice sales by product','صافي مبيعات الفواتير دون الضريبة حسب المنتج')),
];
export const productReportProductDimensions:readonly DimensionId[]=['product','product_category','brand'];
export const productReportSalesDimensions:readonly DimensionId[]=['customer','salesperson','state'];
