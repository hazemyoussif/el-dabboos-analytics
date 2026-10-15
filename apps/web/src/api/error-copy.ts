import type {Locale} from '@el-dabboos/domain';
const analyticsErrors:Record<string,{en:string;ar:string}>={
 DATA_NOT_READY:{en:'Analytics data is not ready for this workspace.',ar:'بيانات التحليلات غير جاهزة لمساحة العمل هذه.'},
 ANALYTICS_UNAVAILABLE:{en:'Analytics could not be checked. Please retry.',ar:'تعذر التحقق من التحليلات. أعد المحاولة.'},
 INVALID_RESULT_WINDOW:{en:'This result page is invalid. Refresh the report.',ar:'صفحة النتائج غير صالحة. حدّث التقرير.'},
};
export function apiErrorCopy(code:string,message:string,locale:Locale){return analyticsErrors[code]?.[locale]??message;}
