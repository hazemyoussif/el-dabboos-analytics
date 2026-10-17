# El Dabboos Analytics agent entry

Governed bilingual analytics prototype: canonical semantic metrics, portable DashboardSpec/Patch v2, deterministic adapters, manual/AI drafts and explicit saved-record lifecycle. IQ/EG facts and identities are synthetic; production integration is future work.

## Layers

apps/web owns React/UI; apps/api owns Fastify/HTTP/config/composition; packages/application owns use cases; packages/domain owns contracts/validation/ports; packages/data owns adapters and deterministic facts/engine. Application and adapters depend on domain, never the reverse.

## Mandatory invariants

AI generation must validate the compact application-owned DashboardGenerationPlan and compile it deterministically before canonical validation; plans contain business intent plus only explicit requestedPresentation/analysis, with unspecified defaults owned by the resolver; never persist plans or ask the model for IDs/layout/security infrastructure. AI edit validates transient sparse DashboardEditPlan and deterministically compiles canonical DashboardPatch v2; omitted fields preserve current values. Full canonical + semantic validation and post-planner authorization are required. Validate membership, enforce tenant/policy filters, keep secrets/data out of default logs. No LLM SQL, browser DB access, auto-save, policy/theme/folder/chart-library objects in spec, planned metric execution, snapshot summing across dates or silent mixed currency. Preserve explicit Save/version checks and null/partial behavior. See [full invariants](docs/agents/architecture-invariants.md).

## Change routing and required reading

- Metric/dimension → domain first; source integration → repository adapter; see [change map](docs/agents/change-map.md).
- Chart styling/theme → web rendering/presentation; model endpoint → LLMProvider adapter, not routes/domain fields.
- Consult [system design](docs/architecture/system-design.md), [handbook](docs/developer/handbook.md) and relevant [debugging path](docs/agents/debugging-playbook.md) before proposing changes.
- Source work must consult [production readiness](docs/integration/production-readiness.md) and [real-data contract](docs/integration/real-data-contract.md).
- Use [verification matrix](docs/agents/verification-matrix.md) and [handoff template](docs/agents/handoff-template.md). Update owning docs when behavior intentionally changes; do not redesign unrelated contracts.

## UI / UX quality gate

When a task changes, reviews, or polishes apps/web presentation, dashboards, charts, tables, navigation, responsive behavior, themes, or accessibility, read the project-specific [dashboard quality skill](.agents/skills/el-dabboos-dashboard-quality/SKILL.md).

Use the skill in **AFTER** mode by default.

For implementation tasks where the user explicitly asks to apply the quality gate as part of delivery, use it both as a pre-flight constraint and as the final AFTER review, without introducing unrelated redesign.

Do not load this skill for backend, domain, data, integration, infrastructure, or non-UI documentation work unless that task also changes the web presentation. Project architecture, domain invariants, and ADRs override generic aesthetic guidance.

## Prepared serving constraint

The user requires background preparation and serving of prepared data across all report families. Expensive aggregation, snapshot-history reconstruction and correction processing belong in preparation, never a dashboard request. Runtime selection must retain tenant/policy filters, exact cutoff/currency semantics and immutable publication. Reuse existing prepared datasets; build missing serving grains through one governed mechanism. Prove coverage and correctness across all exposed reports before cutover. Never introduce a raw-history fallback, report-specific optimization or alternative architecture without asking the user. See [ADR 040](docs/architecture/adr/040-prepared-analytics-serving.md).

## Engineering quality gate

Green tests are necessary but not sufficient. Follow [engineering standards](docs/developer/engineering-standards.md): review naming, responsibility, abstraction quality, dependency direction, transaction clarity, security readability, error ownership and test maintainability. Run architecture, baseline-aware quality and diff gates. New code has no debt allowance; historical debt may not grow. Do not game metrics or baseline access-control blockers.

## Verification before push

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run check:architecture
pnpm run check:quality
pnpm run typecheck
pnpm test
pnpm run test:postgres
pnpm run build
pnpm run check:diff
```

Run targeted tests first. Tests must not load developer env files or require real customer/model services. Report manual evidence separately from automated coverage. Never commit .env/.env.local, credentials or customer extracts. Do not merge unless explicitly requested.
