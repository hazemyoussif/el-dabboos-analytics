/** Odoo DATE-based allocations use the source business day, not the UTC date. */
export function reviewBusinessDate(cutoff:string,timeZone:string){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(cutoff));
 return ['year','month','day'].map(type=>parts.find(part=>part.type===type)!.value).join('-');
}
