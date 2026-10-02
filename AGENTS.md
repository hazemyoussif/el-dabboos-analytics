# El-Dabbous Analytics agent entry

Governed bilingual analytics prototype: canonical semantic metrics, portable DashboardSpec/Patch v2, deterministic adapters, manual/AI drafts and explicit saved-record lifecycle. IQ/EG facts and identities are synthetic; production integration is future work.

## Layers

apps/web owns React/UI; apps/api owns Fastify/HTTP/config/composition; packages/application owns use cases; packages/domain owns contracts/validation/ports; packages/data owns adapters and deterministic facts/engine. Application and adapters depend on domain, never the reverse.

## Mandatory invariants

Full canonical + semantic validation and post-planner authorization are required. Validate membership, enforce tenant/policy filters, keep secrets/data out of default logs. No LLM SQL, browser DB access, auto-save, policy/theme/folder/chart-library objects in spec, planned metric execution, snapshot summing across dates or silent mixed currency. Preserve explicit Save/version checks and null/partial behavior. See [full invariants](docs/agents/architecture-invariants.md).

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

## Verification before push

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
```

Run targeted tests first. Tests must not load developer env files or require real customer/model services. Report manual evidence separately from automated coverage. Never commit .env/.env.local, credentials or customer extracts. Do not merge unless explicitly requested.
