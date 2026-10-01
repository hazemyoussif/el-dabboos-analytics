# Mandatory architecture invariants

Current rules, grounded in canonical validators, authorization services and lifecycle decisions. [System design](../architecture/system-design.md), [ADRs](../architecture/adr/).

## NEVER

- NEVER Let the browser access an operational database.
- NEVER Generate SQL with an LLM or put SQL in DashboardSpec.
- NEVER Let provider output bypass full canonical/semantic validation.
- NEVER Authorize only before planning and omit post-output authorization.
- NEVER Put enforced policy filters inside editable DashboardSpec or trust a tenant ID without validated membership.
- NEVER Treat planned metrics as executable.
- NEVER Persist Recharts configuration or React Grid Layout runtime objects in the domain.
- NEVER Store folder/favorite state inside DashboardRecord or spec.
- NEVER Automatically Save builder/AI edits.
- NEVER Sum snapshots across time.
- NEVER Silently mix incompatible currencies/units or truncate category data.
- NEVER Use arbitrary CSS or tenant-injected styles.
- NEVER Log secrets, customer rows or prompts by default.

## ALWAYS

- ALWAYS Validate canonical spec/patch schemas and semantic/layout/visualization rules.
- ALWAYS Authorize generated and edited dashboards after validation.
- ALWAYS Enforce tenant membership/scope and policy-filter intersection.
- ALWAYS Preserve source abstraction and existing ports.
- ALWAYS Preserve explicit Save, owner and optimistic-version semantics.
- ALWAYS Use deterministic IDs/layout rules and preserve nulls/failure isolation.
- ALWAYS Add focused regression tests for architecture changes, then full verification.
- ALWAYS Document new invariants in ADRs when necessary and inspect executable code before trusting stale prose.

Request dedup is scoped to one execution and includes effective security context. Bounded concurrency is injectable, not application env parsing. Theme/locale/layout-only presentation changes do not execute analytics or Save. First-series top N is the selection anchor; anchor failure cannot display unrestricted union. Metadata must distinguish business dataThrough from known sourceAsOf.
