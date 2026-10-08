# Final operational acceptance attempt — 2026-10-08

**Gate: incomplete.** Continued the existing milestone and authenticated application
session; no new milestone, scheduler, external deployment, push or merge. Existing
shared governed filters and trusted-serving behavior remain active.

## Identity and provisioning

No provisioned Machine ID/tbot reference, tbot/tsh binary, service or cluster/proxy
reference was found in the checked local staging configuration/system paths.
The existing SSH configuration selects root and does not use a Teleport proxy.
It cannot establish that a restricted, renewable service identity exists.

The requested non-secret administrator handoff is prepared at
[local-staging-machine-id-request.md](../integration/local-staging-machine-id-request.md).
It asks for bot name, staging-only target/resource labels, approved restricted SSH
login, cluster/proxy reference, protected configuration/output references and
renewal/startup method. It also requests verified SELECT-only PostgreSQL credentials.
No administrator message was sent and no Teleport permissions were granted locally.

The source credential passed read-only transaction checks but **failed the strict
least-privilege grant check**. This is distinct from actual writes: no source writes
were attempted. The protected runtime now disables the earlier broader staging
credential exception and uses the strict policy. Source-dependent controls are
unavailable until a compliant identity is supplied. No source grants were changed.

The private socket bridge's automatic recovery and API restart recovery were proved
in the earlier follow-up. Those checks used the existing authenticated SSH tunnel;
they are **not** Machine ID start/renewal/recovery acceptance. That bridge is now
stopped with automatic startup disabled; the unused managed SSH candidate remains
disabled. The original user's SSH session was not killed or modified. Permanent
personal-session fallback is not installed as the final solution.

## Pre-sync state

- Trusted serving revision: `7c752b1f-f1f4-46e8-b5eb-65ad79d8dc54`.
- Cursor/source cutoff: `2026-10-08T00:21:08.728Z`.
- Affected run: `ad57050e-3b34-4212-a9cb-4b59759bbc25`, 202 cases, 12 mismatches.
- Daily run: `531dba3a-e4bf-4ed4-9554-277a4c332230`, 248 cases, 3 mismatches.
- Source/relay displayed Available; last successful connection/check displayed
  Oct 8, 2026, 12:12 PM in the application timezone. Freshness was stale.
- Before this attempt: 13 completed runs, 11 technical failures, 138364 historical
  reconciliation evidence records.

## Authorized Sync Now and audit

The existing signed-in local staging admin clicked the actual application Sync Now
button. Requests traversed authentication, fresh membership/permission checks,
access audit and the existing deterministic operation composition. No CLI/container
operation was substituted. Actor: `staging-tenant-admin`; tenant: `el-dabboos-iq`.

| Attempt | Durable failure/run reference | Started UTC | Failed UTC | Duration |
| --- | --- | --- | --- | --- |
| Current implementation | `65ad677c-18c6-40a2-af5a-334c0419c259` | 09:12:52.941 | 09:14:59.426 | 126.485 s |
| Direct timestamp projection | `6e0ac97e-0986-4349-bff5-f396aa94b3a4` | 09:21:52.066 | 09:23:56.459 | 124.393 s |

Both returned governed technical failure and preserved trusted data. The first
captured HTTP audit/correlation reference was
`b14c3cb2-82c9-482d-8fef-a5909c34ec00`, POST `/api/analytics/operations`, 503,
126513 ms. Both failures have durable tenant/actor/kind/trigger/time/run records.
The second HTTP correlation reference was not captured before container recreation;
it is not invented here. Transient HTTP authorization audit is distinct from these
durable lifecycle records. No passwords, tokens, connection strings or credentials
were included in the evidence.

Failed candidates rolled back: completed runs stayed 13; technical failures became
13; historical reconciliation evidence stayed 138364. Trusted revision and cursor
are unchanged. No candidate was promoted and no cursor was manually advanced.

## Source divergence and lease investigation

A separate read-only source diagnostic used the same bounded reader and snapshot;
it invoked no ingestion/store/lifecycle operation and performed no mart writes.
It is diagnostic evidence, not operational acceptance.

It discovered 1859 changed order rows and 1923 changed invoice/header rows, producing
5577 and 9590 mapped facts respectively, before reading four historical summary
cutoffs. Source reads alone exhausted the retained lease:
`SOURCE_SNAPSHOT_LEASE_EXPIRED` equivalent category at 122081 ms. The first eight
source pages consumed approximately 93 seconds. Batch 500, statement timeout
15000 ms and snapshot maximum 120000 ms were not increased.

