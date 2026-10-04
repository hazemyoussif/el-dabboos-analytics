import ts from 'typescript';
import path from 'node:path';
import { existsSync } from 'node:fs';
const layer = file => file.replaceAll('\\', '/').match(/(?:^|\/)(packages\/(?:domain|application|data)|apps\/(?:api|web))\//)?.[1];
const permitted = {
  'packages/domain': ['packages/domain'],
  'packages/application': ['packages/application', 'packages/domain'],
  'packages/data': ['packages/data', 'packages/domain'],
  'apps/api': ['apps/api', 'packages/domain', 'packages/application', 'packages/data'],
  'apps/web': ['apps/web', 'packages/domain', 'packages/application'],
};
export function checkImports(file, source, resolve) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true), diagnostics = [];
  const owner = layer(file);
  function check(specifier) {
    const target = resolve(specifier, file), destination = target && layer(target);
    if (destination && owner && !permitted[owner].includes(destination)) diagnostics.push(`${file}: forbidden dependency ${specifier} -> ${destination}`);
    if (owner === 'apps/web' && /^(?:node:|pg$|better-sqlite3$|sqlite3$)/.test(specifier)) diagnostics.push(`${file}: browser database/runtime dependency ${specifier}`);
    if (owner && ['packages/domain', 'packages/application'].includes(owner) && /^(?:react|fastify|pg$|node:|recharts)/.test(specifier)) diagnostics.push(`${file}: infrastructure dependency ${specifier}`);
    if (!target && (specifier.startsWith('.') || specifier.startsWith('@el-dabboos/'))) diagnostics.push(`${file}: unresolved local dependency ${specifier}`);
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) check(node.moduleSpecifier.text);
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) check(node.argument.literal.text);
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText() === 'require')) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteralLike(argument)) check(argument.text);
      else diagnostics.push(`${file}: nonliteral module loading is not allowed`);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return diagnostics;
}
export function resolver(root) {
  return (specifier, file) => {
    if (specifier.startsWith('.') && /\.(?:css|svg|png)$/.test(specifier) && existsSync(path.resolve(root, path.dirname(file), specifier))) return path.join(path.dirname(file), specifier);
    const result = ts.resolveModuleName(specifier, path.resolve(root, file), { moduleResolution: ts.ModuleResolutionKind.Bundler, allowImportingTsExtensions: true }, ts.sys).resolvedModule;
    return result && path.relative(root, result.resolvedFileName);
  };
}
