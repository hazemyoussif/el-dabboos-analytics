# Operational UX and shared governed filter handoff — 2026-10-08

Latest acceptance attempt: [final-operational-acceptance-2026-10-08.md](final-operational-acceptance-2026-10-08.md). That record supersedes the historical runtime-state sections below: admin sign-in was restored, two real API Sync attempts failed safely, strict source identity policy is now enforced, and the personal-session bridge is stopped pending Machine ID/SELECT-only provisioning. Final stable coverage is 731 unit and 172 PostgreSQL tests, zero skips.

Working branch: `codex/production-pilot-lifecycle`. Base/final committed HEAD:
`2800df19401578bba8e6679739c7c483c5c5851d`. All changes remain uncommitted.
No push, merge or external deployment. Pre-existing `.archify/` artifacts were preserved.

## Delivered behavior

Reports have compact expandable trust/freshness indicators. Freshness, reconciliation
and certification remain distinct. Data & Certification Status exposes synchronization,
reconciliation, serving coverage, definition/mapping versions and finance snapshots.
Receivables retains its effective snapshot date independently of source freshness.
Refresh View only re-executes trusted report serving and preserves current viewer filters;
failed or stale completion does not replace the current report. It does not save drafts.

Sync Now and the affected/daily Reconcile Now actions call the same application-owned
AnalyticsOperations lifecycle as the existing CLI. Synchronous progress is stated honestly;
there are no invented percentages. Results expose safe counts, status and run references.
The backend freshly authorizes analytics querying plus tenant management. Normal authorized
report users retain Refresh View; operator controls are permission- and configuration-gated.
Operation runs/failures preserve actor, tenant, kind, timestamps, run ID and result, and manual
requests also pass through the existing access audit boundary.

The filter defect originated in trusted serving's dimension-value mapping: IDs were retained
but available aggregate label evidence was dropped. Shared options now retain `{id,label}`
from the same trusted, tenant- and policy-scoped tuples. Bounded lists, search pages and selected
hydration share API presentation mapping, including governed branch profile labels. Business Line
uses governed EN/AR labels; customer/person names retain actual names. Missing labels use `—`,
and unassigned values use localized chrome. Stable identities remain the stored/query values.

Customer discovery retains bounded keyset search and 50-option UI pages. Selected identities
hydrate independently of discovery pages. Low-cardinality dimensions keep the existing bounded
list and share the selected-ID hydration context; no eager full customer population or new
low-cardinality pagination was introduced. Branch, Region and other categorical filters inherit
this shared path. Customer Historical presents one scope guidance per execution while retaining
successful widgets and unrelated failures. The underlying safety policy is unchanged.

Owning code: `apps/web/src/reports/AnalyticsOperations.tsx`, `useAnalyticsOperations.ts`,
`refresh-trusted-view.ts`; `apps/api/src/analytics-operations-runtime.ts`, `analytics-jobs.ts`,
`routes/analytics-status.ts`, `routes/dimension-discovery.ts`, `routes/dimension-option-labels.ts`;
`packages/data/src/operational/dimension-options.ts`, `repository.ts`; shared web filter controls
and `Renderer.tsx`. Owning contract/config documentation is updated in
`docs/integration/operational-analytics-v1.md` and `infra/staging/runtime.env.example`.

## Automated verification

The original stable Operational UX full gate sequence passed: frozen install, lint,
architecture, quality, typecheck, 724 unit tests, 169 disposable PostgreSQL tests, API/web build
and diff. After the user's explicit shared-filter expansion, the affected suites were broadened:
727/727 unit tests and 170/170 PostgreSQL tests passed, zero skips. Final follow-up presentation
checks passed 18 tests; final API mapping checks passed 3 tests; the final PostgreSQL label and
Business Line selected-hydration check passed 1 test. Final lint, typecheck, architecture,
quality and diff gates passed with zero diagnostics; API/web build passed.

