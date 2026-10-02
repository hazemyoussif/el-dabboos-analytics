# ADR-024: Compact model intent and deterministic dashboard generation

Status: Accepted (October 2026)

Context: A configured endpoint accepts minimal structured JSON and references but rejects the full projected canonical DashboardSpec schema. Canonical correctness and model communication have different constraints. Removing domain validation or adding vendor-specific schema workarounds would weaken the boundary.

Decision: Application owns a transient, shallow DashboardGenerationPlan: bilingual titles, bounded widgets/series, optional date preset/range/business filters and flattened bounded analysis/visualization intent. Provider generation requests use its portable projection under `dashboard_generation_plan`, with authorized metric choices. AJV plus deterministic date/title/top-N pairing checks validate the plan. A pure compiler creates stable IDs, canonical analysis/presentation, tenant-timezone periods and domain default 12-column layout. Full unchanged canonical spec validation and post-planner authorization run before execution. Plans are never persisted. No SQL, React, arbitrary expression language, policy filters or chart-library properties are allowed.

Editing retains projected canonical DashboardPatch v2, patch/application/resulting-spec validation and authorization. Repair limits remain 0–2, and transport errors bypass repair. Optional diagnostics belong to the API root; application code never reads environment variables.

Consequences: Provider contract complexity can remain bounded independently of persistence/domain schemas. Fake HTTP and deterministic compiler tests run without an endpoint or key. Live generation quality/compatibility remains a separate manual endpoint gate. A future edit-plan compiler requires separate evidence and approval. The web presents real operation state and elapsed time, with no invented internal stages; failures leave the draft unchanged.
