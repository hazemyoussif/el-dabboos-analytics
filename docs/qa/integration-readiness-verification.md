# Integration-readiness verification evidence

The integration-readiness closeout rehearsals were verified on feat/integration-readiness-docs over enterprise-UI base 88fff9347c138e2099cb4feac49eba37e3adba90. The milestone subsequently incorporated El Dabboos brand normalization and its UI follow-up. These are the performed closeout rehearsals, **not a claim that all documented regression cases were manually executed**. Final automated/CI status is reported with the pushed HEAD.

## Environment

Node 24.21.0; pnpm 12.6.0. Disposable mock analytics with IQ/EG synthetic facts; temporary SQLite metadata databases. Real composition root in structured mode used a fake loopback OpenAI-compatible endpoint, not a real model. Separate mock root and injected-repository fault harness verified mode/readiness/failures. Web Vite previews used isolated ports; developer servers and developer env files were not changed.

| Requested behavior | Result / evidence |
| --- | --- |
| Normal dashboard executes | PASS: Sales Performance in IQ and EG; IQD/EGP formatting and governed multi-series previews |
| Duplicate query widgets render | PASS: generated draft with two identical revenue KPIs showed identical values; four series caused three unique repository calls in HTTP rehearsal |
| Partial series unchanged | PASS: fake gross_profit failure left two revenue KPIs successful and monthly revenue chart visible with partial warning; no invented zero |
| AI generate/edit unchanged | PASS: root structured adapter consumed fake canonical spec/patch; generation began unsaved; edit changed title in draft while GET saved record still showed original title/version 1 |
| Saved dashboards | PASS: explicit Save created record/deep link; Save after AI patch updated to version 2; stale expectedVersion 1 returned 409; refresh reopened persisted spec |
| Folders/favorites | PASS: favorite, create folder and move association; refresh retained personal preference and folder; changing identity showed separate library |
| Themes | PASS: Light, Dark and System inspected; explicit Light persisted after reload; central chart presentation remained readable |
| Arabic/RTL | PASS: AR selection survived refresh, saved state remained clean, bilingual saved title and chronological month chart displayed in RTL shell |
| Structured planner starts | PASS: actual root with structured mode/model/URL, default diagnostics false and configured concurrency 2; no startup model ping |
| Mock planner starts | PASS: actual root mock mode, default concurrency 8; no endpoint required |
| Invalid config fails safely | PASS: invalid analytics enum failed before listening/metadata file creation; only field name in config error, no supplied credential |
| Liveness/readiness | PASS: /health and /health/live 200; /health/ready 200 available on both roots. Closed/missing/hanging persistence and unavailable analytics 503 are covered by targeted API tests |

## Automated evidence

The enterprise-UI baseline contained **169 tests**. The integration-readiness implementation reached **184 tests**, adding query scheduling/identity/failure tests, startup config tests, readiness tests and documentation sanity checks. Its targeted executor/config/health/API authorization/template matrix/canonical schema/docs run passed 34 tests.

After El Dabboos brand normalization and the sidebar/language-control UI follow-up, the **consolidated suite contains 195 passing tests**. Frozen install, lint, typecheck, tests and API/web builds passed. Final consolidated branch CI is green: [successful CI for consolidated implementation 0a45ca7](https://github.com/hazemyoussif/el-dabboos-analytics/actions/runs/36995490894). The documentation-only closeout rerun and CI status are reported with its pushed HEAD. Web build retains the existing >500 kB chunk advisory; no bundle redesign was performed.

## Separate brand closeout verification

Official brand integration and browser preference-key migration were verified separately from the integration-readiness rehearsals above. Inspection covered expanded/collapsed navigation and the mobile drawer in Light/Dark, EN/Arabic/RTL at 1280px desktop, 1024px tablet and 390px mobile. The sidebar-only white treatment and localized Language label/control alignment were checked; PNG hash tests confirm the official mark and corporate lockup remain unchanged, and the favicon retains the original gradient asset.

Preference migration verified canonical-key precedence, valid legacy-value copying, safe invalid/unavailable-storage fallback and canonical-only future writes. Theme/sidebar choices survived refresh, and presentation changes did not dirty a saved dashboard or increment its version. Branding and private workspace package-scope normalization did not change analytics, domain or security contracts: business IDs, authorization, schema validation structure and versions were preserved. Only project-owned schema URL annotations were normalized; no database migration occurred.

These separate checks do not imply execution of every documented manual QA case.

## Scope limits

No source/customer integration, real model evaluation, production IdP, persistent audit, trace implementation, query cancellation or migration runner was added. No production scale claim follows from synthetic tests. All 14 real-data acceptance cases remain future specifications requiring approved source reports and tolerances.
