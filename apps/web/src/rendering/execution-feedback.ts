import type {Locale} from '@el-dabboos/domain';
import {copy} from '../i18n.ts';
/** Only stable execution codes become user-facing copy, never raw adapter messages. */
export function executionFailureLabel(code:string,locale:Locale){
 if(code==='RESULT_LIMIT_EXCEEDED')return locale==='ar'?'حجم الاختيار يتجاوز حد الاستعلام. استخدم المرشحات لتضييق النطاق.':'This selection exceeds the query limit. Use filters to narrow the scope.';
 if(code==='RESULT_WINDOW_INVALID')return locale==='ar'?'تغيرت صفحة النتائج أو البيانات. حدّث التقرير.':'This result window or its data changed. Refresh the report.';
 if(code==='QUERY_TIMEOUT')return locale==='ar'?'استغرق تحميل هذا الاختيار وقتاً أطول من الحد المسموح. أعد المحاولة أو ضيّق النطاق.':'This selection took too long to load. Retry or narrow the scope.';
 return copy[locale].failed;
}
