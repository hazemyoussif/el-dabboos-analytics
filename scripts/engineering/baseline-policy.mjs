export const baselineSourceCommit = 'fdce5cb671ccf2fdd5d0c2651802a8dbd4fb1368';
export function baselineProvenanceDiagnostics(baseline, historicalDebt) {
  const key = entry => `${entry.file}#${entry.symbol}:${entry.metric}`;
  const historical = new Map(historicalDebt.map(entry => [key(entry), entry.ceiling]));
  const diagnostics = [], seen = new Set();
  if (baseline.sourceCommit !== baselineSourceCommit) diagnostics.push('Unexpected baseline source commit');
  for (const entry of baseline.entries) {
    if (seen.has(key(entry))) diagnostics.push(`Duplicate baseline entry ${key(entry)}`);
    seen.add(key(entry));
    if (!historical.has(key(entry)) || entry.ceiling > historical.get(key(entry))) diagnostics.push(`Baseline exceeds historical source: ${key(entry)}`);
  }
  return diagnostics;
}
