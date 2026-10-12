# October 7 performance and shared presentation follow-up

This follows [the runtime incident](runtime-incident-20261007.md). No reports or metric functionality were added. SQL deadlines remain 15 seconds; execution concurrency and DB pool sizing remain configurable (local deployment: 2 and 8). There is no laptop-specific behavior, result reduction or API-process data cache.

## Measurements before the follow-up

Real HTTPS requests reused only the explicitly authorized intended administrator's existing unexpired session. Credentials remained in memory; diagnostics recorded categories, durations and aggregate checks, never SQL parameters or private rows. Nginx timeouts were unchanged.

After an API restart, semantic catalog first/warm requests took 207/215 ms and templates 232/204 ms. Publication coverage dominated those calls (143–172 ms); connection wait was 0 ms. These are first-process-request measurements with normal persistent certified proof results, **not a deliberately flushed PostgreSQL cache**. No additional endpoint cache was justified.

Invoice/Refund took 13.168 seconds, Aging 13.434 seconds. API completion was 13.166/13.412 seconds; HTTPS transfer/parsing added little. Maximum pool wait was 5/0 ms. Invoice's slowest statement was a grouped fact query (1.485 seconds), with data-through metadata at 1.482 seconds. Aging's slowest statement was data-through metadata (563 ms). No proxy/API/SQL timeout or pool starvation occurred. Two series execute concurrently; summed SQL durations exceed wall time because work overlaps. Repeated fact/data-through/label scans dominate remaining cost.

## Safe change and measured effect

Business certification remained live and checked the immutable approval case set on ordinary statements. A scoped timing measured the existing business guard at 16 ms versus 9 ms for a session-local equivalent candidate. Migration **024** replaces materialized one-dimensional null checks with `array_position`, retaining the original multidimensional fallback, exact set matching, duplicates/order semantics, tenant/reference checks and fail-closed behavior. Technical and derived proof results remain governed by migrations 021–023 and transactional dependency invalidation. This does not disable certification. Migrations 1–23 were not edited; 024 was applied to both local marts without changing financial facts, approvals or bindings.

Immediately after migration, real HTTPS times were Executive 5.083s, Business Line 9.334s, Salesperson 9.340s, Invoice/Refund 12.220s, Aging 12.986s. All returned 200, exact headline/grouped aggregate values and zero failed series. Aging retained 2,217 rows and labels and its 2,498,155-byte payload. The improvement is modest and these single samples are not a statistical performance guarantee.

## Shared UI and filter behavior

Metric hints use one overlay portal, viewport flipping/clamping, scroll/resize tracking, hover/focus persistence and Escape dismissal. Full definitions retain click/tap native dialogs; pointer/click isolation preserves builder behavior. Browser history is authoritative for immediate selected report/saved destination; loaded data and stale-request guards remain separate. Loading/error titles identify the destination. Report execution completes before optional filter discovery starts. Filter requests run one at a time, publish independently with tenant/language scope guards, and cannot discard a successfully loaded report. A discovery failure leaves the report visible, retains choices from other successful dimensions and shows a localized retry message. Logout uses existing shell controls with unchanged current/all-session callbacks.

The metadata route previously formatted IDs directly, so stable ERP IDs appeared as labels despite governed label evidence in facts. PostgreSQL discovery now groups authorized identities and selects only unambiguous display evidence from the same eligible event/latest-snapshot scope. Customer, Salesperson and Business Line use existing governed fields and source translation resolution. Product, Warehouse and other dimensions currently lack those governed display fields; missing/conflicting evidence shows “—”, while configured branch labels remain available. Uncertified dimensions remain unavailable. No identities, filter payloads, saved state or deep-link identifiers are changed. Duplicate names remain separate options by ID; Unassigned is localized. There is no guessed name substitution or production source access.

Functional DOM tests cover pending selection, failed/stale responses, history, report deep links, tenant switches, tooltip portal/Escape/modal/pointer isolation, duplicate-name filter selection, restored stable IDs, EN/AR and both logout callbacks. PostgreSQL tests cover label evidence/policy isolation and certification equivalence. Visual/browser accessibility and responsive verification remain pending in the [combined Luna handoff](../qa/local-management-pack-luna-handoff.md). No Sol visual QA or Luna dispatch occurred. No push or merge.

### Instrumented Aging timeline after migration 024

