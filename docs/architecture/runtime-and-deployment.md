# Runtime and deployment

## Current repository support

Node 24 runs Fastify; React/Vite builds static Web assets; pnpm 12.6.0 is pinned.
API owns environment parsing, HTTP, configuration and composition. Application
and domain do not read environment variables. The default development path uses
synthetic SQLite/mock adapters; production-style local staging uses separate
PostgreSQL control/mart databases, dedicated identities, forced mart RLS, explicit
migrations, local cookie sessions and trusted serving. See
[current milestone](../management/current-milestone.md),
[configuration](../developer/configuration.md) and
[shared staging runbook](../integration/shared-staging.md).

`infra/staging` contains Web/API Dockerfiles, an Nginx API proxy, Compose and safe
runtime/operator examples. Compose joins an existing PostgreSQL Docker network;
it does not own or recreate the PostgreSQL volume. The built API needs its
workspace/package dependencies, rather than only `dist/server.mjs`.

## Initial company staging target

```text
single Linux staging host
├── reverse proxy / HTTPS
├── Web (static Nginx container)
├── API (private container)
└── PostgreSQL (persistent storage; separate control and mart databases)

El-Dabboos Web/API
        ↓
company private network
        ↓
separate company-hosted LLM server
        ↓
OpenAI-compatible API
```

Requested shape: Ubuntu Server 24.04 LTS or supported equivalent; minimum 4 vCPU,
8 GB RAM (16 GB preferred if available), 80 GB+ SSD; Docker Engine and Compose v2;
persistent PostgreSQL storage; HTTPS ingress and outbound/internal network access.
Use the existing Compose setup plus separately managed PostgreSQL and TLS ingress.
Kubernetes is not required for this initial target. Hosted server/access and
company LLM server access/URL are pending; the architecture supports them now.

## Provider and protected configuration

Local development may use Bonsai through an OpenAI-compatible endpoint. Hosted
staging/production uses the separate company LLM server, replaceable through
`LLM_BASE_URL`, `LLM_MODEL_ID`, optional `LLM_API_KEY` and existing timeout/inference
settings. No development LAN address is a hosted configuration default. Secrets
remain outside source/builds; preserve the accepted local profile rather than
changing the planner or tuning a model as part of deployment.

[Provider contract](openai-compatible-provider.md) and
[shared AI semantics](shared-ai-analyst.md) define validated structured planning;
the provider never queries Odoo/PostgreSQL or computes authoritative business values.
No automatic provider fallback is enabled. LLM availability is independent from
storage health; a ready API still needs a separate authenticated planner smoke.

Application builds and environment configuration are separate. Pull the exact
reviewed image/version, load the existing protected server environment, run explicit
migrations, start/update services, health check and smoke-test. A new application
deployment must not overwrite the protected server `.env`. Runtime/API secrets
exclude migrator/admin/source credentials unless the existing separately approved
manual-operation composition explicitly requires scoped source/writer access.
Web public-origin/prefix configuration remains build-time `VITE_API_BASE_URL`;
prefer same-origin routing so API/server secrets stay runtime-only.

## Future GitHub deployment target — not activated

```text
push/merge to main
    ↓
required tests/gates
    ↓
build immutable Web/API images
    ↓
tag images with git SHA
    ↓
push to registry
    ↓
deploy exact SHA/digests to staging
    ↓
run migrations
    ↓
health checks
    ↓
smoke acceptance
```

The existing GitHub workflow runs checks only. Registry publication and deployment
are future work after the first controlled manual deployment and staging acceptance.
A long-term release process must promote reviewed immutable images, rather than
rely solely on `git pull` and `docker compose up`. Record image digests, migration
heads and compatible protected configuration for recovery; backups/restore and
binary/schema compatibility must be approved before rollout.

## Health and logging

`GET /health` and `/health/live` report process responsiveness without source/model
calls. `/health/ready` verifies configured persistence/analytics structure and,
in PostgreSQL mode, exact immutable histories and safe runtime identities; it
returns safe 503 checks on failure. Readiness is not business reconciliation,
serving freshness, employee activation or model suitability. Probe deadlines do
not interrupt synchronous SQLite work.

Validated request IDs and safe route/status/duration logging are implemented;
full tracing remains future work. Control-backed security and analyst audit are
durable and transaction-owned. Default logs exclude credentials/headers, raw
prompts, complete request bodies and customer result rows. Keep optional structured
LLM diagnostics disabled except in approved protected investigation.

[Production readiness](../integration/production-readiness.md) owns remaining
hosting, privacy, identity activation, load, backup and operational approval gates.

The [staging schedules](../integration/staging-schedules.md) use the healthy deployed API image ID, an offline schema/role check, and a shared host maintenance lock. Once timers are installed, `infra/staging/deploy.sh` owns the normal build → lock → stop → migrate → verify → healthy restart sequence. This prevents scheduled ingestion from overlapping schema maintenance; no source configuration is supplied to preflight or the runtime API. These timers cover the existing operational path; newer business/review and immutable Finance snapshot publication remain separate.
