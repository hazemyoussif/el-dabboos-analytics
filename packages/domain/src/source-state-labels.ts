import type {DimensionId,LocalizedText} from './contracts.ts';
const states:Readonly<Record<string,LocalizedText>>={
 draft:{en:'Draft',ar:'مسودة'},sent:{en:'Quotation sent',ar:'عرض سعر مرسل'},sale:{en:'Confirmed',ar:'مؤكد'},done:{en:'Completed',ar:'مكتمل'},
 posted:{en:'Posted',ar:'مرحل'},cancel:{en:'Cancelled',ar:'ملغى'},canceled:{en:'Cancelled',ar:'ملغى'},
 paid:{en:'Paid',ar:'مسدد'},partial:{en:'Partially paid',ar:'مسدد جزئياً'},not_paid:{en:'Unpaid',ar:'غير مسدد'},
 in_process:{en:'In process',ar:'قيد المعالجة'},in_payment:{en:'In payment',ar:'قيد السداد'},reversed:{en:'Reversed',ar:'معكوس'},rejected:{en:'Rejected',ar:'مرفوض'},
};
/** Source state identity is retained even when a bilingual caption is known. */
export function sourceStateLabel(state:string,dimension?:DimensionId):LocalizedText {
 if(state==='draft'&&dimension==='order_state')return {en:'Quotation / draft',ar:'عرض سعر / مسودة'};
 return states[state]??{en:`Unknown state (${state})`,ar:`حالة غير معروفة (${state})`};
}
