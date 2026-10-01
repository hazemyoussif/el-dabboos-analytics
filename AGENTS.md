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

## Verification before push

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
```

Run targeted tests first. Tests must not load developer env files or require real customer/model services. Report manual evidence separately from automated coverage. Never commit .env/.env.local, credentials or customer extracts. Do not merge unless explicitly requested.
