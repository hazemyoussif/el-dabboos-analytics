# Current assumptions

- `demo-iq` and `demo-eg` are controlled synthetic tenants; Iraq is the default demonstration market. The selector is not production identity or authorization.
- The Iraqi and Egyptian branch names denote synthetic demonstration geography, not actual El-Dabbous branches or customers.
- TenantProfile on the server governs country, reporting currency, default locale, Arabic dialect metadata, time zone, and display geography. Normal Arabic UI labels use Modern Standard Arabic. Iraqi/Egyptian colloquial terms appear in conversational examples and placeholders, synonyms, demo planning, and evaluations.
- All synthetic canonical monetary facts within one tenant are assumed to share that tenant's reporting currency: IQD for Iraq, EGP for Egypt. The prototype does no FX conversion. Transaction, company/base, and reporting currency must be distinguished in a future operational adapter; mixed currencies must not be summed without an approved conversion policy.
- The seed spans two years and uses six branches, twelve salespeople, 420 Iraqi or 360 Egyptian customers, 160 products, and 150 assets. It models seasonality, branch growth/decline, overdue balances, stock pressure, and failures, but is not audited accounting.
- Gross margin is gross profit/net revenue, AOV is revenue/order count, and win rate is won/closed opportunities. Malik must confirm the production closed-state definition. MTBF is operating hours/failures; MTTR is repair hours/completed repairs. These formulas remain provisional.
- Receivables and inventory are entity-level snapshots, not additive across dates. Date ranges define snapshot time scope; event-month filters are rejected for snapshots.
- Query dates are inclusive ISO dates. Comparisons use UTC calendar arithmetic and complete prior buckets. Template presets resolve against the tenant's time zone. Fiscal calendars remain unresolved.
- `dataThrough` reflects the latest relevant tenant business/event date for each metric and is independent of the query period. The SQLite and mock adapters omit `sourceAsOf` unless a real synchronization/extraction timestamp is explicitly configured.
- DashboardSpec v1 was the initial single-metric prototype schema. V2 is the active multi-series schema and patch contract. No persisted production specs require migration.
- The mock planner remains the default and demonstrates bounded sales intent and five edits; it is not an LLM or a general dialect parser. The structured planner can use a configured local OpenAI-compatible server. Planning can be disabled while templates continue working.
- Planned metrics in the product registry are recognized concepts only. They have no executable formula or approved source data and cannot enter a DashboardSpec.
- Manual builder changes and undo/redo exist only in the current browser session. A new dashboard remains a non-executable draft until it contains a valid widget. Tenant switching reloads the active template and discards the prior market’s builder history.
- Demo users and memberships are server-owned synthetic fixtures. `x-demo-user-id` is a local simulation, not authentication. The tenant header is validated against the selected user's membership.
- Permissions and metric domains determine access. The Baghdad manager has an enforced branch filter; the sales analyst sees only sales/CRM metrics. Requested dashboard filters never replace policy filters.
- The builder code and React-Grid-Layout load only when the editor opens. Normal dashboard viewing uses a lightweight portable grid renderer.
