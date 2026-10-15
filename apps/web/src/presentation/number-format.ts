/** Cache formatter configuration only, never tenant facts or formatted business values. */
const formatters=new Map<string,Intl.NumberFormat>();
export function numberFormatter(locale:string,options:Intl.NumberFormatOptions={}){
 const key=JSON.stringify([locale,options]),existing=formatters.get(key);
 if(existing)return existing;
 const formatter=new Intl.NumberFormat(locale,options);
 if(formatters.size>=64)formatters.clear();
 formatters.set(key,formatter);return formatter;
}
