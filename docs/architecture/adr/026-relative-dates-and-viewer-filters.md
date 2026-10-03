# ADR 026: Relative dashboard dates and temporary viewer filters

## Decision

DashboardSpec v2 remains canonical. Its business filters contain either `datePreset`, `dateRange`, or neither (all time), plus optional dimensions. Both date modes together are invalid. Existing absolute dashboards remain absolute; no inference or persistence migration runs. Templates and blank drafts retain symbolic `current_year` (or the template's declared preset).

The domain vocabulary is closed: today, yesterday, current_month, previous_month, last_30_days, current_quarter, previous_quarter, current_year, previous_year, last_6_months, last_12_months. Week presets are excluded until week-start semantics are governed.

| Preset | Inclusive tenant-local calendar dates |
| --- | --- |
| today / yesterday | The corresponding single day |
| current_month / current_quarter / current_year | Calendar period start through today |
| previous_month / previous_quarter / previous_year | Complete preceding calendar period |
| last_30_days | Today minus 29 days through today |
| last_6_months / last_12_months | First day of the month 5 / 11 months before this month through today |

`resolveRelativeDatePreset` is the single application calendar resolver. It extracts the local day using the trusted tenant timezone and an injected clock, then uses UTC calendar arithmetic on date labels. Source coverage/freshness never anchors relative periods. DashboardExecutor captures one clock instant per execution and accepts a separate `{ timeZone, overrides? }` scope; AnalyticsContext remains tenant/locale/enforced policy. Legacy absolute/all-time executor callers can omit scope; relative specs require a timezone.

## Execution boundary

`DashboardFilterOverrides` is transient, strictly validated execution input, never spec or saved-record state:

- Omitted date inherits the dashboard default; `{ mode: 'relative', preset }` or `{ mode: 'absolute', range }` replaces it; `date: null` explicitly selects all time.
- Omitted dimensions inherit defaults; supplied dimensions replace business dimensions; `dimensions: []` means All business values.
- Interactive dimensions are the non-calendar intersection supported by every metric/series across the dashboard, derived from the governed catalog. Arbitrary fields and policy filters are rejected.

API resolves timezone from the selected tenant profile. Executor resolves effective business filters before constructing, validating, normalizing and identifying queries. Repository ports still receive concrete date ranges only. Query identity includes these resolved dates/dimensions and the existing tenant/locale/enforced policy. No shared cache is introduced.

Top-N selects after filtering. Comparisons derive their baseline from the resolved range; bounded analyses still fail without a date window. Viewer All time can therefore produce an honest per-series error for a comparison while other series execute. Snapshot balances retain latest entity/measure at the effective cutoff, including carry-forward before the window, never summed across dates. Policy constraints are independently ANDed with business filters; All cannot broaden them.

Execution metadata adds `effectiveFilters` containing concrete business dates/dimensions only. `dataThrough` and `sourceAsOf` retain their existing provenance meanings. Policy metadata is not exposed.

## Authoring and viewing

The shared localized date control offers Relative period, Fixed dates, and All time. Relative-to-fixed freezes the displayed resolved range (or uses the shared resolver if execution metadata is unavailable). Fixed-to-relative selects current_year explicitly; it never infers a preset. Authoring uses canonical set_filters patches and normal semantic history/re-execution, dirty state, Undo/Redo and explicit versioned Save/Save As. Unbounded authoring cannot invalidate an existing bounded analysis silently. Palette-only history remains presentation-only.

A collapsible View filters area executes immediately through a dedicated hook. Overrides never change the working document, builder history, saved version or AI input. Reset re-executes dashboard defaults. A workspace navigation revision invalidates view selections on dashboard/template/new-draft/tenant/user navigation, including reopening the same record. Theme and language changes preserve selections. Entering either manual or AI editing clears overrides and re-executes canonical defaults. Save As uses canonical content. Requests share the existing stale-response guard, and refreshing controls/results communicate loading.

Dimension values come from the existing tenant/policy-scoped repository endpoint, extended to the governed categorical vocabulary in both Mock and SQLite. The client does not derive dropdown choices from chart rows. Controls allow one value or All; existing multi-value defaults remain intact until explicitly replaced.

## AI

Generation carries symbolic relative presets and explicit historical date pairs without resolving dates during compilation. Sparse edit set_filters adds optional nullable datePreset alongside dateRange: omission preserves, non-null one mode clears the other, both non-null reject, null clears that field. Plans remain transient and compile to canonical v2 spec/patch with full semantic validation and post-planner authorization.

The provider receives the extended enum and one sparse field, with concise relative-versus-historical instructions. There are no additional LLM calls, viewer state, discovered values, execution rows, or freshness fields in model context. Provider URL/model/config remain adapter concerns; no local tuning profile becomes a universal default.

Measured projected schema sizes against main: generation 3,594 → 3,715 characters (+121); edit 4,165 → 4,363 (+198). A coarse four-characters/token estimate is +31 / +50 tokens, not tokenizer or live-provider measurements.

## Verification and limits

Focused coverage includes all presets, leap/year/quarter/DST boundaries, canonical exclusivity, rolling versus fixed execution, filter-before-Top-N, comparisons/snapshots, policy intersections, API timezone/payload boundaries, persistence isolation and Save As, sparse AI modes, single-call fake-provider paths, API client separation, builder history, and dimension compatibility/discovery. Browser evidence is recorded in [filter verification](../../qa/dashboard-filter-verification.md).

No Odoo/Postgres adapter, production authentication, privacy boundary, timeout/cancellation/capacity system, migration runner, backup system, mobile builder redesign, or moving-average overlay is introduced.
