# ADR-002: Governed semantic model and metric aggregation

Status: Accepted (amended September 2026)

Context: Source columns and business wording vary across customers and languages. The initial catalog marked ratios and balances with ordinary aggregations, which made grouped results mathematically incorrect.

Decision: Stable, language-independent metric IDs have explicit source-independent semantics: additive, ratio, snapshot, comparison-derived, or duration-derived. Ratio and duration recipes name canonical source measures and divide their aggregates. A comparison-derived metric names its base metric. Snapshot measures carry an entity identity and use the latest observation on or before an as-of date. Derived IDs never appear as source facts.

Alternatives: Persist every metric as a separate aggregatable fact; encode source-specific SQL in the catalog; average displayed ratios.

Consequences: Adapters must normalize their source into the canonical measure IDs and stable snapshot entity IDs. Ratios return null for a zero denominator, and snapshots return null if no prior observation exists. Business formulas still need approval before production use.
