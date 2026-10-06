# September Iraq certified publication handoff

Date: 6 October 2026. Branch: `codex/production-pilot-lifecycle`; base `73b932c2a648b230351706bdc3ec25ac78bc259a`. The final local commit contains this handoff; use `git log -1` for its exact SHA. No push or merge; remote CI has not run for that SHA.

## Completed business certification

`FIN-OIA-STAGING-2026-09-V1` is complete and immutable. Explicit authorized business/product approval was confirmed in this conversation with “Approve certification and publication.” Its reference is `authorized-user-confirmation:call_237cIOm7qjj30zkHsyXvBvH5`, approved at `2026-10-06T06:12:49.342Z`; PostgreSQL recorded the event at `2026-10-06T06:12:49.356Z` as `mart_migrator_login`. The event links all 308 exact passing reconciliation cases, company 1, tenant el-dabboos-iq, mapping version 1, September 2026, IQD, exact values and approved business semantics. This timestamp records this execution, not an invented earlier Finance Manager action.

Executive revenue means net invoiced revenue; sales orders remain separate; refunds use their own issue date; Business Line is official; salesperson uses governed res_users.id, not create_uid. Authorized approval over exact reconciliation is now a valid certification path alongside external-report evidence. Optional UI metadata is never fabricated. Technical discrepancies remain publication blockers. See [ADR 031](../architecture/adr/031-certified-release-promotion.md) and [operator workflow](certified-release-publication.md).

Existing mapping v1 is approved in both marts. Its original specification fingerprint remains `d5b9efe036d50c6cc4a39c22037b9592`. No replacement candidate or reconciliation rewrite occurred.

## Exact promotion and explicit binding

Source remains `el_dabboos_analytics`; local staging runtime remains `el_dabboos_analytics_staging`. The transactional promotion receipt is `PHASE1-IQ-STAGING-202609-PROMOTION-20261006`, recorded at `2026-10-06T06:18:53.626Z` as `staging_mart_migrator_login`. Its SHA-256 fingerprint is `1bb54cf08bf29bc0e17a53f11bb91a75694d784923e375568c5a7a9145cc20ee`. Repeating promotion returned alreadyPromoted with the same fingerprint. Promotion did not bind serving; the separately authorized bind then created the existing composite binding identity `el-dabboos-iq/el-dabboos-staging-comparison-202609-v1`. The pilot remains unbound.

Before/after source fingerprints and final target fingerprints agree:

| Immutable history | Rows | MD5 of sorted PostgreSQL JSON row hashes |
| --- | ---: | --- |
| Extraction runs | 4 | 838d75c21022dd4b9855d7e643aba54a |
| Ingestion batches | 24 | fd6d94d1d390fd369327fa4d2edb73bf |
| Fact revisions | 24,335 | 0c61242b30737a46b43e8efa923b5e76 |
| Fact heads | 24,335 | 1ee9c33ad200d8b5ddd138468956b393 |
| Batch links | 41,120 | f11531024addb1747f54f2fe667c9f4d |
| Reconciliation evidence | 308 | 0df7ee1485f135c234f725ef6766018d |
| Reconciliation batch links | 4,312 | c418bf2f88ec4bb83275adfc237766ab |

Snapshot owners are empty. Incomplete same-release lineage is retained and remains invisible to runtime. Unrelated tenant data was not promoted. The target transaction refuses drift and rolls back on failure; synthetic injected-failure tests prove empty target publication state after rollback.

## Authenticated application evidence

The existing HTTPS staging browser session at https://localhost:8443 resolved `/api/auth/me` with HTTP 200, remained in El-Dabboos Iraq, and loaded the analytics workspace. No authentication configuration, credentials, account, invitation or MFA was changed. The existing display name is “Pending tenant administrator”; it does not indicate a newly created account.

Read-only staging runtime verification reports ready=true. An unrelated tenant reports ready=false and zero accessible facts. A manually composed **unsaved** draft selected Previous month, visibly resolving to September 1–30, 2026. It renders source postgres, data through September 30, source updated October 5. The “Approved analytics data is not ready for this workspace.” message is absent.

| Application metric | Certified value (IQD) |
| --- | ---: |
| Net invoiced revenue | 1,447,166,500 |
| Invoiced revenue (Posted Invoice Value) | 1,465,712,000 |
| Refund value | 18,545,500 |

Browser screenshot is stored in the local Codex visualization artifacts, outside Git. No dashboard was automatically saved. API startup discovery now explicitly marks uncertified dimensions or an over-bound complete option set unavailable; query certification, query bounds and unsupported enforced policy dimensions still fail closed. The customer option set exceeds the existing discovery bound and is not truncated. The existing legacy template requests unsupported metrics and therefore shows their certification errors. The existing navigation text still says “Synthetic demo data”; the actual widget source and values above prove PostgreSQL serving. These pre-existing presentation issues were not redesigned.

## Verification and limits

Frozen install, lint, architecture, baseline-aware quality, typecheck, 602 standard tests, 106 PostgreSQL tests (zero skips), API/web build and diff gates all pass. Targeted certification, lifecycle, publication rollback/idempotency, immutability/audit, explicit binding, tenant isolation and metadata availability checks pass. Full PostgreSQL tests use a disposable foundation_test database; they do not load developer env files or contact customer/model services. The web build retains its existing chunk-size warning. Remote CI is unverified because no push was requested.

Migration 009 adds immutable audited certifications and receipts; historical migrations are untouched. Runtime remains read-only, tenant RLS and completed-release restrictive policies remain enforced, and the staging NOINHERIT runtime login receives all applicable existing restrictive policies. Operator privileges remain separate from runtime/ingestor. The bounded promotion supports at most 100,000 rows per table and 128 MiB total; no continuous sync or general-purpose transfer framework is implemented.

Preserved unrelated working changes include the earlier Odoo adapter/fixture/config edits, their owning document details, `.env.example`, and `.archify`. They are excluded from the publication commit. No credentials, protected env files, raw extracts or case manifests are committed.

Source data mutated = no. September pilot fingerprints changed = no. Authentication changed = no. Sync implemented = no. External deployment = no. Push = no. Merge = no.

The requested Phase 1 certification/publication is complete. Any future sync, production release or presentation cleanup requires its own scope and authorization.