Request received at 0 ms; publication discovery began at 133 ms. First fact
query began at 495 ms and first data-through query at 875 ms. Series overlapped
with concurrency two. Last publication coverage finished at 11,224 ms; last fact
query at 12,020 ms; last data-through query at 12,353 ms; final customer labels at
12,742 ms. Last transaction statement finished at 12,745 ms; API response finished
at 12,963 ms, and HTTPS body retrieval at 12,986 ms. The 218 ms interval after the
last SQL includes executor alignment, response construction/serialization and
socket completion; it is not an isolated serialization benchmark. Maximum pool
wait was 4 ms. Slowest individual statement was data-through at 495 ms. Summed
fact/data-through/coverage/label times were 9,724/6,609/3,094/2,770 ms respectively,
which overlap and must not be added as end-to-end time.

### Engineering verification and local packaging

Frozen install, lint, architecture, quality, typecheck, build and diff gates passed.
The final full unit run passed **656/656**, the full isolated PostgreSQL suite
**133/133**, and the final navigation DOM recheck **4/4** after grouping helper
discovery options. Six resolved historical short-name allowances were removed;
no baseline ceiling was added or increased. Existing unrelated Odoo changes were
left outside this task's commit.

The final Docker API image built successfully. Its web sibling stalled in its
dependency-install step; that stalled build was interrupted. The final web
`pnpm --filter @el-dabboos/web build` passed with the frozen installed dependencies,
and its resulting `dist` was packaged locally using the same nginx:1.28-alpine
base, unchanged repository nginx.conf, nginx user and entrypoint. This packaging
fallback introduces no runtime or laptop-specific logic; ordinary source Docker
builds remain available. Temporary build/diagnostic files were not committed.

### Final production-assets HTTPS acceptance

After restarting the API and deploying the final web bundle, catalog first/warm
requests were 229/206 ms and templates 226/202 ms (all HTTP 200). The following
first report requests used normal persistent DB proof results; they are not DB-cache
flush benchmarks. Warm repeat timings follow below.

| Report | First request | Successful / failed series |
| --- | ---: | ---: |
| executive-sales-invoicing | 5.058s | 6 / 0 |
| business-line-performance | 9.234s | 10 / 0 |
| salesperson-performance | 9.278s | 10 / 0 |
| invoice-refund-operations | 11.951s | 12 / 0 |
| receivables-aging | 12.265s | 18 / 0 |

All exact headline checks and grouped aggregate checks passed. Aging retained
2,217 customer rows/labels and the full 2,498,155-byte payload.

| Report | Warm request |
| --- | ---: |
| executive-sales-invoicing | 5.071s |
| business-line-performance | 9.216s |
| salesperson-performance | 9.267s |
| invoice-refund-operations | 12.083s |
| receivables-aging | 15.499s |

All warm requests also returned 200 with exact aggregate/headline checks and zero
failed series. Aging varied from 12.265 to 15.499 seconds; the change does not
guarantee a uniform speedup. Metadata and fact scans remain the dominant work.

Real HTTPS filter requests in EN and AR returned 40 Salesperson, 2,932 Customer
and one Business Line option, all with business labels and stable source IDs
internally, **zero technical source IDs displayed**. Product/Warehouse remain
explicitly unavailable. The initial Aging workload overlapped catalog/templates,
all categorical filter discovery and report execution: catalog/templates 225/230 ms,
filter readiness 6.642s, report 14.591s, total data/filter readiness 14.826s; HTTP 200,
zero failed filter requests/series and all 2,217 customer rows. This is functional
HTTPS request evidence, not a browser rendering/interaction timing claim.

Delivered warm Aging API completion was 15.471s with maximum pool wait 0 ms;
slowest statement was a fact query at 688 ms. Initial Aging API completion was
14.562s; Nginx request/upstream timing 14.567s, status 200. Across the complete
initial filter/report workload maximum pool wait was 18 ms, with zero SQL errors;
the slowest Aging statement was data-through at 905 ms. No timeout increase was
used. Temporary diagnostics were removed; original Nginx `access_log off` and
API preload absence were verified. HTTPS root and readiness returned 200.

### Final check with diagnostics removed

Effective startup configuration: statement deadline 15,000 ms, pool 8,
execution concurrency 2 and unchanged maxGroups 3,000. Normal HTTPS results:

| Report | Time | HTTP / failed series |
| --- | ---: | ---: |
| executive-sales-invoicing | 5.112s | 200 / 0 |
| business-line-performance | 9.221s | 200 / 0 |
| salesperson-performance | 9.364s | 200 / 0 |
| invoice-refund-operations | 12.164s | 200 / 0 |
| receivables-aging | 12.033s | 200 / 0 |

Exact headline and grouped checks passed again; Aging retained all 2,217
rows/labels. No diagnostic overrides or timeout increases remain active.
