# ADR 015: Market-neutral dashboard template catalog

Status: Accepted for the prototype (2026-09-30).

## Decision

The application package owns ten versioned-code dashboard templates with stable IDs, bilingual names/descriptions, domains, tags, date presets, layout, and v2 widget definitions. Templates contain only executable canonical metric IDs and no market-specific branch IDs or presentation currency. Instantiation resolves a preset against the server-selected tenant time zone and reference clock, producing a concrete DashboardSpec v2. The same template ID and widget definition instantiate for Iraq and Egypt. The API exposes a template catalog and tenant-scoped instantiation route; the web library uses those routes without the planner.

## Consequences

The platform remains useful when planning is disabled. Templates are code-governed and cannot yet be edited or persisted by end users. Relative presets are deterministic for a supplied reference instant; fiscal calendars are not modeled.

The catalog now has twenty templates. [ADR 032](032-published-analytics-capabilities.md) governs release-aware requirements, compatibility, certified-period defaults and source-neutral consumer capability inputs. The original richer templates remain available to compatible synthetic or governed datasets.
