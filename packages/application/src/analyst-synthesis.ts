import type { AnalystAnswer, LLMProvider } from '@el-dabboos/domain';
/** Optional multi-analysis emphasis selects evidence only. All labels and authoritative numbers remain deterministic. */
export async function synthesizeAnalystHighlights(provider:LLMProvider,answer:AnalystAnswer,locale:'en'|'ar'):Promise<number[]> {
  if(answer.panels.length<3)return [];
  const evidence=answer.panels.slice(0,12).map((panel,index)=>({reference:index,query:panel.query,summary:panel.summary[locale],status:panel.status,rows:panel.result.rows.slice(0,3)}));
  const response=await provider.generateStructured({locale,responseFormat:{name:'analyst_highlights',strict:true,jsonSchema:{type:'object',additionalProperties:false,required:['references'],properties:{references:{type:'array',minItems:1,maxItems:3,items:{type:'integer',minimum:0,maximum:evidence.length-1}}}}},messages:[{role:'system',content:'Choose at most three existing evidence references that best summarize this multi-analysis result. Do not calculate or invent values, labels or new statements. Return only reference indices.'},{role:'user',content:JSON.stringify({intent:answer.intent,evidence})}]});
  const output=response.output as {references?:unknown};
  if(!output || Object.keys(output).length!==1 || !Array.isArray(output.references) || output.references.length>3 || !output.references.length || output.references.some(reference=>!Number.isInteger(reference)||reference<0||reference>=evidence.length))throw new Error('Ungrounded synthesis');
  return [...new Set(output.references as number[])];
}
