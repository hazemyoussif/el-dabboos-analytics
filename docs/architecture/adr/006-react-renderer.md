# ADR-006: Declarative React renderer

Status: Accepted

Context: Model output must not become application code.

Decision: The planned React layer maps known widget types to maintained components and consumes AnalyticsResult.

Alternatives: Generated components or arbitrary chart configurations.

Consequences: New visual forms require explicit product work and tests, including RTL.
