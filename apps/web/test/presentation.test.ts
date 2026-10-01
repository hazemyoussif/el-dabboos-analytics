import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { preferredTheme, resolveTheme, storeTheme, preferredSidebarCollapsed, storeSidebarCollapsed } from '../src/presentation/preferences.ts';
import { chartTheme, seriesColor, showChartLegend } from '../src/rendering/chart-theme.ts';
const store = () => { const values = new Map<string,string>(); return { getItem:(key:string)=>values.get(key) ?? null,setItem:(key:string,value:string)=>{values.set(key,value);},values }; };
test('System is the default; explicit themes persist independently of locale and system changes',()=>{
  const storage=store(); assert.equal(preferredTheme(storage),'system');
  assert.equal(resolveTheme('system',false),'light'); assert.equal(resolveTheme('system',true),'dark');
  for (const theme of ['light','dark','system'] as const) { storeTheme(storage,theme); assert.equal(preferredTheme(storage),theme); }
  assert.equal(resolveTheme('light',true),'light'); assert.equal(resolveTheme('dark',false),'dark');
  storage.setItem('el-dabbous.ui-theme','untrusted'); assert.equal(preferredTheme(storage),'system');
  const unavailable={ getItem:()=>{ throw new Error('blocked'); },setItem:()=>{ throw new Error('blocked'); } };
  assert.equal(preferredTheme(unavailable),'system'); assert.doesNotThrow(()=>storeTheme(unavailable,'dark'));
  assert.equal(preferredTheme(null),'system');
});
test('sidebar collapse preference persists without writing theme, locale or dashboard data',()=>{
  const storage=store(); assert.equal(preferredSidebarCollapsed(storage),false);
  for (const value of [true,false]) { storeSidebarCollapsed(storage,value); assert.equal(preferredSidebarCollapsed(storage),value); }
  assert.deepEqual([...storage.values.keys()],['el-dabbous.sidebar-collapsed']); assert.equal(preferredSidebarCollapsed(null),false);
});
test('chart palettes are bounded, distinct across themes, and stable by series order including wraparound',()=>{
  const light=chartTheme('light'); const dark=chartTheme('dark');
  assert.equal(light.categorical.length,8); assert.equal(new Set(light.categorical).size,8);
  assert.notDeepEqual(light.categorical,dark.categorical);
  for(let index=0;index<24;index++) { assert.equal(seriesColor(light,index),seriesColor(chartTheme('light'),index)); assert.equal(seriesColor(light,index),light.categorical[index%8]); }
  assert.notEqual(light.positive,light.negative); assert.notEqual(dark.grid,light.grid);
});
test('automatic legends hide single series, show comparisons/multiple series/composition, and retain explicit preferences',()=>{
  assert.equal(showChartLegend(1),false); assert.equal(showChartLegend(2),true); assert.equal(showChartLegend(1,'auto',false,true),true);
  assert.equal(showChartLegend(1,'auto',true),true); assert.equal(showChartLegend(1,'show'),true); assert.equal(showChartLegend(2,'hide',true,true),false);
});
const luminance=(hex:string)=>{ const values=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return values[0]!* .2126+values[1]!* .7152+values[2]!* .0722; };
const contrast=(a:string,b:string)=>{ const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
test('controlled UI text and chart labels meet AA normal-text contrast on their surfaces',async()=>{
  const css=await readFile(new URL('../src/styles/tokens.css',import.meta.url),'utf8');
  const blocks=css.split(':root[data-theme="dark"]');
  const extract=(text:string)=>Object.fromEntries([...text.matchAll(/--([\w-]+):\s*(#[\da-f]{6})\b/g)].map(m=>[m[1]!,m[2]!]));
  const light=extract(blocks[0]!);const dark={...light,...extract(blocks[1]!.split('@media')[0]!)};
  for (const tokens of [light,dark]) {
    for(const foreground of ['text-primary','text-secondary','text-muted']) for(const background of ['surface-primary','surface-canvas']) assert.ok(contrast(tokens[foreground]!,tokens[background]!)>=4.5,`${foreground}/${background}`);
    for(const semantic of ['success','warning','danger','info']) { assert.ok(tokens[semantic]); assert.ok(contrast(tokens[semantic]!,tokens[`${semantic}-soft`]!)>=4.5,semantic); }
  }
  for(const theme of [chartTheme('light'),chartTheme('dark')]) for(const color of theme.categorical) assert.ok(contrast(color,theme.onMark)>=4.5,`${color} label`);
});
test('all component CSS uses semantic tokens; drop targets preserve solid/dashed distinction and reduced motion',async()=>{
  for(const file of ['base','shell','dashboard','charts','builder','library']) {
    const css=await readFile(new URL(`../src/styles/${file}.css`,import.meta.url),'utf8');assert.ok(!/#[\da-f]{3,8}\b/i.test(css),file);
  }
  const builder=await readFile(new URL('../src/styles/builder.css',import.meta.url),'utf8');assert.match(builder,/metric-target-valid[^}]*var\(--info\)/); assert.match(builder,/metric-target-invalid[^}]*dashed/);
  assert.match(await readFile(new URL('../src/styles/base.css',import.meta.url),'utf8'),/prefers-reduced-motion/);
});
