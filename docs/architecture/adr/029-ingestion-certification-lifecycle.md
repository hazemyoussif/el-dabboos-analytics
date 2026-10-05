# ADR 029 — Immutable candidate reconciliation and resumable extraction

Status: accepted by user on 5 October 2026; implementation verification recorded in the pilot handoff. Supersedes ADR 027's pre-ingestion approval requirement and single-write extraction boundary only.

## Decision

A persisted mapping release is immutable from registration, including its source rules, dataset identity, owner, currency and capabilities. `pending` is the existing wire value for an immutable candidate. Draft objects are not registered releases and cannot enter the writer. Deterministic fact validation accepts candidate mappings; persistence requires the exact registered release. Certification metadata is separate from the immutable specification. A trusted migrator operation can approve only after explicitly selected passing reconciliation cases reference that exact dataset/version and completed extraction evidence. Approval updates status, reference, time and evidence IDs only. Changed contents require a new dataset release and new reconciliation. Serving bindings require approval and passing evidence, enforced in SQL as well as runtime composition. No pilot binding is authorized.

The logical extraction extends existing ingestion batches: `extraction_runs` owns immutable source/company/mapping/object/period/freeze bounds; `ingestion_batches` remain page writes of at most 1,000 source records and 10,000 facts. Each page atomically writes revisions, batch links and its durable cursor/page counters. Retrying the same page uses the existing fingerprint. Pages must be contiguous and cursor-linked; a failure rolls back both facts and checkpoint. Completion occurs only with the terminal page, including an empty terminal page. Completed runs cannot be appended or mutated. A failed process resumes the persisted checkpoint using the same immutable source freeze; if the source cannot reproduce that freeze it must abandon the run and start another, never claim snapshot continuity from a write-date bound alone.

Reconciliation resolves and verifies every page of a completed logical extraction; a partial page list or incomplete run is refused. Completion includes source and company scope, mapping release, business period, objects, source-as-of and freeze, initial/final cursor, page/row counts and completion time. Legacy complete single-write batches remain valid extraction evidence. Watermarks describe completed extractions; page cursors describe durable resume progress.

Serving reconstructs the highest revision linked to a completed extraction. It must not use a partial run's fact head, or hide the last completed revision while a correction run is incomplete. Replayed revisions can qualify through their new completed batch link. Forced tenant RLS, explicit predicates, separate credentials and immutable revision/reconciliation history remain mandatory.

## Boundaries and consequences

Certification requires explicitly selected passing evidence for every mapped input measure, so an order-only pass cannot approve the combined invoice comparison release. Derived ratios and distinct counts use those certified inputs and tested catalog recipes. This coverage check belongs to mapping approval metadata and does not change immutable contents.

Domain owns source-independent extraction contracts and validation. Data owns transactions, SQL lifecycle enforcement and read-only source transports. No generic ETL framework, new browser/API source endpoint or DashboardSpec source selector is introduced. Migration files 001–005 are preserved; lifecycle schema is appended. Ingestor cannot register or approve mappings or bind serving. Runtime cannot access candidate facts or incomplete pages. Reconciliation passing a candidate is evidence, not an inferred authoritative-report approval.

This ADR does not authorize multiple simultaneous serving releases. The combined comparison extension below preserves one active binding per tenant. Odoo source snapshot certification, tenant configuration and authoritative Invoice Analysis evidence remain operational prerequisites for the live pilot.

## Approved comparison release extension

The user additionally approved a narrowly defined combined order/invoice comparison release on 5 October 2026. This supersedes ADR 027's separate-business-basis-release restriction for this pilot only. Each measure keeps its own source object, eligible state, business date, tax/sign basis and certification. One immutable comparison release can contain both order and invoice inputs without equating their totals or combining their semantics. One serving binding per tenant and unchanged query contracts remain. Legacy demo Revenue and Average Order Value semantics remain unchanged; the pilot uses explicit transaction metrics and trusted preferred metric metadata.

## Transaction metric recipes

The approved pilot defines Order Revenue from confirmed order totals, Net Invoiced Revenue from signed untaxed posted invoices/refunds, positive Invoiced Revenue and Refund Value, their separate counts, cancellation count and basis-specific averages. Existing generic revenue/AOV recipes retain their demo meaning. Customers Served uses a named distinct-count recipe over eligible order customers, after tenant/policy/date filtering; repeat orders do not add customers. Unknown outlet identities do not constitute an identifiable served customer. Distinct counts cannot use additive overrides, running totals or percentage composition. No arbitrary formulas or source conditions enter query contracts.
