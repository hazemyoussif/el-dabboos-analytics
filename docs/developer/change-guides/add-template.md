# Add a template

Current extension checklist; inspect implementation and [system design](../../architecture/system-design.md) before changing contracts.

1. Use market-neutral ID and canonical v2 widget/series intent; locale labels may differ.
2. Define bounded date preset, category/tags and supported available metrics in application/templates.ts.
3. Validate chart/unit/dimension/layout compatibility and first-series top-N rule.
4. Ensure capability and metric policy filters restrict preview/instantiation.
5. Run application template/eval and API IQ/EG template matrix tests; verify Use template remains an unsaved draft.

**File path starting points:** application/templates.ts; API routes/templates.ts; web library/TemplateBrowser.tsx. Paths under packages/ or apps/ as named. Use [repository map](../../architecture/repository-map.md).

Run owning-layer targeted tests while developing, then [full verification](../testing-guide.md) and applicable [manual smoke](../../qa/smoke-tests.md). Document intentional new invariants in an ADR; no unrelated redesign.
