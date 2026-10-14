/** Source-only residue normalization; exact mart reconciliation has no tolerance. */
export const reviewAllocationPrecision={decimalPlaces:6,maxResidue:'0.000000001',currencyQuantumDivisor:'1000000'} as const;
export const reviewAllocationAmountBasis=`Exact native cash; positive allocations round to ${reviewAllocationPrecision.decimalPlaces} decimals only for residue <= min(${reviewAllocationPrecision.maxResidue} currency units, currency rounding/${reviewAllocationPrecision.currencyQuantumDivisor}); larger residues rejected. Ratios use matching totals.`;
