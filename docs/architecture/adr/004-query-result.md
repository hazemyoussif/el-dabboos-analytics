# ADR-004: Canonical query/result and bounded analysis contracts

Status: Accepted (amended September 2026)

Context: Widgets need portable, deterministic analytics. A single generic operation could not express useful combinations and accepted semantically nonsensical choices.

Decision: AnalyticsQuery names one governed metric, filters, grouping, optional additive aggregation, and a bounded AnalysisSpec. AnalysisSpec has named slots for comparison, moving average, running total, percentage contribution, ranking, and top/bottom N. Validation checks date and dimension requirements and rejects incompatible combinations. AnalyticsResult returns keyed nullable values plus provider-neutral source ID, execution time, metric-specific `dataThrough` event date, optional adapter-supplied `sourceAsOf` synchronization/extraction timestamp, metric type/unit, and semantics. Event dates never imply source synchronization freshness.

Alternatives: Arbitrary expression language; one mutually exclusive operation; database-specific report payloads.

Consequences: The fixed pipeline remains inspectable and testable. New analytical forms require explicit contract and validation changes. A null value has defined meaning for unavailable ratios or snapshots.
