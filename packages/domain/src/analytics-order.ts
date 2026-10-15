/** Stable identity order by Unicode code point, matching PostgreSQL UTF-8 C collation. */
export function compareAnalyticsKeys(left:string|null,right:string|null):number{
 const first=String(left),second=String(right);let firstIndex=0,secondIndex=0;
 while(firstIndex<first.length&&secondIndex<second.length){
  const firstPoint=first.codePointAt(firstIndex)!,secondPoint=second.codePointAt(secondIndex)!;
  if(firstPoint!==secondPoint)return firstPoint-secondPoint;
  firstIndex+=firstPoint>0xffff?2:1;secondIndex+=secondPoint>0xffff?2:1;
 }
 return first.length-firstIndex-(second.length-secondIndex);
}