Automated tests use synthetic fixtures and do not load developer environment files or require
customer/model services. They cover positive/zero-change operations, failure preservation,
permission/membership denial, safe audit, honest freshness states, localized controls,
independent hydration, bounded discovery, policy scope and tenant isolation. The grouped label
fixture uses genuine synthetic reconciliation and release-certification evidence.

The existing Vite large-bundle warning remains. No new debt allowance or baseline relaxation.
Logs are `/tmp/operational-gate-{0..8}.log`, `/tmp/final-delta-*.log`,
`/tmp/final-renderer-tests.log`, `/tmp/final-label-tests.log`, `/tmp/final-label-postgres.log`.

## Authenticated local runtime acceptance

URL: `https://localhost:8443`; identity: `staging-tenant-admin`; tenant: `el-dabboos-iq`.
These manual results are separate from automated synthetic coverage.

| Flow | Observed result |
| --- | --- |
| Executive | Six report widgets; September period/Refresh View rendered and preserved selection. |
| Business Line | Three report widgets rendered; trust/freshness surface present. |
| Salesperson | Three report widgets rendered; trust/freshness surface present. |
| Invoice & Refund | Seven report widgets rendered. |
| Receivables | Twelve widgets; report end beyond the latest snapshot still showed Sep 30, 2026 as the effective snapshot. |
| Customer Historical: long period, no customer | Exactly one guidance message in EN and AR; successful monthly chart remained visible. |
| Customer Historical: Yesterday, no customer | Two report widgets rendered, no scope guidance. |
| Customer Historical: Last 12 months, safe selected customer | Two widgets rendered, no scope guidance; customer button hydrated its name. |
| Customer search | Opened with 50 human-readable options; searching a visible name narrowed to four matches; stable-ID selection hydrated its name. |
| Shared report filters | Executive and Invoice & Refund displayed named Salesperson options and General/No Sugar (عام/بدون سكر); no technical IDs in option/control text. Stable IDs remained in option values. EN and AR verified. |
| Status/Refresh View | Report reads, discovery, locale/filter changes and Refresh View left operation counts, evidence count, trusted pointer and cursor unchanged. |
| Sync Now | Progress remained separate from trusted data. Technical failures recorded durable failure evidence; successful/zero-change live sync was not confirmed. |
| Affected reconciliation | Failed with 12 mismatches; stored manual actor/run; no trusted promotion or cursor change. |
| Daily reconciliation | Failed with 3 mismatches; stored manual actor/run; no trusted promotion or cursor change. |

Both reconciliation controls were exercised through the UI. The failures were not injected
by modifying Odoo or mart data. The source/mart control discrepancies were not masked or
corrected as part of UX work. Sync's technical root cause remains unclassified; its source
statement/snapshot limits were not increased. Positive and unchanged command outcomes are
covered by automated tests, not claimed as live successes.

Before/after fingerprints retained revision `7c752b1f-f1f4-46e8-b5eb-65ad79d8dc54` and cutoff
`2026-10-08 00:21:08.728+00`. After manual acceptance there were 13 operation runs, 11 technical
failure records and 138364 historical reconciliation evidence rows; report-only reads and
Refresh View left this fingerprint unchanged. Structured sanitized evidence is in
`operational-ux-2026-10-08.json`.

The filter matrix is verified by real DOM/API/PostgreSQL tests, with manual multi-report evidence:

| Dimension | Names | Search | Selected IDs outside page/options | No technical text |
| --- | --- | --- | --- | --- |
| Customer | Pass | Bounded server search | Pass | Pass |
| Salesperson | Pass | Existing bounded list; generic bounded server contract tested | Pass | Pass |
| Business Line | Pass, EN/AR | Existing safe two-value list | Pass | Pass |
| Branch / Region | Shared mapping and controls | Existing bounded list | Pass; Branch profile-label normalization also tested | Pass, including safe unavailable fallback |

## UI quality review