This establishes real source divergence awaiting synchronization. It does **not**
prove that all 12/3 mismatches are explained by those changes: no complete candidate
reconciliation has succeeded, so the mismatches remain unclassified after sync.
No mapper/impact/aggregate/reconciliation defect is asserted without that evidence.

The reader previously serialized entire related records repeatedly to extract
modification timestamps, then entire customer records for optional location fields.
The narrow query repair uses governed `write_date` columns directly and a closed,
metadata-checked optional-field projection cached per source pool. It preserves
composite revision/keyset semantics, company scope, frozen cutoff, null/fallback
location fields, labels and IDs. Unrelated large/binary fields are not serialized.

The direct-timestamp change alone did not complete the live candidate. The final
optional-field repair is deployed locally and has synthetic regression evidence;
**live completion/performance remains unverified** because strict source identity
acceptance now blocks further operations. No safety limit or source schema changed.

Candidate source cutoff, new/updated split, canonical revision count, affected
business dates/dimensions, refreshed daily/monthly partitions and promotion result
are unavailable for the technical failures because the candidate transaction rolled
back before a completed run-detail record. Mapped diagnostic facts are not reported
as committed canonical revisions. The persisted revision/cursor remain the pre-sync
values above.

## Reconcile, promotion and idempotency

Successful promotion, post-promotion daily Reconcile Now and bounded no-change Sync
are **pending**. The earlier authenticated affected/daily runs remain the 12/3 evidence;
they are not relabeled as successful or new runs. Controls now enforce governed source
unavailability. Repeated retries against an unverified identity were not performed.

## Reporting continuity and UI

While Sync ran, the six-widget Executive report retained previous trusted results.
English and Arabic/RTL progress and technical failure text were visible. After
strict source rejection and relay shutdown, source-dependent controls were disabled,
Refresh View remained enabled and completed with “View refreshed”, and authenticated
POST `/api/dashboards/execute` returned HTTP 200 (1305 ms and 375 ms). API readiness
remained HTTP 200; status/report-template reads also returned HTTP 200.

The seven-widget Invoice & Refund report rendered during source outage; its visible
text and option names contained no technical source IDs. Executive salesperson and
Business Line governed names remained available, including Arabic Business Line
labels. Earlier shared search/selected-ID hydration and Customer Historical evidence
in the existing QA record still applies; the full tests preserve those regressions.
Non-admin denial is covered by automated authorization tests; no second live
non-admin session was available and no membership/account was modified for testing.

Screenshots are local review artifacts, not customer extracts committed to Git:
`final-sync-running-en.png`, `final-sync-ar.png`, `final-source-outage-refresh-en.png`,
`final-operational-status-ar.png`, in the existing visualization output directory.

## Tests

Final stable code: frozen install, lint, architecture, quality, typecheck, API/web
build and diff passed; architecture/quality/diff report zero diagnostics. All
**731 unit tests and 172 disposable PostgreSQL tests passed, zero skips**. The
focused source suite passed 10 tests. The added regression verifies lookup-only
updates outside the business-date range, tied composite-key pagination, optional
location fallback/missing columns and an unrelated large binary customer payload.
Tests do not load developer environment files or customer/model services. The
existing Vite bundle-size warning remains. No broad visual-polish pass was performed.

## Remaining acceptance requirements

1. Teleport administrator supplies a renewable staging-only Machine ID and approved
   restricted SSH login/configuration/output references; verify startup, renewal and
   recovery without a personal session.
2. Source administrator supplies an existing/provisioned SELECT-only database identity
   that passes the strict check. The agent does not grant itself source permissions.
3. Rerun the authorized API lifecycle with the final narrow projection; complete
   candidate reconciliation within existing bounds, resolve any remaining mismatches
   deterministically, promote only exact evidence, then perform daily reconciliation
   and one bounded no-change Sync. The final repair has not yet proved live completion.

## Safety confirmation

- Direct container execution used as operational acceptance: **no** (read-only diagnostics only).
- Authentication/authorization/audit bypassed: **no**.
- Working unattended runtime without personal identity: **not yet proven**; personal fallback disabled.
- Teleport credentials printed/committed: **no**; static private key introduced: **no**.
- Odoo/source writes or source schema changes: **no**.
- Failed reconciliation promoted or cursor manually advanced: **no**.
- Trusted reports depend on Odoo availability: **no**.
- Normal report reads/Refresh View contact Odoo: **no**.
- RLS bypass, Finance/snapshot semantic change, LLM runtime dependency: **no**.
- Scheduler, external deployment, push or merge: **no**.
