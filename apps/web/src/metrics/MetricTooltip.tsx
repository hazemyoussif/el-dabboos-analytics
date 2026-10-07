import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {RefObject} from 'react';
import {tooltipPosition} from './tooltip-position.ts';
interface Props {id:string;text:string;rtl:boolean;visible:boolean;anchor:RefObject<HTMLButtonElement|null>;onEnter:()=>void;onLeave:()=>void}
/** One overlay for every metric surface; clipping remains owned by cards/charts. */
export function MetricTooltip({id,text,rtl,visible,anchor,onEnter,onLeave}:Props) {
 const element=useRef<HTMLSpanElement>(null);
 const [position,setPosition]=useState<{left:number;top:number}|null>(null);
 useEffect(()=>{
  if(!visible){setPosition(null);return;}
  const place=()=>{
   if(!anchor.current||!element.current)return;
   setPosition(tooltipPosition(anchor.current.getBoundingClientRect(),element.current.getBoundingClientRect(),{width:window.innerWidth,height:window.innerHeight},rtl));
  };
  place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
  const observer=new ResizeObserver(place);if(element.current)observer.observe(element.current);
  return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);observer.disconnect();};
 },[visible,anchor,rtl,text]);
 const tooltip=<span ref={element} id={id} role="tooltip" hidden={!visible} className="metric-definition-tooltip" dir={rtl?'rtl':'ltr'} style={{...position,visibility:visible&&!position?'hidden':undefined}} onPointerEnter={onEnter} onPointerLeave={onLeave}>{text}</span>;
 if(typeof document==='undefined')return tooltip;
 return createPortal(tooltip,document.getElementById('app-overlays')??document.body);
}
