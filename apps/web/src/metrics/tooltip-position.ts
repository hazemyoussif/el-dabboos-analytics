export interface TooltipBounds {left:number;right:number;top:number;bottom:number}
/** Keep the shared overlay in the viewport, with reading-edge alignment and edge flipping. */
export function tooltipPosition(anchor:TooltipBounds,size:{width:number;height:number},viewport:{width:number;height:number},rtl:boolean) {
 const gap=8;
 const left=Math.max(gap,Math.min(rtl?anchor.right-size.width:anchor.left,viewport.width-size.width-gap));
 const below=anchor.bottom+gap;
 const top=below+size.height<=viewport.height-gap?below:Math.max(gap,anchor.top-size.height-gap);
 return {left,top};
}
