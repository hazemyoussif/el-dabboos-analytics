# ADR-006: Declarative React renderer

Status: Accepted

Context: Model output must not become application code.

Decision: The React renderer maps known v2 widget types to maintained components and consumes per-series AnalyticsResult values aligned by the application layer. Chart configuration stays in React.

Alternatives: Generated components or arbitrary chart configurations.

Consequences: New visual forms require explicit product work and tests, including RTL.
