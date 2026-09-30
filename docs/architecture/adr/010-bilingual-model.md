# ADR-010: Bilingual semantic model

Status: Accepted

Context: English, Modern Standard Arabic, Egyptian Arabic, and mixed prompts must resolve to the same business meaning.

Decision: IDs are language-independent; labels, descriptions, and synonyms support both languages. Presentation locale is separate from identifiers.

Alternatives: Duplicate metric IDs or separate English/Arabic catalogs.

Consequences: Synonym coverage and RTL rendering need dedicated evaluations.
