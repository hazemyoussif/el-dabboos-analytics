# Current assumptions

- `demo` is a fake tenant for local fixtures. Real tenant identity and authorization are unresolved.
- SQLite is a local prototype source. No Odoo schema, API, synchronization, or freshness guarantee is assumed.
- Currency values are synthetic and have no approved currency or tax policy. Percentage and duration metrics use illustrative units.
- The seed models seasonality, branch growth/decline, and increasing failures. It does not meet the suggested operational record counts or produce audited accounting.
- Additive metrics sum by default. Gross margin is gross profit divided by net revenue, AOV is revenue divided by order count, and win rate uses won opportunity count divided by all opportunity count. MTBF uses operating hours divided by failures; MTTR uses repair hours divided by completed repairs. These are provisional formulas pending Malik's approval.
- Outstanding/overdue balances and inventory measures are point-in-time snapshots. A source adapter must supply stable entity IDs for those measures. Snapshot rows are selected on or before the requested period end and summed across entities, never across dates. Date ranges define snapshot time scope; event-month filters are rejected for snapshots.
- Date filtering uses inclusive ISO calendar dates and UTC calendar arithmetic. For a grouped comparison, the prior bucket is complete even when the current selected bucket is partial. Fiscal calendars and time zones are unresolved.
- AnalyticsResult's optional `sourceAsOf` is adapter-supplied freshness metadata. Fact event dates are not automatically treated as ingestion freshness.
- The JSON Schemas are the public DashboardSpec and DashboardPatch structural contracts; TypeScript applies semantic compatibility rules.
