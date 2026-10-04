import ts from 'typescript';
import { createHash } from 'node:crypto';
export const limits = { complexity: 15, statements: 60, parameters: 5, fileStatements: 400, shortNames: 0 };
const functions = node => ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isConstructorDeclaration(node);
function nodeName(node) {
  if (ts.isConstructorDeclaration(node)) return 'constructor';
  if (node.name) return node.name.getText();
  if (ts.isVariableDeclaration(node.parent) || ts.isPropertyAssignment(node.parent)) return node.parent.name.getText();
  if (ts.isCallExpression(node.parent)) return `${node.parent.expression.getText()}:callback${node.parent.arguments.indexOf(node)}`;
  return `${ts.SyntaxKind[node.kind]}:anonymous`;
}
/** AST ownership paths survive formatting and line movement. Duplicate paths fail rather than silently sharing debt. */
export function measure(file, source) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const records = [], seen = new Set();
  let fileStatements = 0;
  function visit(node, owners) {
    if (ts.isStatement(node)) fileStatements++;
    const own = functions(node) && node.body !== undefined;
    const namedContainer = ts.isClassDeclaration(node) || ts.isClassExpression(node);
    const path = own || namedContainer ? [...owners, nodeName(node)] : owners;
    if (own) {
      let symbol = path.join('/');
      if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && !ts.isVariableDeclaration(node.parent) && !ts.isPropertyAssignment(node.parent)) symbol += ':' + createHash('sha256').update(node.getText().replace(/\s+/g, ' ')).digest('hex').slice(0, 12);
      if (seen.has(symbol)) return;
      seen.add(symbol);
      let complexity = 1, statements = 0;
      function body(child) {
        if (child !== node && functions(child)) return;
        if (ts.isStatement(child)) statements++;
        if (ts.isIfStatement(child) || ts.isConditionalExpression(child) || ts.isForStatement(child) || ts.isForOfStatement(child) || ts.isForInStatement(child) || ts.isWhileStatement(child) || ts.isDoStatement(child) || ts.isCatchClause(child) || ts.isCaseClause(child)) complexity++;
        if (ts.isBinaryExpression(child) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.QuestionQuestionToken].includes(child.operatorToken.kind)) complexity++;
        ts.forEachChild(child, body);
      }
      body(node);
      records.push({ file, symbol, complexity, statements, parameters: node.parameters.length });
    }
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)) && ts.isIdentifier(node.name) && /^[a-z]$/.test(node.name.text)) {
      records.push({ file, symbol: `${path.join('/')}/binding:${node.name.text}`, shortNames: 1 });
    }
    ts.forEachChild(node, child => visit(child, path));
  }
  visit(tree, []);
  records.push({ file, symbol: '<file>', fileStatements });
  const merged = new Map();
  for (const record of records) {
    const key = `${record.file}#${record.symbol}`;
    const existing = merged.get(key);
    if (existing && record.shortNames) existing.shortNames = (existing.shortNames ?? 0) + record.shortNames;
    else merged.set(key, record);
  }
  return [...merged.values()];
}
export function debt(records) {
  return records.flatMap(record => Object.entries(limits).filter(([metric, limit]) => (record[metric] ?? 0) > limit).map(([metric]) => ({ file: record.file, symbol: record.symbol, metric, ceiling: record[metric] })));
}
export function compare(records, baseline) {
  const current = debt(records), diagnostics = [];
  const key = entry => `${entry.file}#${entry.symbol}:${entry.metric}`;
  const ceilings = new Map(baseline.map(entry => [key(entry), entry.ceiling]));
  for (const entry of current) if (entry.ceiling > (ceilings.get(key(entry)) ?? limits[entry.metric])) diagnostics.push(`${key(entry)} = ${entry.ceiling} exceeds ${ceilings.get(key(entry)) ?? limits[entry.metric]}`);
  const active = new Set(current.map(key));
  for (const entry of baseline) if (!active.has(key(entry))) diagnostics.push(`Remove resolved baseline entry ${key(entry)}`);
  return diagnostics;
}
