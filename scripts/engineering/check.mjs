import { baselineSourceCommit, baselineProvenanceDiagnostics } from './baseline-policy.mjs';
import { changedArtifactDiagnostics } from './diff.mjs';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { measure, compare, debt } from './metrics.mjs';
import { checkImports, resolver } from './architecture.mjs';
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).trim().split('\n').filter(file => existsSync(file)).filter(file => /^(apps|packages)\/[^/]+\/src\/.*\.tsx?$/.test(file));
const mode = process.argv[2];
let diagnostics;
if (mode === 'architecture') diagnostics = files.flatMap(file => checkImports(file, readFileSync(file, 'utf8'), resolver(process.cwd())));
else if (mode === 'quality') {
  const baseline = JSON.parse(readFileSync('scripts/engineering/quality-baseline.json', 'utf8'));
  const historicalFiles = execFileSync('git', ['ls-tree', '-r', '--name-only', baselineSourceCommit], { encoding: 'utf8' }).split('\n').filter(file => /^(apps|packages)\/[^/]+\/src\/.*\.tsx?$/.test(file));
  const historicalDebt = historicalFiles.flatMap(file => debt(measure(file, execFileSync('git', ['show', `${baselineSourceCommit}:${file}`], { encoding: 'utf8' }))));
  const provenance = baselineProvenanceDiagnostics(baseline, historicalDebt);
  diagnostics = [...provenance, ...compare(files.flatMap(file => measure(file, readFileSync(file, 'utf8'))), baseline.entries)];
} else if (mode === 'diff') {
  execFileSync('git', ['diff', '--check'], { stdio: 'inherit' });
  execFileSync('git', ['diff', '--cached', '--check'], { stdio: 'inherit' });
  const changed = execFileSync('git', ['diff', '--name-only', 'fdce5cb671ccf2fdd5d0c2651802a8dbd4fb1368'], { encoding: 'utf8' }).split('\n');
  diagnostics = changedArtifactDiagnostics(changed);
} else throw Error('Expected architecture, quality or diff');
for (const diagnostic of diagnostics) process.stderr.write(`${diagnostic}\n`);
process.stdout.write(`${mode}: ${diagnostics.length} diagnostics\n`);
process.exitCode = diagnostics.length ? 1 : 0;
