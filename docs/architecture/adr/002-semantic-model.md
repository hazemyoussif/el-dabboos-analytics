# ADR-002: Governed semantic model

Status: Accepted

Context: Source columns and business wording vary across customers and languages.

Decision: Stable metric and dimension IDs with localized labels, synonyms, supported operations, and compatibility rules are the public vocabulary.

Alternatives: Expose physical columns or infer meanings ad hoc.

Consequences: Catalog curation is required; unsupported requests fail explicitly.
