# Agent debugging playbook

1. Reproduce with synthetic data and capture safe status/contract evidence. Inspect actual implementation and nearest tests; never trust stale documentation over executable code.
2. Follow the shortest deterministic trace below. Do not redesign established ports unless the bug requires it; fix the smallest correct layer.
3. Run targeted regression, then [full verification](verification-matrix.md). Update owning docs when behavior intentionally changes. Use [handoff](handoff-template.md) to report evidence and limits.

| Symptom | Trace / first test area |
| --- | --- |
| Wrong total or snapshot | series → query → requiredMeasures → adapter facts → engine semantics; data engine/repository tests |
| Missing builder metric | registry availability → metricDomains → authorized catalog; API authorization and builder tests |
| Wrong branch/tenant | identity membership → analyticsContext.enforcedFilters → adapter intersection; data/security + API tests |
| Partial or anchor failure | seriesResults → first top-N selection → alignment; application/query-execution tests |
| AI invalid output | unknown JSON → provider projection → original canonical schema → semantic rules → auth; structured planner/projection tests |
| AI edit rejected | patch validator → atomic apply → full completed spec → auth; patch/planner/API tests |
| Save/conflict | working state → permissions/owner → expectedVersion → metadata repo; saved-dashboard/lifecycle tests |
| Folder/favorite mismatch | personal tenant/user preference → accessible record → library view; library tests |
| Theme/chart issue | central tokens/theme → presentation composition → focused renderer; SSR/browser checks |
| Unexpected queries on layout | builder semantic-vs-layout detection → preview effect; web layout/product-flow tests |
| Startup/readiness | pure config map → root adapter wiring → safe table probes; config/health tests |

[Human debugging guide](../developer/debugging-guide.md) owns detailed instructions. Never dump developer environment, prompts or customer result rows to debug. Controlled diagnostics are bounded development evidence, not a browser response contract.
