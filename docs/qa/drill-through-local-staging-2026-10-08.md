# Local staging drill-through acceptance — 8 October 2026

## Delivered behavior

The Metric Catalog follows the user's revised requirement: business labels and the existing `(i)` icon, with short descriptions on hover/focus and full canonical definitions on click/tap. No canonical ID row appears in the catalog. Available metrics reuse canonical labels and definitions; planned entries retain their planned status without invented definitions.

KPI cards reserve a 44px detail action footer and grow with their reading content. Long labels, signed/large values and partial-coverage messages remain readable. Admitted bar/line marks provide pointer and keyboard activation with business-label accessible names, visible focus and a tooltip hint. Tables keep detail values as numeric text rather than pills. Search and Apply search share an aligned row with a 12px gap. Native detail dialogs retain focus containment and return focus to the triggering mark, including replacement SVG nodes.

## Runtime and persistence

Production API and web images were rebuilt and recreated in the existing protected local staging stack at `https://localhost:8443`; no development server was substituted. Final image identities: API `93f59d1d267a`, web `5080d01ab9b5`. Protected auth/database configuration was retained. The authenticated browser session, report requests and readiness remained available while the source relay stayed stopped. Login recovery evidence, retained Better Auth HTTPS origin/base URL, CSRF rejection, migrations and database connectivity are recorded separately in [authentication recovery](staging-auth-recovery-2026-10-08.md).

Migration 035 and the revision-RLS lookup index in 036 were already applied in this local mart. Deployed ledger checksums matched repository files; runtime readiness passed. Forced RLS remained enabled on partition facts, drill partitions, fact revisions, partitions and aggregate bases. Neither migration was reapplied or modified. No external database, volume, source credential, source connection or publication was changed.

## Manual acceptance

Authenticated requests returned HTTP 200 and displayed business names without internal stable IDs:

- Executive KPI details preserved the selected September date range and metric.
- Business Line chart keyboard activation narrowed rows to No Sugar; numeric table activation narrowed rows to General. Load more increased 50 rows to 100 while retaining the filter. Contribution ascending sort produced ordered rows.
- Customer chart pointer activation returned the clicked customer; salesperson Space activation returned the clicked salesperson.
- Historical line-point Enter activation narrowed the request to October 2025 and loaded 50 rows.
- Bounded customer search produced the expected no-match state; input maximum length remained 100. Keyboard Tab moved from Search to Apply search with visible focus.
- Receivables displayed five customer-snapshot columns, September 30 cutoff and the explicit absence of retained accounting-line/document detail.
- Refresh View retained a bounded previous-month period and populated trusted widgets while source operations stayed unavailable. Transport was not changed as part of this polish.

The final KPI DOM matrix covered EN/AR × Light/Dark × 390/1024/1440px (12 cases). All six KPI values and action footers remained within their cards without ellipsis or horizontal page overflow; Arabic used RTL. Representative visual inspections covered desktop, tablet and phone. Catalog short/full definitions were inspected in both languages. Detail search alignment was checked at the same three widths in both directions. Screenshots containing staging business rows are kept outside the repository under `/tmp/drill-acceptance-20261008`.

## Automated checks and limitations

Seven focused tests passed: API drill authorization/request/context, web context preservation, bilingual detail fields, shared catalog/KPI/mark admission, canonical metric definition and focus behavior, and unchanged request transport. Typecheck, lint and production builds passed. Architecture, baseline-aware quality and diff gates reported zero diagnostics. The Vite build retains its existing large-chunk warning; parallel SSR fixtures reported a shared HMR-port warning without test failures. No full-suite repetition, push or merge was performed.

At this polish checkpoint, event detail/page/search/sort requests took approximately 12–18 seconds on this local mart. The subsequent [performance optimization](drill-through-performance-2026-10-08.md) records newer measurements. This remains a performance limitation, outside the scoped UI polish. Receivables intentionally exposes published customer vectors, not fabricated document lines. Planned catalog metrics have no canonical full definitions yet.
