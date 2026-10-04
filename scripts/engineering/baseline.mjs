import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { measure, debt } from './metrics.mjs';
import { baselineSourceCommit as sourceCommit } from './baseline-policy.mjs';
const files = execFileSync('git', ['ls-tree', '-r', '--name-only', sourceCommit], { encoding: 'utf8' }).split('\n').filter(file => /^(apps|packages)\/[^/]+\/src\/.*\.tsx?$/.test(file));
const entries = files.flatMap(file => debt(measure(file, execFileSync('git', ['show', `${sourceCommit}:${file}`], { encoding: 'utf8' }))));
writeFileSync('scripts/engineering/quality-baseline.json', JSON.stringify({ sourceCommit, entries }, null, 2) + '\n');
