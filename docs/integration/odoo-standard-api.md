# Odoo 18 standard API imports

The owner accepted observed API ingestion, all report families and a private company-server input copy on 25 October 2026. [ADR 044](../architecture/adr/044-observed-odoo-api-imports.md) records the consistency boundary. No Odoo module is needed.

## Protected configuration

Use protected operator/source environments. Never put keys in arguments, Git, manifests, browser settings or logs. Required API fields: `ODOO_ORM_URL` (HTTPS origin), `ODOO_ORM_DATABASE`, `ODOO_ORM_LOGIN`, `ODOO_ORM_API_KEY`, `ODOO_ORM_COMPANY_IDS=1`, `ODOO_ORM_TENANT_ID`, `ODOO_ORM_SOURCE_ID`. Existing control registration must remain enabled with the exact company scope.

The separate database is exactly `el_dabboos_api_stage`, on the approved Analytics database endpoint. Provision distinct nonsuperuser, non-BYPASSRLS writer/reader logins named `odoo_api_stage_writer` and `odoo_api_stage_reader`; neither may create roles/databases. The writer owns this private database; the reader receives CONNECT and SELECT only. Revoke PUBLIC database access. Store URLs in `ODOO_API_STAGE_WRITER_URL` and `ODOO_API_STAGE_READER_URL`. These must never point at Odoo, control or mart databases.

Initialize explicitly, then capture on the company server:

```bash
pnpm odoo:orm stage:init --tenant el-dabboos-iq
pnpm odoo:orm import --tenant el-dabboos-iq
```

The worker streams a closed 28-model manifest, preserving source numeric tokens and existing many-to-many SQL bridges. Three bounded workers read at most 5,000,000 rows per model with 1,000-row pages, a 2 GiB JSON bound per model and a 30-minute capture deadline. The import reads each model once, then indexes the private copy and makes it available to the existing reconciliation and preparation job. Only model identifiers, phases and counts are logged. The `import` command captures API inputs and runs the existing incremental sync. `refresh` is a compatibility name for that ordinary sync against already captured input. Neither command reloads report periods. Source captions use the API en_US context; translated fields retain an en_US JSON shape, so other source-language translations are not attested. A failed/unsealed schema is never selected; inspect and remove failed private copies explicitly before retrying. Normal access control, tenant isolation and financial reconciliation remain required.

Select `ANALYTICS_SOURCE_MODE=odoo-orm-observed` only after a copy seals. Optional `ODOO_API_STAGE_SCHEMA=api_<32 hex digits>` pins that exact sealed copy; otherwise composition resolves the newest sealed tenant/source match. The endpoint/database identity must match the configured API. A retained read-only transaction over the copy is explicitly distinguished from an ERP snapshot. The API copy does not inherit the ERP transaction expiry: it remains usable until the owning import closes it or its connection is lost. Background reads use the existing two-minute source-query bound; the adapter-specific fifteen-second limit was removed. The existing systemd worker budget is two hours so API imports can complete. Direct PostgreSQL ERP credentials are not used.

## Ordinary sync and explicit period updates

The adapter changes the source transport. It does not add a full-report rebuild workflow. `refresh` delegates to ordinary incremental sync using the latest captured input:

```bash
pnpm odoo:orm refresh --tenant el-dabboos-iq
```

The initial company cutover's current/previous Business replacements are one-off operator work. Do not repeat completed periods to resume a later step. Existing review readers require completed months; Finance retains its independent dated source controls. These operations are not dependencies of ordinary sync.

For an individual current-month Business preparation:

```bash
pnpm analytics expose-business --tenant el-dabboos-iq --month 2026-10 --sales-command
```

Use the actual company-local capture month; this example is not a rolling default. Validate both saved reports through prepared serving and preserve comparison-period coverage. Then run existing core synchronization, historical Business/review exposure and Finance reconstruction against the same pinned copy. Historical stock/current-debt values must remain unsupported unless their existing mappings provide a valid dated observation. Reconciliation and prepared publication must complete before any report is described as refreshed.

```bash
pnpm odoo:orm sync --tenant el-dabboos-iq
```

Ordinary sync, daily reconciliation, absence sweeps and Command workers retain their existing lifecycles against the owned input. The existing sync and Command timers reuse the latest captured input and apply their ordinary incremental updates. In observed mode the daily job captures API inputs, then runs its existing reconciliation and sweep; it does not invoke the full-family `import`/`refresh` command. Full-period report rebuilds are explicit operator work, never an automatic consequence of a new API copy. Other report families retain their accepted data and original dates until their existing update operations complete. API freshness advances when capture runs; a five-minute mart sync does not imply a five-minute API capture. Failed API capture, mismatched controls or failed preparation leave the trusted publication unchanged.

Copy revisions begin `orm-observed-copy-v1:`. `sourceAsOf` is the receipt time. Prepared-result metadata exposes `sourceConsistency=api_observed`; dashboard notes, answer evidence and Excel disclose possible changes between requests. Existing business-date, snapshot cutoff, currency, policy and explicit publication semantics remain intact. Wire precision is preserved without attesting unknown ERP storage precision.

The owner explicitly removed the second full API scan, repeated acceptance flag and duplicate model-readability probe. Odoo itself enforces read permissions. Migration 095 makes the existing event preparer read only selected monthly members before canonical lineage expansion; formulas, tenant RLS and reconciliation remain unchanged. Migration 096 applies the same selected-root approach to complete snapshots and adds a partial index for summary controls. Activated background publication allows up to ten minutes per preparation statement so complete-history identity proofs can finish at company scale. It restores the caller deadline before promotion; interactive and source query deadlines remain unchanged. Financial and identity checks still run in full.

## Recovery and storage

Restore the protected source environment and reviewed prior images to roll back transport selection. Keep the serving pointer on the previous accepted publication until new preparation succeeds. Never interpret API receipt revisions as ERP PostgreSQL watermarks. Record-rule visibility and changes outside API-observable fields remain limitations.

Company PostgreSQL now also requires `/opt/el-dabboos/storage/compose.tablespace.yml` alongside `infra/postgres/compose.mart.yml`. It mounts the existing secondary disk at `/var/lib/postgresql-tablespaces`. Preserve both the original `dabboos_analytics_data` volume and this mount on every PostgreSQL recreation. The tracked [override template](../../infra/postgres/compose.tablespace.yml) uses `MART_TABLESPACE_ROOT`. Do not start the server without its tablespace disk.

On 25 October, the owner explicitly approved deletion of six named obsolete backup folders. They were removed; those recovery points no longer exist. The live `mart.review_facts` table moved transactionally to `analytics_sdb`, with its rows and trusted publication preserved. The private API database uses `api_input_sdb`. Root free space became 23,260,233,728 bytes and secondary free space 18,374,025,216 bytes at the post-move check. These are point-in-time measurements, not a continuing capacity guarantee.

## Evidence

Earlier authorized September read-only checks: 3,092 order headers, 3,119 invoice/refund headers, 24,871 canonical facts, 11,390 exact summary/dimensional cases, zero mismatches and stable repeated reads. This manual evidence is separate from synthetic tests and did not publish reports.

Company-only capacity sampling estimated 2,427,941,775 JSON bytes across required inputs, including 1,325,414 accounting lines. Only counts and size estimates returned to the workstation. This prompted the approved storage work above. Private input capture, application deployment and report publication must be recorded separately after they actually complete; provisioning is not publication.