The project quality skill was applied in AFTER mode. EN/AR and Light/Dark were inspected.
RTL status/filter chrome remained coherent. At 390px and 768px the active QA tab had no
page-level horizontal overflow; primary buttons were at least 44px high and all actions stayed
within the viewport. Phone navigation reached the operational page. Desktop width was 1036px.
Native selects/buttons/search controls preserve keyboard interaction; DOM tests exercise changes.
The temporary viewport and QA tab were removed, and the original browser was restored to EN/Dark.

Screenshots are local review artifacts under
`/home/hazem/.codex/visualizations/2026/10/08/01a11a55-ebe9-7a33-af35-4a21ad18caf6/`:
`operational-status-final-ar.png`, `operational-phone-ar-light.png`,
`customer-historical-ar.png`. They are not customer extracts or committed assets.

## Approved local persistent-connectivity follow-up

The user subsequently explicitly approved persistent source connectivity for the
current local staging environment only. The API/web images were rebuilt and
recreated locally. Protected configuration now supplies the scoped source and
writer credentials, fixed source/tenant scope and private Unix-socket mount. No
protected files entered Git or images. The externally configured relay exposes a
mode-0600 Unix socket only, forwards to the existing authenticated local SSH
tunnel, and uses Docker `restart: unless-stopped`. The API owns its container-local
127.0.0.1 bridge, so API recreation does not strand a sidecar network namespace.

Actual source identity probes from the private API namespace returned
`relayAvailable=true, sourceAvailable=true`. Overall API readiness was 200. A relay
internal process shutdown recovered automatically (`RestartCount=1`, healthy),
and source identity probing succeeded afterward. API restart also restored the
loopback bridge and source connectivity. A controlled relay stop returned source
unavailable; five trusted report query shapes still returned rows (monthly net
invoicing: 1; Business Line order revenue: 1; salesperson order revenue: 40;
customer net invoicing: 1927; customer aged receivables: 2217), with API readiness
200. These are serving-query checks, separately from the earlier live report UI
checks. The trusted release/cursor and operation/evidence counts remain unchanged.

All 731 unit tests and 171 disposable PostgreSQL tests passed, zero skips. Frozen
install, lint, typecheck, architecture, quality, build and diff passed; quality and
diff reported zero diagnostics. The new tests prove cached health does not probe
on reads, bounded concurrent probes, source outage/recovery/TTL/tenant isolation,
authorized operation refusal during source outage, independent serving readiness,
EN/AR unavailable-source feedback with Refresh View enabled, and PostgreSQL
read-only sessions that reject writes even for a synthetic write-capable identity.
The source session default supplements existing READ ONLY extraction snapshots.

**Two remaining acceptance blockers:** the existing SSH tunnel is authenticated,
but a fresh unattended SSH session was rejected by authentication. A protected
managed SSH candidate was prepared with strict host verification and server-alive
recovery, then disabled so it cannot compete for the active socket. Automatic
restart of the private socket relay is verified; automatic reconnection of the
upstream SSH session still needs the user's approved local identity/configuration
reference. No host verification, identity policy or safety bound was weakened.

The browser acceptance session expired and now requires existing admin sign-in.
Automated EN/AR controls passed; live new source-health UI and fresh Sync/Reconcile
acceptance remain pending sign-in. Automatic review rejected direct container
operation execution because it bypassed API authorization/audit; no such operation
ran. Earlier authenticated API run IDs, actors and real mismatch results remain
the recorded evidence, rather than being relabeled as new persistent-relay runs.
A bounded private Compose correction passed review after an earlier truncation
proposal was rejected; the web/TLS configuration was preserved byte-for-byte.

## Explicit safety confirmation

- Frontend duplicates sync logic: **no**.
- Frontend duplicates reconciliation logic: **no**.
- Normal dashboard read contacts Odoo: **no**.
- Refresh View contacts Odoo: **no**.
- Failed candidate replaces trusted release: **no**.
- RLS bypassed: **no**.
- Authorization weakened: **no**.
- Finance semantics changed: **no**.
- Receivables snapshot semantics changed: **no**.
- LLM runtime dependency: **no**.
- Odoo writes: **no**.
- Push: **no**.
- Merge: **no**.
- External deployment: **no**.
