# ADR-003: AnalyticsRepository port

Status: Accepted

Context: The prototype starts on SQLite; production sources remain undecided.

Decision: All analytics reads go through `execute(query, context)` and return AnalyticsResult.

Alternatives: Embed SQL in API or UI components.

Consequences: Adapters must pass shared contract tests; source changes do not change dashboard contracts.
