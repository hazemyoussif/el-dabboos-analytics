# Terminology

| Term | Meaning |
| --- | --- |
| Tenant / market | Tenant is security and source scope; market controls approved IQ/EG profile conventions. They are not interchangeable with identity. |
| Semantic metric | Provider-independent business calculation over canonical measures. |
| Canonical measure | Source-adapter fact input; ratios are derived from their inputs, not stored as independent summable facts. |
| Available / planned metric | Executable approved definition / discoverable future concept that cannot execute. |
| DashboardSpec v2 | Validated portable dashboard intent: titles, series, grouping, bounded analyses, filters and canonical layout. |
| DashboardPatch v2 | Bounded validated edit operations applied atomically to a working spec. |
| Working draft | Unsaved spec and UI editing history; semantic preview does not imply persistence. |
| DashboardRecord | Tenant/owner/scope/version/timestamps wrapper around a saved spec. |
| DashboardFolder / preference | Flat personal tenant/user organization; separate from the record and spec. |
| Selection anchor | First series owns top N if requested; other series align only to its selected keys. |
| Partial / error / empty | Some series failed / all relevant series failed / successful result has no qualifying values. These are distinct states. |
| dataThrough | Latest relevant business/event date represented by authorized source measures. Not synchronization time. |
| sourceAsOf | Known synchronization/extraction freshness timestamp, only populated when provided. |
| Locale / theme | UI language and presentation preference; changing them does not save or dirty spec. |
| Configured model endpoint | Optional OpenAI-compatible service behind LLMProvider; deployment location is not a domain concept. |
| Demo identity | Test header-based identity directory and membership; not production login. |

Ordinary Arabic labels use Modern Standard Arabic. Conversational planner examples follow selected IQ/EG market. Currency is controlled by tenant profile; no implicit FX conversion exists.
