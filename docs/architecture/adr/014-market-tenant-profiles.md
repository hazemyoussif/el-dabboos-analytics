# ADR 014: Governed market profiles for demo tenants

Status: Accepted for the prototype (2026-09-30).

## Decision

A server-owned TenantProfile registry defines the two controlled demonstration tenants `demo-iq` and `demo-eg`. Iraq is the default demonstration market. Each profile supplies country, default UI locale, Arabic dialect metadata, reporting currency, IANA time zone, localized tenant/branch labels, and example branches. The API resolves `x-tenant-id` against this registry and rejects unknown tenants. Client country, currency, dialect, and time-zone headers have no authority. The repository still receives only a canonical tenant ID and locale; deterministic metric logic does not branch on country.

## Consequences

One app and one set of metrics/templates serve both markets. The selector is a prototype control, not authentication. Synthetic seed data is partitioned by tenant and uses different branch geography. Local date presets use each tenant's time zone. UI labels stay in Modern Standard Arabic. Conversational prompt placeholders and examples use the selected market's Iraqi or Egyptian phrasing, and dialect synonyms support bounded demo planning/evaluation. No Kurdish localization is included.

Canonical monetary facts are assumed to be expressed in the tenant's reporting currency. Operational adapters must establish transaction currency, company/base currency, and reporting currency separately and refuse mixed-currency aggregation until a conversion policy is approved. This prototype does no FX conversion.
