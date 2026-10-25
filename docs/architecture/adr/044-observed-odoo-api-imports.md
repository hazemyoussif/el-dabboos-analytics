# ADR 044 — Observed Odoo API inputs with existing prepared serving

Status: owner accepted on 25 October 2026, including a private input copy and reuse of existing recipes.

## Decision

The owner requested standard Odoo 18 API access without an installed module and accepted repeated reads and exact reconciliation while records can change between requests. This extends the retained-source assumption in ADR 029; independent RPC requests are not an ERP MVCC snapshot. The owner subsequently required every report family, prioritizing Sales Command Center and Products & Warehouses, and explicitly approved a private input copy on the Analytics server to reuse existing formulas and preparation.

The operator explicitly selects `odoo-orm-observed` for the existing registered company-1 source. Only standard read methods are sent to Odoo. A closed model/field manifest covers the existing event, Business, review and Finance recipes. Inputs stream into a separate Analytics-owned database with dedicated writer and reader roles, never into the ERP. Customer rows remain on the company server. Numeric tokens retain their wire precision, relations retain IDs, and translated/company-dependent fields retain the SQL shapes required by existing recipes.

At the owner’s subsequent request to remove unnecessary workflows and guards, the import reads each selected model once. It hashes that input for traceability and uses existing independent financial reconciliation before publication. A second complete API scan is not required. The sealed manifest binds tenant, logical source, companies, API endpoint/database, input schema, receipt cutoff and fingerprint. Existing SQL readers retain a read-only MVCC lease over this **local input copy**. They use the same mappings, independent control recipes, canonical validation, background preparation, cursor/parent CAS and immutable publication as the existing integration. Dashboard requests continue reading prepared cells under ADR 040.

Copy receipts use `orm-observed-copy-v1:` revisions. The receipt cutoff is never described as a shared ERP transaction time. Event content fingerprints and receipt order avoid pretending second-resolution API write dates recover database microseconds. Public prepared-result lineage and bilingual dashboard/export notices disclose `sourceConsistency=api_observed`, including Finance and Business snapshots that originate in the copy.

## Consequences

The private copy supports existing report families without an Odoo module or new report formulas. Publish the two priority reports first through the current Business mapping with Sales Command enabled, then refresh remaining families using the same sealed copy and existing preparation. Historical mappings must not fabricate historical stock/current-debt observations. No new metric, currency conversion or approval record is implied.

Independent API calls do not prove transaction-wide consistency or unrestricted record-rule visibility. A local MVCC lease strengthens downstream repeatability only. API observation is not a commit-ordered change stream. Permissions, currencies and exact reconciliation remain fail-closed. A failed copy or preparation leaves the trusted pointer unchanged.

Copy capture is explicit offline work and must finish before extraction. Recurring sync and Command workers reuse a sealed copy; they do not secretly contact an ERP database. The observed daily job explicitly captures and refreshes all families before ordinary daily reconciliation/sweep. Operators must run another capture to advance source freshness between those daily runs. Full-copy cost and disk headroom must be measured before setting its cadence. PostgreSQL direct-source ingestion retains its original stronger contract when explicitly selected.

[Operations and evidence](../../integration/odoo-standard-api.md).
