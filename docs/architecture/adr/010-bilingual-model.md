# ADR-010: Bilingual semantic model

Status: Accepted

Context: English, Modern Standard Arabic, Iraqi Arabic, Egyptian Arabic, and mixed prompts must resolve to the same business meaning.

Decision: IDs are language-independent; labels and descriptions support English and Modern Standard Arabic, while dialect synonym metadata supports Iraqi and Egyptian phrases. Presentation locale is separate from identifiers.

Alternatives: Duplicate metric IDs or separate English/Arabic catalogs.

Consequences: Synonym coverage and RTL rendering need dedicated evaluations.
