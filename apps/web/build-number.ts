import { execFileSync } from 'node:child_process';
/** A release can supply its CI/build number; local builds use the Git revision count. */
export function resolveBuildNumber(explicit?: string): string {
  if (explicit !== undefined) {
    if (!/^\d{1,20}$/.test(explicit) && explicit !== 'development') throw new Error('Invalid VITE_BUILD_NUMBER');
    return explicit;
  }
  try { return execFileSync('git', ['rev-list', '--count', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return 'development'; }
}
