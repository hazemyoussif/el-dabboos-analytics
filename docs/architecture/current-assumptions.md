# Current assumptions

- `demo` is a fake tenant for local fixtures. Real tenant identity and authorization are unresolved.
- SQLite is a local prototype source. No Odoo schema, API, synchronization, or freshness guarantee is assumed.
- Currency values are synthetic and have no approved currency or tax policy. Percentage and duration metrics use illustrative units.
- The seed intentionally models seasonality, branch growth/decline, and increasing failures. It does not yet meet the suggested operational record counts, and metric values are independent observations rather than audited derived accounting.
- Date filtering uses ISO calendar dates and an inclusive range. Fiscal calendars and time zones are unresolved.
- The catalog has 24 executable metric IDs, but precise business formulas (especially ratios, stock snapshots, MTBF/MTTR, and receivables) require Malik's confirmation before production use.
- The JSON Schema is a public contract and is compiled for runtime structural validation. Semantic compatibility rules are checked in TypeScript.
