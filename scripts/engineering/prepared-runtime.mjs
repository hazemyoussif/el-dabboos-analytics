import ts from 'typescript';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {resolver} from './architecture.mjs';
const entry='packages/data/src/prepared/repository.ts';
const forbiddenModule=/packages\/data\/src\/(?:odoo\/|prepared\/(?:preparation|materialization|publication|workspace)\.ts$)/;
const forbiddenRead=/mart\.(?:review_facts|analytics_fact_revisions|analytics_fact_heads|analytics_partition_facts|canonical_facts|fact_revisions|batch_facts|prepared_input_rows|prepared_expected_cells|prepared_snapshot_observations|prepared_complete_controls_exact|prepared_cells_exact|prepared_work_[a-z_]+)\b/;
/** Follow runtime imports/reexports; type-only dependencies cannot introduce a data read. */
export function preparedRuntimeDiagnostics(root){
 const resolve=resolver(root),seen=new Set(),diagnostics=[];
 function visit(file){
  if(seen.has(file)||!file?.endsWith('.ts'))return;
  seen.add(file);
  if(forbiddenModule.test(file)){diagnostics.push(`${entry}: forbidden prepared runtime dependency ${file}`);return;}
  const source=readFileSync(path.join(root,file),'utf8');
  if(forbiddenRead.test(source))diagnostics.push(`${entry}: raw-history read reachable through ${file}`);
  const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
  function imported(specifier){const target=resolve(specifier,file);if(target&&!target.startsWith('node_modules/'))visit(target);}
  function scan(node){
   if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&!node.isTypeOnly&&hasRuntimeBinding(node))imported(node.moduleSpecifier.text);
   if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&ts.isStringLiteralLike(node.arguments[0]))imported(node.arguments[0].text);
   ts.forEachChild(node,scan);
  }
  scan(tree);
 }
 visit(entry);return diagnostics;
}
function hasRuntimeBinding(node){
 if(!ts.isImportDeclaration(node))return !node.exportClause||!ts.isNamedExports(node.exportClause)||node.exportClause.elements.some(element=>!element.isTypeOnly);
 const clause=node.importClause;if(!clause)return true;if(clause.isTypeOnly)return false;
 return Boolean(clause.name)||!clause.namedBindings||ts.isNamespaceImport(clause.namedBindings)||clause.namedBindings.elements.some(element=>!element.isTypeOnly);
}
